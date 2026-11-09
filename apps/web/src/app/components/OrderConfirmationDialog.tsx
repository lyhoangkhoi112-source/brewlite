'use client';

import type { OrderConfirmation } from '../types';

interface OrderConfirmationDialogProps {
  order: OrderConfirmation | null;
  cancellingOrder: boolean;
  error: string | null;
  onClose: () => void;
  onViewOrders: () => void;
  onCancelOrder: (orderId: string) => void;
}

function formatToppings(value: string | null): string {
  if (!value) return '';
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      Array.isArray(parsed) &&
      parsed.every((item) => typeof item === 'string')
    ) {
      return parsed.join(', ');
    }
  } catch {
    return value;
  }
  return value;
}

const orderStatusLabels: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PREPARING: 'Đang pha chế',
  READY: 'Sẵn sàng',
  DELIVERING: 'Đang giao',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
  PAYMENT_FAILED: 'Thanh toán thất bại',
};

export function OrderConfirmationDialog({
  order,
  cancellingOrder,
  error,
  onClose,
  onViewOrders,
  onCancelOrder,
}: OrderConfirmationDialogProps) {
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/40 p-0 sm:items-center sm:p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-confirmation-heading"
        className="my-auto max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-h-[90vh] sm:rounded-3xl sm:p-8"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[#59775e]">
          {order.status === 'CONFIRMED'
            ? 'Đặt hàng thành công'
            : order.status === 'PAYMENT_FAILED'
              ? 'Thanh toán thất bại'
              : order.status === 'CANCELLED'
                ? 'Đơn hàng đã hủy'
                : 'Đã tiếp nhận đơn hàng'}
        </p>
        <h2 id="order-confirmation-heading" className="mt-2 text-2xl font-semibold">
          Thông tin đơn hàng
        </h2>
        <p className="mt-2 text-sm text-[#69746b]">
          Trạng thái: {orderStatusLabels[order.status] ?? order.status}
        </p>
        {order.rejectionReason && (
          <p className="mt-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            Lý do hủy / từ chối: {order.rejectionReason}
          </p>
        )}
        {order.payments[0] && (
          <p className="mt-2 text-sm text-[#69746b]">
            Thanh toán: {order.payments[0].method} · {order.payments[0].status}
          </p>
        )}
        <div className="mt-3 rounded-xl bg-[#f7f4ed] px-4 py-3 text-sm text-[#46544a]">
          <p className="break-all font-semibold text-[#304b39]">
            Mã đơn: {order.orderCode}
          </p>
          {order.shippingAddress && (
            <p className="mt-1">Giao đến: {order.shippingAddress}</p>
          )}
          {order.contactPhone && (
            <p className="mt-1">Điện thoại: {order.contactPhone}</p>
          )}
        </div>
        {order.note && (
          <p className="mt-3 rounded-xl bg-[#f7f4ed] px-4 py-3 text-sm text-[#46544a]">
            Ghi chú: {order.note}
          </p>
        )}
        <ul className="mt-5 divide-y divide-[#edf0eb]">
          {order.orderItems.map((item, index) => {
            const toppings = formatToppings(item.selectedToppings);
            return (
              <li key={`${item.productName}-${index}`} className="py-4">
                <div className="flex justify-between gap-3">
                  <span className="font-semibold">
                    {item.productName} × {item.quantity}
                  </span>
                  <span>{item.subtotal.toLocaleString('vi-VN')} đ</span>
                </div>
                {!item.isStandaloneTopping && (
                  <p className="mt-1 text-xs leading-5 text-[#69746b]">
                    Size {item.selectedSize ?? 'M'} · Đường{' '}
                    {item.sugarLevel ?? '100%'} · Đá {item.iceLevel ?? '100%'}
                    {toppings ? ` · Topping: ${toppings}` : ''}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
        <div className="mt-3 space-y-1 border-t border-[#edf0eb] pt-4 text-sm">
          <div className="flex justify-between">
            <span>Tạm tính</span>
            <span>{order.subtotal.toLocaleString('vi-VN')} đ</span>
          </div>
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-[#28764a]">
              <span>Giảm từ điểm thành viên</span>
              <span>-{order.discountAmount.toLocaleString('vi-VN')} đ</span>
            </div>
          )}
        </div>
        <div className="mt-2 flex justify-between border-t border-[#edf0eb] pt-3 text-lg font-semibold">
          <span>Tổng cộng</span>
          <span>{order.totalAmount.toLocaleString('vi-VN')} đ</span>
        </div>
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {(order.status === 'PENDING' || order.status === 'CONFIRMED') && (
          <div className="mt-5">
            {order.payments.some((payment) => payment.status === 'SUCCESS') && (
              <p className="mb-2 text-sm text-red-700">
                Hủy đơn không tự động hoàn tiền cho giao dịch đã thanh toán.
              </p>
            )}
            <button
              type="button"
              disabled={cancellingOrder}
              onClick={() => onCancelOrder(order.id)}
              className="min-h-12 w-full rounded-xl border border-red-200 px-4 py-3 font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cancellingOrder ? 'Đang hủy...' : 'Hủy đơn hàng'}
            </button>
          </div>
        )}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onViewOrders}
            className="min-h-12 rounded-xl bg-[#304b39] px-4 py-3 font-semibold text-white transition hover:bg-[#243b2c]"
          >
            Xem đơn hàng
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 rounded-xl border border-[#dce2da] px-4 py-3 font-semibold text-[#405d47] transition hover:bg-[#f4f7f2]"
          >
            Đóng
          </button>
        </div>
      </section>
    </div>
  );
}
