import { expect, test } from '@playwright/test';
import { ProductCategory, ProductStatus, PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { configureTestDatabase } from '../test/test-database.js';

const testDatabaseUrl = configureTestDatabase();
const prisma = new PrismaClient({
  datasources: { db: { url: testDatabaseUrl } },
});
const productName = `Browser E2E fixture ${randomUUID()}`;
let productId: string;

test.beforeAll(async () => {
  const product = await prisma.product.create({
    data: {
      name: productName,
      category: ProductCategory.COFFEE,
      basePrice: 15000,
      stockQuantity: 5,
      status: ProductStatus.AVAILABLE,
    },
  });
  productId = product.id;
});

test.afterAll(async () => {
  try {
    if (productId) {
      await prisma.order.deleteMany({
        where: { orderItems: { some: { productId } } },
      });
      await prisma.product.deleteMany({ where: { id: productId } });
    }
  } finally {
    await prisma.$disconnect();
  }
});

test('guest browses the menu, places an order, and confirms payment', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Khám phá thực đơn', exact: true })
    .first()
    .click();
  await expect(
    page.getByRole('heading', { name: 'Thực đơn hôm nay' }),
  ).toBeVisible();

  const productCard = page.locator('article').filter({ hasText: productName });
  await productCard.getByRole('button', { name: 'Mua ngay' }).click();
  await page.getByRole('button', { name: 'Tiếp tục không đăng nhập' }).click();

  const productOptions = page.getByRole('dialog', { name: productName });
  await productOptions.getByPlaceholder('Ví dụ: 0901234567').fill('0901234567');
  await productOptions
    .getByPlaceholder('Số nhà, đường, phường/xã, quận/huyện')
    .fill('12 Test Street, Ward 1');
  await productOptions
    .getByRole('button', { name: 'Xác nhận mua ngay' })
    .click();

  const paymentPagePromise = page.waitForEvent('popup');
  await page
    .getByRole('link', { name: 'Mở trang thanh toán trên thiết bị này' })
    .click();
  const paymentPage = await paymentPagePromise;
  await expect(
    paymentPage.getByRole('heading', { name: 'Xác nhận thanh toán' }),
  ).toBeVisible();
  await paymentPage
    .getByRole('button', { name: 'Xác nhận thanh toán' })
    .click();
  await expect(paymentPage.getByRole('status')).toContainText(
    'Thanh toán thành công',
  );
  await expect(
    page.getByRole('dialog', { name: 'Thông tin đơn hàng' }),
  ).toContainText('Đã xác nhận');

  const order = await prisma.order.findFirstOrThrow({
    where: { orderItems: { some: { productId } } },
    include: { payments: true },
  });
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
  });
  expect(order.status).toBe('CONFIRMED');
  expect(order.payments[0].status).toBe('SUCCESS');
  expect(product.stockQuantity).toBe(4);
  await paymentPage.close();
});
