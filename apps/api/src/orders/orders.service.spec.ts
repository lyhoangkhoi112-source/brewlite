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
    order: { create: ReturnType<typeof vi.fn> };
  };

  const request: CreateOrderDto = {
    userId: '01234567-89ab-4cde-8f01-23456789abcd',
    productId: '11234567-89ab-4cde-8f01-23456789abcd',
    quantity: 2,
  };

  const latte = {
    id: request.productId,
    name: 'Latte',
    basePrice: new Prisma.Decimal('25000'),
    stockQuantity: 10,
    status: ProductStatus.AVAILABLE,
  };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: vi.fn().mockResolvedValue({ id: request.userId }) },
      product: { findUnique: vi.fn().mockResolvedValue(latte) },
      order: {
        create: vi.fn().mockResolvedValue({
          id: 'order-id',
          orderCode: 'BL-test',
          status: 'PENDING',
          orderItems: [],
        }),
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

  it('creates a quick one-product order and returns order details', async () => {
    const result = await service.createOrder(request);

    const createData = prisma.order.create.mock.calls[0][0].data;
    expect(createData.userId).toBe(request.userId);
    expect(createData.subtotal.toString()).toBe('50000');
    expect(createData.totalAmount.toString()).toBe('50000');
    expect(createData.orderItems.create).toMatchObject([
      {
        productId: request.productId,
        productName: 'Latte',
        quantity: 2,
        unitPrice: new Prisma.Decimal('25000'),
        selectedSize: 'M',
        sugarLevel: '100%',
        iceLevel: '100%',
        selectedToppings: '[]',
        subtotal: new Prisma.Decimal('50000'),
      },
    ]);
    expect(createData).not.toHaveProperty('idempotencyKey');
    expect(result.orderCode).toBe('BL-test');
    expect(prisma.order.create.mock.calls[0][0].include).toEqual({
      orderItems: true,
    });
  });

  it('creates a multi-product order with customizations and database prices', async () => {
    const secondProductId = '21234567-89ab-4cde-8f01-23456789abcd';
    prisma.product.findUnique.mockImplementation(
      ({ where }: { where: { id: string } }) =>
        Promise.resolve(
          where.id === request.productId
            ? latte
            : {
                id: secondProductId,
                name: 'Trà sữa',
                basePrice: new Prisma.Decimal('30000'),
                stockQuantity: 5,
                status: ProductStatus.AVAILABLE,
              },
        ),
    );
    const multiRequest: CreateOrderDto = {
      userId: request.userId,
      items: [
        {
          productId: request.productId,
          quantity: 2,
          selectedSize: 'L',
          sugarLevel: '50%',
          iceLevel: '0%',
          selectedToppings: ['trân châu', 'pudding'],
        },
        { productId: secondProductId, quantity: 1 },
      ],
    };

    await service.createOrder(multiRequest);

    const createData = prisma.order.create.mock.calls[0][0].data;
    expect(createData.subtotal.toString()).toBe('80000');
    expect(createData.totalAmount.toString()).toBe('80000');
    expect(createData.orderItems.create).toMatchObject([
      {
        productId: request.productId,
        selectedSize: 'L',
        sugarLevel: '50%',
        iceLevel: '0%',
        selectedToppings: '["trân châu","pudding"]',
        subtotal: new Prisma.Decimal('50000'),
      },
      {
        productId: secondProductId,
        selectedSize: 'M',
        sugarLevel: '100%',
        iceLevel: '100%',
        selectedToppings: '[]',
        subtotal: new Prisma.Decimal('30000'),
      },
    ]);
  });

  it('stores the order note and supports multiple customized lines for one product', async () => {
    const input: CreateOrderDto = {
      userId: request.userId,
      note: 'Ít ngọt, giao tại quầy',
      items: [
        {
          productId: request.productId,
          quantity: 1,
          sugarLevel: '50%',
        },
        {
          productId: request.productId,
          quantity: 2,
          sugarLevel: '0%',
          selectedToppings: ['pudding'],
        },
      ],
    };

    await service.createOrder(input);

    const createData = prisma.order.create.mock.calls[0][0].data;
    expect(createData.note).toBe(input.note);
    expect(createData.subtotal.toString()).toBe('75000');
    expect(createData.orderItems.create).toHaveLength(2);
    expect(prisma.product.findUnique).toHaveBeenCalledTimes(1);
  });

  it('checks total stock across customized lines of the same product', async () => {
    prisma.product.findUnique.mockResolvedValue({
      ...latte,
      stockQuantity: 2,
    });

    await expect(
      service.createOrder({
        userId: request.userId,
        items: [
          { productId: request.productId, quantity: 2 },
          {
            productId: request.productId,
            quantity: 1,
            selectedToppings: ['trân châu'],
          },
        ],
      }),
    ).rejects.toThrow('Sản phẩm hiện không đủ số lượng đặt');

    expect(prisma.order.create).not.toHaveBeenCalled();
  });
});
