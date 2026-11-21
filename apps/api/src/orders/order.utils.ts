import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';

export function hashGuestAccessToken(token: string): string { //Nhận token của khách và tạo ra chuỗi băm SHA-256
  return createHash('sha256').update(token).digest('hex');
}
// Công dụng: giúp hệ thống đối chiếu token truy cập đơn hàng của khách mà không cần lưu token gốc
// Trong order.service.ts, khi cần xác thực token truy cập của khách, hệ thống sẽ so sánh token đã băm với token lưu trong cơ sở dữ liệu.
// payments.service.ts cũng sẽ sử dụng token đã băm để xác thực quyền truy cập của khách khi thực hiện thanh toán.

export function getOrderConfirmationSelect() { //Trả về cấu trúc dữ liệu select cho xác nhận đơn hàng
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
  } satisfies Prisma.OrderSelect; // giúp TypeScript kiểm tra cấu trúc select của đơn hàng 
}
