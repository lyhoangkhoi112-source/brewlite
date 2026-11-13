import { ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { ProductCategory, ProductStatus } from '@prisma/client';
import type { INestApplication } from '@nestjs/common';
import type { App } from 'supertest/types.js';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { ApiExceptionFilter } from '../src/response/api-exception.filter.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Order API integration', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let productId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.enableCors();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();

    prisma = app.get(PrismaService);
    const product = await prisma.product.create({
      data: {
        name: `Integration fixture ${randomUUID()}`,
        category: ProductCategory.COFFEE,
        basePrice: 12500,
        stockQuantity: 5,
        status: ProductStatus.AVAILABLE,
      },
    });
    productId = product.id;
  });

  afterAll(async () => {
    try {
      if (prisma && productId) {
        await prisma.order.deleteMany({
          where: { orderItems: { some: { productId } } },
        });
        await prisma.product.deleteMany({ where: { id: productId } });
      }
    } finally {
      await app?.close();
    }
  });

  it('lists the menu, creates a guest order, and confirms mock payment', async () => {
    const menuResponse = await request(app.getHttpServer())
      .get('/menu/all')
      .expect(200);
    expect(menuResponse.body).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: productId })]),
    );

    const orderResponse = await request(app.getHttpServer())
      .post('/orders')
      .send({
        shippingAddress: '12 Test Street, Ward 1',
        contactPhone: '0901234567',
        items: [{ productId, quantity: 1, selectedSize: 'M' }],
      })
      .expect(201);

    const order = orderResponse.body;
    expect(order).toEqual(
      expect.objectContaining({
        status: 'PENDING',
        guestAccessToken: expect.any(String),
        payments: expect.arrayContaining([
          expect.objectContaining({ status: 'PENDING', method: 'MOMO' }),
        ]),
      }),
    );
    expect(order.orderCode).toMatch(/^HD\d{8}$/);

    const payment = order.payments[0];
    await request(app.getHttpServer())
      .post(`/orders/${order.id}/payments/${payment.id}/mock`)
      .send({ outcome: 'SUCCESS', guestAccessToken: order.guestAccessToken })
      .expect(201);

    const [persistedOrder, persistedPayment, persistedProduct] =
      await Promise.all([
        prisma.order.findUniqueOrThrow({
          where: { id: order.id },
          include: { payments: true },
        }),
        prisma.payment.findUniqueOrThrow({ where: { id: payment.id } }),
        prisma.product.findUniqueOrThrow({ where: { id: productId } }),
      ]);

    expect(persistedOrder.status).toBe('CONFIRMED');
    expect(persistedOrder.payments[0].status).toBe('SUCCESS');
    expect(persistedPayment.status).toBe('SUCCESS');
    expect(persistedProduct.stockQuantity).toBe(4);
  });

  it('rejects invalid order input before writing to the database', async () => {
    const stockBeforeRequest = await prisma.product.findUniqueOrThrow({
      where: { id: productId },
      select: { stockQuantity: true },
    });

    await request(app.getHttpServer())
      .post('/orders')
      .send({
        shippingAddress: '',
        contactPhone: '0901234567',
        items: [{ productId, quantity: 0 }],
      })
      .expect(400);

    const fixture = await prisma.product.findUniqueOrThrow({
      where: { id: productId },
    });
    expect(fixture.stockQuantity).toBe(stockBeforeRequest.stockQuantity);
  });
});
