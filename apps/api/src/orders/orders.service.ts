import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';

function matchesRequest(
  order: {
    userId: string;
    orderItems: Array<{ productId: string; quantity: number }>;
  },
  input: CreateOrderDto,
): boolean {
  return (
    order.userId === input.userId &&
    order.orderItems.length === 1 &&
    order.orderItems[0].productId === input.productId &&
    order.orderItems[0].quantity === input.quantity
  );
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(input: CreateOrderDto) {
    const existingOrder = await this.prisma.order.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      include: { orderItems: true },
    });

    if (existingOrder) {
      if (!matchesRequest(existingOrder, input)) {
        throw new ConflictException('Đã có đơn hàng đặt trước đó');
      }

      return existingOrder;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: input.productId },
    });
    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }
    if (
      product.status !== ProductStatus.AVAILABLE ||
      product.stockQuantity < input.quantity
    ) {
      throw new UnprocessableEntityException('Sản phẩm hiện không đủ số lượng đặt');
    }

    const subtotal = product.basePrice.mul(input.quantity);

    try {
      return await this.prisma.order.create({
        data: {
          orderCode: `BL-${randomUUID()}`,
          idempotencyKey: input.idempotencyKey,
          userId: user.id,
          subtotal,
          totalAmount: subtotal,
          orderItems: {
            create: {
              productId: product.id,
              productName: product.name,
              quantity: input.quantity,
              unitPrice: product.basePrice,
              subtotal,
            },
          },
        },
        include: { orderItems: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const duplicateOrder = await this.prisma.order.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
          include: { orderItems: true },
        });
        if (duplicateOrder) {
          if (!matchesRequest(duplicateOrder, input)) {
            throw new ConflictException(
              'Idempotency key đã được dùng cho đơn hàng khác',
            );
          }
          return duplicateOrder;
        }

        throw new ConflictException('Mã đơn hàng đã được sử dụng');
      }

      throw error;
    }
  }
}