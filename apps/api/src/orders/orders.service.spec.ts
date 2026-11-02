import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { OrdersService } from './orders.service.js';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: {
    user: { findUnique: ReturnType<typeof vi.fn> };
    product: { findUnique: ReturnType<typeof vi.fn> };
    order: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
  };

  const request: CreateOrderDto = {
    idempotencyKey: '9a1f1713-18d7-46ea-b9f0-04f765eadd7e',
    userId: '01234567-89ab-4cde-8f01-23456789abcd',
    productId: '11234567-89ab-4cde-8f01-23456789abcd',
    quantity: 2,
  };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: request.userId }) },
      product: {
        findUnique: vi.fn().mockResolvedValue({
          id: request.productId,
          name: 'Latte',
          basePrice: new Prisma.Decimal('25000'),
          stockQuantity: 10,
          status: ProductStatus.AVAILABLE,
        }),
      },
      order: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: 'order-id' }),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(OrdersService);
  });

  it('creates an order item using the product price from the database', async () => {
    await service.createOrder(request);

    const createData = prisma.order.create.mock.calls[0][0].data;
    expect(createData.userId).toBe(request.userId);
    expect(createData.subtotal.toString()).toBe('50000');
    expect(createData.totalAmount.toString()).toBe('50000');
    expect(createData.orderItems.create).toMatchObject({
      productId: request.productId,
      productName: 'Latte',
      quantity: 2,
      subtotal: new Prisma.Decimal('50000'),
    });
    expect(createData.orderItems.create.unitPrice.toString()).toBe('25000');
    expect(createData.idempotencyKey).toBe(request.idempotencyKey);
  });

  it('returns the original order when the same request is retried', async () => {
    const originalOrder = {
      id: 'existing-order',
      userId: request.userId,
      orderItems: [{ productId: request.productId, quantity: request.quantity }],
    };
    prisma.order.findUnique.mockResolvedValue(originalOrder);

    await expect(service.createOrder(request)).resolves.toBe(originalOrder);
    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  it('rejects reusing an idempotency key for a different request', async () => {
    prisma.order.findUnique.mockResolvedValue({
      userId: request.userId,
      orderItems: [{ productId: request.productId, quantity: 1 }],
    });

    await expect(service.createOrder(request)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
