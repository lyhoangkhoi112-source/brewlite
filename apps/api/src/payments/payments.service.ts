import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  ProductStatus,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  getOrderConfirmationSelect,
  hashGuestAccessToken,
} from '../orders/order.utils.js';
import { MockPaymentDto } from './dto/mock-payment.dto.js';
import { RetryMockPaymentDto } from './dto/retry-mock-payment.dto.js';

type OrderStockItem = { productId: string; quantity: number };
type RetryPaymentStatus = {
  status: PaymentStatus;
  failureReason: string | null;
};

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  isMockPaymentsEnabled(): boolean {
    return (
      process.env.NODE_ENV !== 'production' ||
      process.env.MOCK_PAYMENTS_ENABLED === 'true'
    );
  }

  createPendingPaymentData(
    amount: Prisma.Decimal,
    method: PaymentMethod,
  ): Prisma.PaymentCreateWithoutOrderInput {
    return { idempotencyKey: randomUUID(), amount, method };
  }

  async simulateMockPayment(
    orderId: string,
    paymentId: string,
    input: MockPaymentDto,
    userId: string | undefined,
    paymentIdAccess = false,
  ) {
    this.ensureMockPaymentsEnabled();

    const access = paymentIdAccess
      ? {}
      : userId
        ? { userId }
        : input.guestAccessToken
          ? {
              guestAccessTokenHash: hashGuestAccessToken(
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
        select: getOrderConfirmationSelect(),
      });
    });
  }

  async getMockPaymentDetails(paymentId: string) {
    this.ensureMockPaymentsEnabled();

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

  async simulateMockPaymentFromLink(paymentId: string, input: MockPaymentDto) {
    this.ensureMockPaymentsEnabled();

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
    this.ensureMockPaymentsEnabled();

    const access = userId
      ? { userId }
      : input.guestAccessToken
        ? {
            guestAccessTokenHash: hashGuestAccessToken(input.guestAccessToken),
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
          ...this.createPendingPaymentData(
            order.totalAmount,
            input.paymentMethod ?? PaymentMethod.MOMO,
          ),
        },
      });

      return transaction.order.findUniqueOrThrow({
        where: { id: orderId },
        select: getOrderConfirmationSelect(),
      });
    });
  }

  async cancelPendingPayments(
    transaction: Prisma.TransactionClient,
    orderId: string,
    failureReason: string,
  ) {
    await transaction.payment.updateMany({
      where: { orderId, status: PaymentStatus.PENDING },
      data: { status: PaymentStatus.CANCELLED, failureReason },
    });
  }

  async reverseOrderLoyaltyPoints(
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

  async restoreOrderStock(
    transaction: Prisma.TransactionClient,
    items: OrderStockItem[],
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

  hasCancelledMockPayment(
    orderStatus: OrderStatus,
    payments: RetryPaymentStatus[],
  ) {
    return (
      orderStatus === OrderStatus.CANCELLED &&
      payments[0]?.status === PaymentStatus.CANCELLED &&
      payments[0].failureReason === 'Mock payment cancelled'
    );
  }

  private ensureMockPaymentsEnabled(): void {
    if (!this.isMockPaymentsEnabled()) {
      throw new ForbiddenException('Mock payments are disabled in production');
    }
  }
}
