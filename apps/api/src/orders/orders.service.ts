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
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateOrderDto, CreateOrderItemDto } from './dto/create-order.dto.js';
import { MockPaymentDto } from './dto/mock-payment.dto.js';
import { RetryMockPaymentDto } from './dto/retry-mock-payment.dto.js';

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
    const redeemPoints = input.redeemPoints ?? 0;
    if (!authenticatedUserId && redeemPoints > 0) {
      throw new ForbiddenException('Đăng nhập để sử dụng điểm khách hàng');
    }
    if (input.paymentMethod && process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Mock payments are disabled in production');
    }

    const requestItems = getRequestItems(input);
    let userId: string | null = null;
    if (authenticatedUserId) {
      const user = await this.prisma.user.findUnique({
        where: { id: authenticatedUserId },
        select: { id: true, status: true },
      });
      if (!user) {
        throw new NotFoundException('Không tìm thấy người dùng');
      }
      if (user.status !== UserStatus.ACTIVE) {
        throw new ForbiddenException('Tài khoản không còn hoạt động');
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

      const maxRedeemPoints = Math.floor(
        subtotal.mul(20).div(100).div(3_000).toNumber(),
      );
      if (redeemPoints > maxRedeemPoints) {
        throw new BadRequestException(
          `Đơn hàng chỉ được đổi tối đa ${maxRedeemPoints} điểm`,
        );
      }

      const discountAmount = new Prisma.Decimal(redeemPoints * 3_000);
      let loyaltyBalanceAfterRedemption: number | null = null;
      if (redeemPoints > 0 && userId) {
        const reservedPoints = await transaction.user.updateMany({
          where: { id: userId, loyaltyPoints: { gte: redeemPoints } },
          data: { loyaltyPoints: { decrement: redeemPoints } },
        });
        if (reservedPoints.count !== 1) {
          throw new ConflictException(
            'Số dư điểm không đủ, vui lòng tải lại điểm khách hàng',
          );
        }
        const user = await transaction.user.findUnique({
          where: { id: userId },
          select: { loyaltyPoints: true },
        });
        if (!user) {
          throw new NotFoundException('Không tìm thấy người dùng');
        }
        loyaltyBalanceAfterRedemption = user.loyaltyPoints;
      }

      const createdOrder = await transaction.order.create({
        data: {
          orderCode: `BL-${randomUUID()}`,
          guestAccessTokenHash,
          userId,
          shippingAddress,
          contactPhone,
          note: input.note?.trim() || null,
          subtotal,
          discountAmount,
          totalAmount: subtotal.sub(discountAmount),
          orderItems: {
            create: orderItems,
          },
          ...(process.env.NODE_ENV !== 'production'
            ? {
                payments: {
                  create: {
                    idempotencyKey: randomUUID(),
                    amount: subtotal.sub(discountAmount),
                    method: input.paymentMethod ?? PaymentMethod.MOMO,
                  },
                },
              }
            : {}),
        },
        select: this.orderConfirmationSelect(),
      });
      if (redeemPoints > 0 && userId && loyaltyBalanceAfterRedemption !== null) {
        await transaction.loyaltyTransaction.create({
          data: {
            userId,
            orderId: createdOrder.id,
            type: 'REDEEM',
            points: redeemPoints,
            balanceAfter: loyaltyBalanceAfterRedemption,
            description: `Đổi điểm cho đơn ${createdOrder.orderCode}`,
          },
        });
      }
      return createdOrder;
    });

    return guestAccessToken ? { ...order, guestAccessToken } : order;
  }

  async simulateMockPayment(
    orderId: string,
    paymentId: string,
    input: MockPaymentDto,
    userId: string | undefined,
    paymentIdAccess = false,
  ) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Mock payments are disabled in production');
    }

    const access = paymentIdAccess
      ? {}
      : userId
        ? { userId }
        : input.guestAccessToken
          ? {
              guestAccessTokenHash: this.hashGuestToken(
                input.guestAccessToken,
              ),
            }
          : null;
    if (!paymentIdAccess && !access) {
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
        if (input.outcome === 'CANCELLED') {
          await this.reverseOrderLoyaltyPoints(
            transaction,
            order.id,
            order.userId,
            order.orderCode,
          );
        }
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

  async getMockPaymentDetails(paymentId: string) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Mock payments are disabled in production');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        amount: true,
        method: true,
        status: true,
        order: {
          select: {
            orderCode: true,
            status: true,
          },
        },
      },
    });
    if (!payment) {
      throw new NotFoundException('Không tìm thấy giao dịch thanh toán');
    }

    return {
      paymentId: payment.id,
      amount: payment.amount,
      method: payment.method,
      paymentStatus: payment.status,
      orderCode: payment.order.orderCode,
      orderStatus: payment.order.status,
    };
  }

  async simulateMockPaymentFromLink(
    paymentId: string,
    input: MockPaymentDto,
  ) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Mock payments are disabled in production');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: { orderId: true },
    });
    if (!payment) {
      throw new NotFoundException('Không tìm thấy giao dịch thanh toán');
    }

    return this.simulateMockPayment(
      payment.orderId,
      paymentId,
      input,
      undefined,
      true,
    );
  }

  async retryMockPayment(
    orderId: string,
    input: RetryMockPaymentDto,
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
          status: true,
          totalAmount: true,
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { status: true, failureReason: true },
          },
          orderItems: {
            select: { productId: true, quantity: true },
          },
        },
      });
      if (!order) {
        throw new NotFoundException('Không tìm thấy đơn hàng');
      }
      const isRetryableCancelledPayment =
        order.status === OrderStatus.CANCELLED &&
        order.payments[0]?.status === PaymentStatus.CANCELLED &&
        order.payments[0].failureReason === 'Mock payment cancelled';
      if (
        order.status !== OrderStatus.PAYMENT_FAILED &&
        !isRetryableCancelledPayment
      ) {
        throw new ConflictException(
          'Chỉ có thể thanh toán lại đơn hàng thất bại hoặc giao dịch đã hủy',
        );
      }

      const quantities = new Map<string, number>();
      for (const item of order.orderItems) {
        quantities.set(
          item.productId,
          (quantities.get(item.productId) ?? 0) + item.quantity,
        );
      }

      for (const [productId, quantity] of quantities) {
        const reserved = await transaction.product.updateMany({
          where: {
            id: productId,
            status: ProductStatus.AVAILABLE,
            stockQuantity: { gte: quantity },
          },
          data: { stockQuantity: { decrement: quantity } },
        });
        if (reserved.count !== 1) {
          throw new UnprocessableEntityException(
            'Sản phẩm trong đơn hiện không đủ số lượng để thanh toán lại',
          );
        }

        await transaction.product.updateMany({
          where: {
            id: productId,
            status: ProductStatus.AVAILABLE,
            stockQuantity: 0,
          },
          data: { status: ProductStatus.OUT_OF_STOCK },
        });
      }

      const reopened = await transaction.order.updateMany({
        where: {
          id: orderId,
          status: order.status,
          ...access,
        },
        data: { status: OrderStatus.PENDING },
      });
      if (reopened.count !== 1) {
        throw new ConflictException('Đơn hàng đã được xử lý');
      }

      await transaction.payment.create({
        data: {
          orderId,
          idempotencyKey: randomUUID(),
          amount: order.totalAmount,
          method: input.paymentMethod ?? PaymentMethod.MOMO,
        },
      });

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
    const orders = await this.prisma.order.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: this.orderHistoryWithPaymentRetrySelect(),
    });
    return orders.map(({ payments, ...order }) => ({
      ...order,
      canRetryPayment: this.hasCancelledMockPayment(order.status, payments),
    }));
  }

  async getStaffOrders() {
    return this.prisma.order.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: this.staffOrderSelect(),
    });
  }

  async searchStaffOrder(orderIdentifier?: string) {
    if (typeof orderIdentifier !== 'string') {
      throw new BadRequestException('Vui lòng nhập mã đơn hàng');
    }
    const normalizedIdentifier = orderIdentifier.trim();
    if (!normalizedIdentifier) {
      throw new BadRequestException('Vui lòng nhập mã đơn hàng');
    }

    const order = await this.prisma.order.findFirst({
      where: {
        OR: [
          {
            orderCode: {
              equals: normalizedIdentifier,
              mode: 'insensitive',
            },
          },
          { id: normalizedIdentifier },
        ],
      },
      select: {
        ...this.staffOrderSelect(),
        deletedAt: true,
      },
    });
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng theo mã đã nhập');
    }
    return order;
  }

  async softDeleteStaffOrder(orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        deletedAt: null,
        status: {
          in: [OrderStatus.READY, OrderStatus.COMPLETED, OrderStatus.CANCELLED],
        },
      },
      select: { id: true },
    });
    if (!order) {
      throw new ConflictException(
        'Chỉ có thể xóa mềm đơn sẵn sàng, đã hoàn tất hoặc đã hủy',
      );
    }

    const result = await this.prisma.order.updateMany({
      where: {
        id: orderId,
        deletedAt: null,
        status: {
          in: [OrderStatus.READY, OrderStatus.COMPLETED, OrderStatus.CANCELLED],
        },
      },
      data: { deletedAt: new Date() },
    });
    if (result.count !== 1) {
      throw new ConflictException('Đơn hàng đã được xử lý');
    }

    return { id: orderId, deletedAt: true };
  }

  private staffOrderSelect() {
    return {
      id: true,
      orderCode: true,
      status: true,
      rejectionReason: true,
      note: true,
      totalAmount: true,
      createdAt: true,
      user: { select: { fullName: true } },
      orderItems: {
        select: {
          productName: true,
          quantity: true,
          selectedSize: true,
        },
      },
      payments: {
        where: { status: PaymentStatus.PENDING },
        select: { id: true },
      },
    } satisfies Prisma.OrderSelect;
  }

  async updateStaffOrderStatus(
    orderId: string,
    status: 'CONFIRMED' | 'PREPARING' | 'READY',
  ) {
    const currentStatus = {
      [OrderStatus.CONFIRMED]: OrderStatus.PENDING,
      [OrderStatus.PREPARING]: OrderStatus.CONFIRMED,
      [OrderStatus.READY]: OrderStatus.PREPARING,
    }[status];

    return this.prisma.$transaction(async (transaction) => {
      const currentOrder = await transaction.order.findFirst({
        where: { id: orderId, status: currentStatus },
        select: {
          id: true,
          payments: {
            where: { status: PaymentStatus.PENDING },
            select: { id: true },
          },
        },
      });
      if (!currentOrder) {
        throw new ConflictException(
          'Không thể cập nhật đơn hàng vì đơn chưa ở trạng thái phù hợp',
        );
      }
      if (status === OrderStatus.CONFIRMED && currentOrder.payments.length > 0) {
        throw new ConflictException(
          'Đơn hàng chưa hoàn tất thanh toán nên chưa thể nhận',
        );
      }

      const updated = await transaction.order.updateMany({
        where: { id: orderId, status: currentStatus },
        data: { status },
      });
      if (updated.count !== 1) {
        throw new ConflictException('Đơn hàng đã được xử lý');
      }

      return transaction.order.findUniqueOrThrow({
        where: { id: orderId },
        select: this.orderHistorySelect(),
      });
    });
  }

  async rejectStaffOrder(orderId: string, reason: string) {
    const rejectionReason = reason.trim();
    if (!rejectionReason) {
      throw new BadRequestException('Vui lòng nhập lý do từ chối đơn hàng');
    }

    return this.prisma.$transaction(async (transaction) => {
      const order = await transaction.order.findFirst({
        where: { id: orderId, status: OrderStatus.PENDING },
        select: {
          id: true,
          userId: true,
          orderCode: true,
          orderItems: { select: { productId: true, quantity: true } },
        },
      });
      if (!order) {
        throw new ConflictException(
          'Chỉ có thể từ chối đơn hàng đang chờ xác nhận',
        );
      }

      const updated = await transaction.order.updateMany({
        where: { id: orderId, status: OrderStatus.PENDING },
        data: {
          status: OrderStatus.CANCELLED,
          rejectionReason,
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException('Đơn hàng đã được xử lý');
      }

      await transaction.payment.updateMany({
        where: { orderId, status: PaymentStatus.PENDING },
        data: {
          status: PaymentStatus.CANCELLED,
          failureReason: rejectionReason,
        },
      });
      await this.reverseOrderLoyaltyPoints(
        transaction,
        order.id,
        order.userId,
        order.orderCode,
      );
      await this.restoreOrderStock(transaction, order.orderItems);

      return transaction.order.findUniqueOrThrow({
        where: { id: orderId },
        select: this.orderHistorySelect(),
      });
    });
  }

  async cancelStaffOrder(orderId: string, reason?: string) {
    const cancellationReason = reason?.trim() || null;

    return this.prisma.$transaction(async (transaction) => {
      const order = await transaction.order.findFirst({
        where: {
          id: orderId,
          status: { in: [OrderStatus.PENDING, OrderStatus.CONFIRMED] },
        },
        select: {
          id: true,
          status: true,
          userId: true,
          orderCode: true,
          orderItems: { select: { productId: true, quantity: true } },
        },
      });
      if (!order) {
        throw new ConflictException(
          'Chỉ có thể hủy đơn hàng trước khi bắt đầu pha chế',
        );
      }

      const updated = await transaction.order.updateMany({
        where: {
          id: orderId,
          status: { in: [OrderStatus.PENDING, OrderStatus.CONFIRMED] },
        },
        data: {
          status: OrderStatus.CANCELLED,
          rejectionReason: cancellationReason,
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException('Đơn hàng đã được xử lý');
      }

      await transaction.payment.updateMany({
        where: { orderId, status: PaymentStatus.PENDING },
        data: {
          status: PaymentStatus.CANCELLED,
          failureReason: cancellationReason ?? 'Đơn hàng đã bị nhân viên hủy',
        },
      });
      await this.reverseOrderLoyaltyPoints(
        transaction,
        order.id,
        order.userId,
        order.orderCode,
      );
      await this.restoreOrderStock(transaction, order.orderItems);

      return transaction.order.findUniqueOrThrow({
        where: { id: orderId },
        select: this.orderHistorySelect(),
      });
    });
  }

  async getGuestOrders(accessTokens: string[]) {
    if (accessTokens.length === 0) return [];

    const orders = await this.prisma.order.findMany({
      where: {
        userId: null,
        deletedAt: null,
        guestAccessTokenHash: {
          in: accessTokens.map((token) => this.hashGuestToken(token)),
        },
      },
      orderBy: { createdAt: 'desc' },
      select: this.orderHistoryWithPaymentRetrySelect(),
    });
    return orders.map(({ payments, ...order }) => ({
      ...order,
      canRetryPayment: this.hasCancelledMockPayment(order.status, payments),
    }));
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
          userId: true,
          orderCode: true,
          orderItems: {
            select: { productId: true, quantity: true },
          },
        },
      });
      if (!order) {
        throw new NotFoundException('Không tìm thấy đơn hàng');
      }
      if (
        order.status !== OrderStatus.PENDING &&
        order.status !== OrderStatus.CONFIRMED
      ) {
        throw new ConflictException(
          'Chỉ có thể hủy đơn hàng trước khi bắt đầu pha chế',
        );
      }

      const claimed = await transaction.order.updateMany({
        where: {
          id: orderId,
          status: { in: [OrderStatus.PENDING, OrderStatus.CONFIRMED] },
          ...access,
        },
        data: { status: OrderStatus.CANCELLED },
      });
      if (claimed.count !== 1) {
        throw new ConflictException('Đơn hàng đã được xử lý');
      }

      await transaction.payment.updateMany({
        where: { orderId, status: PaymentStatus.PENDING },
        data: {
          status: PaymentStatus.CANCELLED,
          failureReason: 'Đơn hàng đã được khách hàng hủy',
        },
      });
      await this.reverseOrderLoyaltyPoints(
        transaction,
        order.id,
        order.userId,
        order.orderCode,
      );
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

  private async reverseOrderLoyaltyPoints(
    transaction: Prisma.TransactionClient,
    orderId: string,
    userId: string | null,
    orderCode: string,
  ) {
    if (!userId) return;

    const pointTransactions = await transaction.loyaltyTransaction.findMany({
      where: { orderId, type: { in: ['EARN', 'REDEEM'] } },
      select: { type: true, points: true },
    });
    if (pointTransactions.length === 0) return;

    const currentUser = await transaction.user.findUnique({
      where: { id: userId },
      select: { loyaltyPoints: true },
    });
    if (!currentUser) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    let balance = currentUser.loyaltyPoints;
    for (const type of ['REDEEM', 'EARN'] as const) {
      for (const pointTransaction of pointTransactions) {
        if (pointTransaction.type !== type) continue;
        const points =
          type === 'REDEEM'
            ? pointTransaction.points
            : Math.min(pointTransaction.points, balance);
        if (points <= 0) continue;

        const adjustment = type === 'REDEEM' ? points : -points;
        const user = await transaction.user.update({
          where: { id: userId },
          data: {
            loyaltyPoints:
              adjustment > 0
                ? { increment: adjustment }
                : { decrement: -adjustment },
          },
          select: { loyaltyPoints: true },
        });
        balance = user.loyaltyPoints;
        await transaction.loyaltyTransaction.create({
          data: {
            userId,
            orderId,
            type: 'ADJUST',
            points: adjustment,
            balanceAfter: balance,
            description:
              adjustment > 0
                ? `Hoàn điểm từ đơn đã hủy ${orderCode}`
                : `Thu hồi điểm từ đơn đã hủy ${orderCode}`,
          },
        });
      }
    }
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
      rejectionReason: true,
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
      rejectionReason: true,
      createdAt: true,
      orderItems: {
        include: { product: { select: { category: true } } },
      },
    } satisfies Prisma.OrderSelect;
  }

  private orderHistoryWithPaymentRetrySelect() {
    return {
      ...this.orderHistorySelect(),
      payments: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { status: true, failureReason: true },
      },
    } satisfies Prisma.OrderSelect;
  }

  private hasCancelledMockPayment(
    orderStatus: OrderStatus,
    payments: Array<{ status: PaymentStatus; failureReason: string | null }>,
  ) {
    return (
      orderStatus === OrderStatus.CANCELLED &&
      payments[0]?.status === PaymentStatus.CANCELLED &&
      payments[0].failureReason === 'Mock payment cancelled'
    );
  }
}
