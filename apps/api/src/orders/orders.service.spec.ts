import { Test } from '@nestjs/testing';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  ProductStatus,
  UserStatus,
} from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { OrdersService } from './orders.service.js';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    product: {
      findUnique: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    order: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
      findUniqueOrThrow: ReturnType<typeof vi.fn>;
    };
    payment: {
      create: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    loyaltyTransaction: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };

  const productId = '11234567-89ab-4cde-8f01-23456789abcd';
  const userId = '01234567-89ab-4cde-8f01-23456789abcd';

  const request: CreateOrderDto = {
    shippingAddress: '123 Nguyễn Huệ, Quận 1',
    contactPhone: '0901234567',
    productId,
    quantity: 2,
  };

  const latte = {
    id: productId,
    name: 'Latte',
    basePrice: new Prisma.Decimal('25000'),
    stockQuantity: 10,
    status: ProductStatus.AVAILABLE,
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: userId,
          status: UserStatus.ACTIVE,
        }),
        update: vi.fn().mockResolvedValue({ loyaltyPoints: 5 }),
      },
      product: {
        findUnique: vi.fn().mockResolvedValue(latte),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      order: {
        create: vi.fn().mockResolvedValue({
          id: 'order-id',
          orderCode: 'BL-test',
          status: 'PENDING',
          orderItems: [],
        }),
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          id: 'order-id',
          orderCode: 'BL-test',
          status: 'CANCELLED',
          orderItems: [],
        }),
      },
      payment: {
        create: vi.fn().mockResolvedValue({ id: 'retry-payment-id' }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      loyaltyTransaction: {
        create: vi.fn().mockResolvedValue({}),
        findMany: vi.fn().mockResolvedValue([]),
      },
      $transaction: vi.fn(
        (callback: (transaction: typeof prisma) => Promise<unknown>) =>
          callback(prisma),
      ),
    };

    const module = await Test.createTestingModule({
      providers: [OrdersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(OrdersService);
  });

  it('creates a quick one-product order and returns order details', async () => {
    const result = await service.createOrderForUser(request, userId);

    const createData = prisma.order.create.mock.calls[0][0].data;
    expect(createData.userId).toBe(userId);
    expect(createData.shippingAddress).toBe(request.shippingAddress);
    expect(createData.contactPhone).toBe(request.contactPhone);
    expect(createData.subtotal.toString()).toBe('50000');
    expect(createData.totalAmount.toString()).toBe('50000');
    expect(createData.orderItems.create).toMatchObject([
      {
        productId,
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
    expect(prisma.order.create.mock.calls[0][0].select).toMatchObject({
      orderItems: true,
    });
    expect(createData.payments.create).toMatchObject({
      amount: new Prisma.Decimal('50000'),
      method: PaymentMethod.MOMO,
    });
    expect(prisma.product.updateMany).toHaveBeenCalledWith({
      where: {
        id: productId,
        status: ProductStatus.AVAILABLE,
        stockQuantity: { gte: 2 },
      },
      data: { stockQuantity: { decrement: 2 } },
    });
  });

  it('creates a multi-product order with customizations and database prices', async () => {
    const secondProductId = '21234567-89ab-4cde-8f01-23456789abcd';
    prisma.product.findUnique.mockImplementation(
      ({ where }: { where: { id: string } }) =>
        Promise.resolve(
          where.id === productId
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
      shippingAddress: request.shippingAddress,
      contactPhone: request.contactPhone,
      items: [
        {
          productId,
          quantity: 2,
          selectedSize: 'L',
          sugarLevel: '50%',
          iceLevel: '0%',
          selectedToppings: ['trân châu', 'pudding'],
        },
        { productId: secondProductId, quantity: 1 },
      ],
    };

    await service.createOrderForUser(multiRequest, userId);

    const createData = prisma.order.create.mock.calls[0][0].data;
    expect(createData.subtotal.toString()).toBe('80000');
    expect(createData.totalAmount.toString()).toBe('80000');
    expect(createData.orderItems.create).toMatchObject([
      {
        productId,
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
    expect(prisma.product.updateMany).toHaveBeenCalledTimes(2);
  });

  it('stores the order note and supports multiple customized lines for one product', async () => {
    const input: CreateOrderDto = {
      shippingAddress: request.shippingAddress,
      contactPhone: request.contactPhone,
      note: 'Ít ngọt, giao tại quầy',
      items: [
        {
          productId,
          quantity: 1,
          sugarLevel: '50%',
        },
        {
          productId,
          quantity: 2,
          sugarLevel: '0%',
          selectedToppings: ['pudding'],
        },
      ],
    };

    await service.createOrderForUser(input, userId);

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
        shippingAddress: request.shippingAddress,
        contactPhone: request.contactPhone,
        items: [
          { productId, quantity: 2 },
          {
            productId,
            quantity: 1,
            selectedToppings: ['trân châu'],
          },
        ],
      }),
    ).rejects.toThrow('Sản phẩm hiện không đủ số lượng đặt');

    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  it('does not create an order if atomic stock decrement fails', async () => {
    prisma.product.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.createOrder(request)).rejects.toThrow(
      'Sản phẩm hiện không đủ số lượng đặt',
    );

    expect(prisma.product.updateMany).toHaveBeenCalledOnce();
    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  it('creates a delivery order for a guest without a user account', async () => {
    const guestRequest: CreateOrderDto = {
      shippingAddress: '456 Lê Lợi, Quận 3',
      contactPhone: '0912345678',
      productId,
      quantity: 1,
    };

    const result = await service.createOrder(guestRequest);

    const createData = prisma.order.create.mock.calls[0][0].data;
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(createData.userId).toBeNull();
    expect(result.guestAccessToken).toMatch(/^[a-f0-9]{64}$/);
    expect(createData.guestAccessTokenHash).toBe(
      createHash('sha256').update(result.guestAccessToken).digest('hex'),
    );
    expect(result).not.toHaveProperty('guestAccessTokenHash');
    expect(createData.shippingAddress).toBe(guestRequest.shippingAddress);
    expect(createData.contactPhone).toBe(guestRequest.contactPhone);
  });

  it('associates authenticated orders with the verified user ID', async () => {
    await service.createOrderForUser(request, userId);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: userId },
      select: { id: true, status: true },
    });
    expect(prisma.order.create.mock.calls[0][0].data).toMatchObject({
      userId,
      guestAccessTokenHash: null,
    });
  });

  it('rejects authenticated orders for an inactive account', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: userId,
      status: UserStatus.INACTIVE,
    });

    await expect(service.createOrderForUser(request, userId)).rejects.toThrow(
      'Tài khoản không còn hoạt động',
    );

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('creates a pending payment for a selected mock provider', async () => {
    await service.createOrderForUser(
      Object.assign(new CreateOrderDto(), request, {
        paymentMethod: 'SHOPEEPAY',
      }),
      userId,
    );

    expect(
      prisma.order.create.mock.calls[0][0].data.payments.create,
    ).toMatchObject({
      amount: new Prisma.Decimal('50000'),
      method: PaymentMethod.SHOPEEPAY,
    });
  });

  it('does not create mock payments in production', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      await expect(
        service.createOrderForUser(
          Object.assign(new CreateOrderDto(), request, {
            paymentMethod: 'MOMO',
          }),
          userId,
        ),
      ).rejects.toThrow('Mock payments are disabled in production');
      expect(prisma.order.create).not.toHaveBeenCalled();
    } finally {
      if (originalNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = originalNodeEnv;
      }
    }
  });

  it.each([
    {
      outcome: 'SUCCESS' as const,
      paymentStatus: PaymentStatus.SUCCESS,
      orderStatus: OrderStatus.CONFIRMED,
      restoredStock: false,
    },
    {
      outcome: 'FAILED' as const,
      paymentStatus: PaymentStatus.FAILED,
      orderStatus: OrderStatus.PAYMENT_FAILED,
      restoredStock: true,
    },
    {
      outcome: 'CANCELLED' as const,
      paymentStatus: PaymentStatus.CANCELLED,
      orderStatus: OrderStatus.CANCELLED,
      restoredStock: true,
    },
  ])(
    'records a mock payment outcome: $outcome',
    async ({ outcome, paymentStatus, orderStatus, restoredStock }) => {
      prisma.order.findFirst.mockResolvedValue({
        id: 'order-id',
        orderCode: 'BL-test',
        userId,
        status: OrderStatus.PENDING,
        totalAmount: new Prisma.Decimal('59999.99'),
        orderItems: [{ productId, quantity: 2 }],
      });

      await service.simulateMockPayment(
        'order-id',
        'payment-id',
        { outcome, paymentMethod: 'SHOPEEPAY' },
        userId,
      );

      expect(prisma.payment.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'payment-id',
            orderId: 'order-id',
            status: PaymentStatus.PENDING,
            method: {
              in: [
                PaymentMethod.MOMO,
                PaymentMethod.VNPAY,
                PaymentMethod.SHOPEEPAY,
              ],
            },
          },
          data: expect.objectContaining({
            method: PaymentMethod.SHOPEEPAY,
            status: paymentStatus,
          }),
        }),
      );
      expect(prisma.order.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'order-id',
          status: OrderStatus.PENDING,
          userId,
        },
        data: { status: orderStatus },
      });
      expect(prisma.product.updateMany).toHaveBeenCalledTimes(
        restoredStock ? 1 : 0,
      );
      if (outcome === 'SUCCESS') {
        expect(prisma.user.update).toHaveBeenCalledWith({
          where: { id: userId },
          data: { loyaltyPoints: { increment: 5 } },
          select: { loyaltyPoints: true },
        });
        expect(prisma.loyaltyTransaction.create).toHaveBeenCalledWith({
          data: {
            userId,
            orderId: 'order-id',
            type: 'EARN',
            points: 5,
            balanceAfter: 5,
            description: 'Tích điểm từ đơn BL-test',
          },
        });
      } else {
        expect(prisma.user.update).not.toHaveBeenCalled();
        expect(prisma.loyaltyTransaction.create).not.toHaveBeenCalled();
      }
    },
  );

  it('creates a new pending payment and reserves stock when retrying a failed order', async () => {
    prisma.order.findFirst.mockResolvedValue({
      id: 'order-id',
      status: OrderStatus.PAYMENT_FAILED,
      totalAmount: new Prisma.Decimal('50000'),
      orderItems: [
        { productId, quantity: 1 },
        { productId, quantity: 1 },
      ],
    });

    await service.retryMockPayment(
      'order-id',
      { paymentMethod: 'VNPAY' },
      userId,
    );

    expect(prisma.product.updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        id: productId,
        status: ProductStatus.AVAILABLE,
        stockQuantity: { gte: 2 },
      },
      data: { stockQuantity: { decrement: 2 } },
    });
    expect(prisma.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orderId: 'order-id',
        amount: new Prisma.Decimal('50000'),
        method: PaymentMethod.VNPAY,
      }),
    });
    expect(prisma.order.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'order-id',
        status: OrderStatus.PAYMENT_FAILED,
        userId,
      },
      data: { status: OrderStatus.PENDING },
    });
    expect(prisma.order.findUniqueOrThrow).toHaveBeenCalledOnce();
  });

  it('does not reopen a failed order when its products are no longer in stock', async () => {
    prisma.order.findFirst.mockResolvedValue({
      id: 'order-id',
      status: OrderStatus.PAYMENT_FAILED,
      totalAmount: new Prisma.Decimal('50000'),
      orderItems: [{ productId, quantity: 2 }],
    });
    prisma.product.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(
      service.retryMockPayment('order-id', {}, userId),
    ).rejects.toThrow(
      'Sản phẩm trong đơn hiện không đủ số lượng để thanh toán lại',
    );

    expect(prisma.order.updateMany).not.toHaveBeenCalled();
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });

  it('gets loyalty balance and the latest transactions', async () => {
    prisma.user.findUnique.mockResolvedValue({
      loyaltyPoints: 12,
      loyaltyTransactions: [],
    });

    await expect(service.getLoyaltyForUser(userId)).resolves.toEqual({
      balance: 12,
      transactions: [],
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
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
  });

  it('looks up guest orders only by hashed access tokens', async () => {
    const token = 'a'.repeat(64);
    await service.getGuestOrders([token]);

    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: null,
          guestAccessTokenHash: {
            in: [createHash('sha256').update(token).digest('hex')],
          },
        },
      }),
    );
  });

  it('lists account orders only for the authenticated user', async () => {
    await service.getOrdersForUser(userId);

    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId } }),
    );
  });

  it('cancels a pending order and restores its stock', async () => {
    prisma.order.findFirst.mockResolvedValue({
      id: 'order-id',
      status: 'PENDING',
      orderItems: [{ productId, quantity: 2 }],
    });

    await service.cancelOrder('order-id', userId, []);

    expect(prisma.order.findFirst).toHaveBeenCalledWith({
      where: { id: 'order-id', userId },
      select: {
        id: true,
        status: true,
        orderItems: { select: { productId: true, quantity: true } },
      },
    });
    expect(prisma.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'order-id', status: 'PENDING', userId },
      data: { status: 'CANCELLED' },
    });
    expect(prisma.product.updateMany).toHaveBeenCalledWith({
      where: { id: productId, status: ProductStatus.OUT_OF_STOCK },
      data: {
        stockQuantity: { increment: 2 },
        status: ProductStatus.AVAILABLE,
      },
    });
  });

  it('does not reveal or modify an order without a matching owner token', async () => {
    await expect(
      service.cancelOrder('order-id', undefined, []),
    ).rejects.toThrow('Không tìm thấy đơn hàng');

    expect(prisma.order.findFirst).not.toHaveBeenCalled();
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
  });

  it('does not restore stock for an order that is no longer pending', async () => {
    prisma.order.findFirst.mockResolvedValue({
      id: 'order-id',
      status: 'CONFIRMED',
      orderItems: [{ productId, quantity: 2 }],
    });

    await expect(service.cancelOrder('order-id', userId, [])).rejects.toThrow(
      'Chỉ có thể hủy đơn hàng đang chờ xác nhận',
    );

    expect(prisma.order.updateMany).not.toHaveBeenCalled();
    expect(prisma.product.updateMany).not.toHaveBeenCalled();
  });

  it('rejects delivery orders with blank address or phone', async () => {
    await expect(
      service.createOrder({
        shippingAddress: '   ',
        contactPhone: request.contactPhone,
        productId,
        quantity: 2,
      }),
    ).rejects.toThrow('Vui lòng cung cấp địa chỉ giao hàng và số điện thoại');

    expect(prisma.product.findUnique).not.toHaveBeenCalled();
    expect(prisma.order.create).not.toHaveBeenCalled();
  });
});
