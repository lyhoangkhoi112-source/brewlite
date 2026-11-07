import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  ProductStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateOrderDto, CreateOrderItemDto } from './dto/create-order.dto.js';
import { MockPaymentDto } from './dto/mock-payment.dto.js';

type OrderRequestItem = Pick<
  CreateOrderItemDto,
  | 'productId'
  | 'quantity'
  | 'selectedSize'
  | 'sugarLevel'
  | 'iceLevel'
  | 'selectedToppings'
>;

function getRequestItems(input: CreateOrderDto): OrderRequestItem[] {
  if (
    input.items !== undefined && //Nếu có item (nghĩa là khác undefined) thì hàm sẽ trả về items.
    input.productId === undefined &&
    input.quantity === undefined
  ) {
    return input.items;
  }

  if (
    input.items === undefined && //Nếu không có item thì hàm trả về một mảng chứa một đối tượng với productId và quantity từ input.
    input.productId !== undefined &&
    input.quantity !== undefined
  ) {
    return [{ productId: input.productId, quantity: input.quantity }];
  }

  throw new BadRequestException(
    'Provide either items or productId and quantity',
  );
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(input: CreateOrderDto) {
    return this.createOrderForUser(input, undefined);
  }

  async createOrderForUser(
    input: CreateOrderDto,
    authenticatedUserId?: string,
  ) {
    if (input.paymentMethod && process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Mock payments are disabled in production');
    }

    const requestItems = getRequestItems(input);
    let userId: string | null = null;
    if (authenticatedUserId) {
      const user = await this.prisma.user.findUnique({
        where: { id: authenticatedUserId },
        select: { id: true },
      });
      if (!user) {
        throw new NotFoundException('Không tìm thấy người dùng');
      }
      userId = user.id;
    }

    const shippingAddress = input.shippingAddress.trim();
    const contactPhone = input.contactPhone.trim();
    if (!shippingAddress || !contactPhone) {
      throw new BadRequestException(
        'Vui lòng cung cấp địa chỉ giao hàng và số điện thoại',
      );
    }

    const requestedQuantities = new Map<string, number>();
    for (const item of requestItems) {
      requestedQuantities.set(
        item.productId,
        (requestedQuantities.get(item.productId) ?? 0) + item.quantity,
      );
    }

    const guestAccessToken = userId ? null : randomBytes(32).toString('hex');
    const guestAccessTokenHash = guestAccessToken
      ? this.hashGuestToken(guestAccessToken)
      : null;

    const order = await this.prisma.$transaction(async (transaction) => {
      const productIds = [...requestedQuantities.keys()];
      const products = await Promise.all(
        productIds.map((productId) =>
          transaction.product.findUnique({ where: { id: productId } }),
        ),
      );
      const productsById = new Map(
        productIds.map((productId, index) => [productId, products[index]]),
      );

      for (const [productId, quantity] of requestedQuantities) {
        const product = productsById.get(productId);
        if (!product) {
          throw new NotFoundException('Không tìm thấy sản phẩm');
        }
        if (
          product.status !== ProductStatus.AVAILABLE ||
          product.stockQuantity < quantity
        ) {
          throw new UnprocessableEntityException(
            'Sản phẩm hiện không đủ số lượng đặt',
          );
        }
      }

      for (const [productId, quantity] of requestedQuantities) {
        const result = await transaction.product.updateMany({
          where: {
            id: productId,
            status: ProductStatus.AVAILABLE,
            stockQuantity: { gte: quantity },
          },
          data: {
            stockQuantity: { decrement: quantity },
            ...(quantity === productsById.get(productId)?.stockQuantity
              ? { status: ProductStatus.OUT_OF_STOCK }
              : {}),
          },
        });
        if (result.count !== 1) {
          throw new UnprocessableEntityException(
            'Sản phẩm hiện không đủ số lượng đặt',
          );
        }
      }

      const orderItems = requestItems.map((item) => {
        const product = productsById.get(item.productId);
        if (!product) {
          throw new NotFoundException('Không tìm thấy sản phẩm');
        }

        const itemSubtotal = product.basePrice.mul(item.quantity);
        return {
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          unitPrice: product.basePrice,
          selectedSize: item.selectedSize ?? 'M',
          sugarLevel: item.sugarLevel ?? '100%',
          iceLevel: item.iceLevel ?? '100%',
          selectedToppings: JSON.stringify(item.selectedToppings ?? []),
          subtotal: itemSubtotal,
        };
      });
      const subtotal = orderItems.reduce(
        (total, item) => total.add(item.subtotal),
        new Prisma.Decimal(0),
      );

      return transaction.order.create({
        data: {
          orderCode: `BL-${randomUUID()}`,
          guestAccessTokenHash,
          userId,
          shippingAddress,
          contactPhone,
          note: input.note?.trim() || null,
          subtotal,
          totalAmount: subtotal,
          orderItems: {
            create: orderItems,
          },
          ...(process.env.NODE_ENV !== 'production'
            ? {
                payments: {
                  create: {
                    idempotencyKey: randomUUID(),
                    amount: subtotal,
                    method: input.paymentMethod ?? PaymentMethod.MOMO,
                  },
                },
              }
            : {}),
        },
        select: this.orderConfirmationSelect(),
      });
    });

    return guestAccessToken ? { ...order, guestAccessToken } : order;
  }

  async simulateMockPayment(
    orderId: string,
    paymentId: string,
    input: MockPaymentDto,
    userId: string | undefined,
  ) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Mock payments are disabled in production');
    }

    const access = userId
      ? { userId }
      : input.guestAccessToken
        ? {
            guestAccessTokenHash: this.hashGuestToken(input.guestAccessToken),
          }
        : null;
    if (!access) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    return this.prisma.$transaction(async (transaction) => {
      const order = await transaction.order.findFirst({
        where: { id: orderId, ...access },
        select: {
          id: true,
          orderCode: true,
          userId: true,
          status: true,
          totalAmount: true,
          orderItems: {
            select: { productId: true, quantity: true },
          },
        },
      });
      if (!order) {
        throw new NotFoundException('Không tìm thấy đơn hàng');
      }
      if (order.status !== OrderStatus.PENDING) {
        throw new ConflictException('Đơn hàng đã được xử lý');
      }

      const paymentStatus = {
        SUCCESS: PaymentStatus.SUCCESS,
        FAILED: PaymentStatus.FAILED,
        CANCELLED: PaymentStatus.CANCELLED,
      }[input.outcome];
      const orderStatus = {
        SUCCESS: OrderStatus.CONFIRMED,
        FAILED: OrderStatus.PAYMENT_FAILED,
        CANCELLED: OrderStatus.CANCELLED,
      }[input.outcome];
      const paymentUpdate = await transaction.payment.updateMany({
        where: {
          id: paymentId,
          orderId,
          status: PaymentStatus.PENDING,
          method: {
            in: [
              PaymentMethod.MOMO,
              PaymentMethod.VNPAY,
              PaymentMethod.SHOPEEPAY,
            ],
          },
        },
        data: {
          ...(input.paymentMethod ? { method: input.paymentMethod } : {}),
          status: paymentStatus,
          transactionId:
            input.outcome === 'SUCCESS' ? `MOCK-${randomUUID()}` : null,
          failureReason:
            input.outcome === 'FAILED'
              ? 'Mock payment failed'
              : input.outcome === 'CANCELLED'
                ? 'Mock payment cancelled'
                : null,
          paidAt: input.outcome === 'SUCCESS' ? new Date() : null,
        },
      });
      if (paymentUpdate.count !== 1) {
        throw new ConflictException('Giao dịch đã được xử lý');
      }

      const orderUpdate = await transaction.order.updateMany({
        where: { id: orderId, status: OrderStatus.PENDING, ...access },
        data: { status: orderStatus },
      });
      if (orderUpdate.count !== 1) {
        throw new ConflictException('Đơn hàng đã được xử lý');
      }

      if (input.outcome !== 'SUCCESS') {
        await this.restoreOrderStock(transaction, order.orderItems);
      } else if (order.userId) {
        const points = order.totalAmount.div(10_000).floor().toNumber();
        if (points > 0) {
          const user = await transaction.user.update({
            where: { id: order.userId },
            data: { loyaltyPoints: { increment: points } },
            select: { loyaltyPoints: true },
          });
          await transaction.loyaltyTransaction.create({
            data: {
              userId: order.userId,
              orderId: order.id,
              type: 'EARN',
              points,
              balanceAfter: user.loyaltyPoints,
              description: `Tích điểm từ đơn ${order.orderCode}`,
            },
          });
        }
      }

      return transaction.order.findUniqueOrThrow({
        where: { id: orderId },
        select: this.orderConfirmationSelect(),
      });
    });
  }

  async getLoyaltyForUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        loyaltyPoints: true,
        loyaltyTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 100,
          select: {
            id: true,
            type: true,
            points: true,
            balanceAfter: true,
            description: true,
            createdAt: true,
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }
    return {
      balance: user.loyaltyPoints,
      transactions: user.loyaltyTransactions,
    };
  }

  async getOrdersForUser(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: this.orderHistorySelect(),
    });
  }

  async getGuestOrders(accessTokens: string[]) {
    if (accessTokens.length === 0) return [];

    return this.prisma.order.findMany({
      where: {
        userId: null,
        guestAccessTokenHash: {
          in: accessTokens.map((token) => this.hashGuestToken(token)),
        },
      },
      orderBy: { createdAt: 'desc' },
      select: this.orderHistorySelect(),
    });
  }

  async cancelOrder(
    orderId: string,
    userId: string | undefined,
    guestAccessTokens: string[],
  ) {
    const access = userId
      ? { userId }
      : {
          guestAccessTokenHash: {
            in: guestAccessTokens.map((token) => this.hashGuestToken(token)),
          },
        };
    if (!userId && guestAccessTokens.length === 0) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    return this.prisma.$transaction(async (transaction) => {
      const order = await transaction.order.findFirst({
        where: { id: orderId, ...access },
        select: {
          id: true,
          status: true,
          orderItems: {
            select: { productId: true, quantity: true },
          },
        },
      });
      if (!order) {
        throw new NotFoundException('Không tìm thấy đơn hàng');
      }
      if (order.status !== OrderStatus.PENDING) {
        throw new ConflictException(
          'Chỉ có thể hủy đơn hàng đang chờ xác nhận',
        );
      }

      const claimed = await transaction.order.updateMany({
        where: { id: orderId, status: OrderStatus.PENDING, ...access },
        data: { status: OrderStatus.CANCELLED },
      });
      if (claimed.count !== 1) {
        throw new ConflictException('Đơn hàng đã được xử lý');
      }

      await this.restoreOrderStock(transaction, order.orderItems);

      return transaction.order.findUniqueOrThrow({
        where: { id: orderId },
        select: this.orderHistorySelect(),
      });
    });
  }

  private hashGuestToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async restoreOrderStock(
    transaction: Prisma.TransactionClient,
    items: Array<{ productId: string; quantity: number }>,
  ) {
    for (const item of items) {
      const restoredOutOfStock = await transaction.product.updateMany({
        where: {
          id: item.productId,
          status: ProductStatus.OUT_OF_STOCK,
        },
        data: {
          stockQuantity: { increment: item.quantity },
          status: ProductStatus.AVAILABLE,
        },
      });
      if (restoredOutOfStock.count === 0) {
        await transaction.product.updateMany({
          where: { id: item.productId },
          data: { stockQuantity: { increment: item.quantity } },
        });
      }
    }
  }

  private orderConfirmationSelect() {
    return {
      id: true,
      orderCode: true,
      userId: true,
      status: true,
      subtotal: true,
      discountAmount: true,
      totalAmount: true,
      shippingAddress: true,
      contactPhone: true,
      note: true,
      createdAt: true,
      updatedAt: true,
      orderItems: true,
      payments: {
        select: { id: true, amount: true, method: true, status: true },
      },
    } satisfies Prisma.OrderSelect;
  }

  private orderHistorySelect() {
    return {
      id: true,
      orderCode: true,
      status: true,
      subtotal: true,
      discountAmount: true,
      totalAmount: true,
      shippingAddress: true,
      contactPhone: true,
      note: true,
      createdAt: true,
      orderItems: {
        include: { product: { select: { category: true } } },
      },
    } satisfies Prisma.OrderSelect;
  }
}
