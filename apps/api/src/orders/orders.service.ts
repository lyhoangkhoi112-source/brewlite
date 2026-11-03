import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateOrderDto,
  CreateOrderItemDto,
} from './dto/create-order.dto.js';

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
    const requestItems = getRequestItems(input);
    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const productIds = [...new Set(requestItems.map((item) => item.productId))];
    const products = await Promise.all(
      productIds.map((productId) =>
        this.prisma.product.findUnique({ where: { id: productId } }),
      ),
    );
    const productsById = new Map(
      productIds.map((productId, index) => [productId, products[index]]),
    );
    const requestedQuantities = new Map<string, number>();
    for (const item of requestItems) {
      requestedQuantities.set(
        item.productId,
        (requestedQuantities.get(item.productId) ?? 0) + item.quantity,
      );
    }

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

    return this.prisma.order.create({
      data: {
        orderCode: `BL-${randomUUID()}`,
        userId: user.id,
        note: input.note?.trim() || null,
        subtotal,
        totalAmount: subtotal,
        orderItems: {
          create: orderItems,
        },
      },
      include: { orderItems: true },
    });
  }
}
