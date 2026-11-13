import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';

export function hashGuestAccessToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function getOrderConfirmationSelect() {
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
