'use client';

import type { OrderHistoryEntry } from '../types';

interface OrderHistoryDialogProps {
  open: boolean;
  orders: OrderHistoryEntry[];
  error: string | null;
  loading: boolean;
  cancellingOrderId: string | null;
  onClose: () => void;
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
  PREPARING: 'Đang chuẩn bị',
  READY: 'Sẵn sàng',
  DELIVERING: 'Đang giao',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
  PAYMENT_FAILED: 'Thanh toán thất bại',
};

export function OrderHistoryDialog({
  open,
  orders,
  error,
  loading,
  cancellingOrderId,
  onClose,
  onCancelOrder,
}: OrderHistoryDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="my-orders-heading"
        className="my-auto max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[#59775e]">
              Lịch sử mua hàng
            </p>
            <h2 id="my-orders-heading" className="mt-2 text-2xl font-semibold">
              Đơn hàng của tôi
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[#dce2da] px-3 py-1 text-sm font-medium text-[#405d47]"
          >
            Đóng
          </button>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        {loading ? (
          <p className="py-12 text-center text-sm text-[#69746b]">
            Đang tải đơn hàng...
          </p>
        ) : orders.length === 0 ? (
          <p className="py-12 text-center text-sm text-[#69746b]">
            Bạn chưa có đơn hàng nào trên thiết bị hoặc tài khoản này.
          </p>
        ) : (
          <ul className="mt-6 space-y-4">
            {orders.map((order) => (
              <li
                key={order.id}
                className="rounded-2xl border border-[#e7e2d7] p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">Mã đơn {order.orderCode}</h3>
                    <p className="mt-1 text-xs text-[#69746b]">
                      {new Date(order.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#edf2e9] px-3 py-1 text-xs font-semibold text-[#405d47]">
                    {orderStatusLabels[order.status] ?? order.status}
                  </span>
                </div>

                <ul className="mt-4 divide-y divide-[#edf0eb]">
                  {order.orderItems.map((item) => {
                    const toppings = formatToppings(item.selectedToppings);
                    return (
                      <li key={item.id} className="py-3">
                        <div className="flex justify-between gap-3 text-sm">
                          <span className="font-medium">
                            {item.productName} × {item.quantity}
                          </span>
                          <span>{item.subtotal.toLocaleString('vi-VN')} đ</span>
                        </div>
                        {!item.isStandaloneTopping && (
                          <p className="mt-1 text-xs text-[#69746b]">
                            Size {item.selectedSize ?? 'M'} · Đường{' '}
                            {item.sugarLevel ?? '100%'} · Đá{' '}
                            {item.iceLevel ?? '100%'}
                            {toppings ? ` · Topping: ${toppings}` : ''}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-3 space-y-1 border-t border-[#edf0eb] pt-3 text-sm">
                  <p>
                    <span className="font-medium">Địa chỉ:</span>{' '}
                    {order.shippingAddress ?? '—'}
                  </p>
                  <p>
                    <span className="font-medium">Số điện thoại:</span>{' '}
                    {order.contactPhone ?? '—'}
                  </p>
                  {order.note && (
                    <p>
                      <span className="font-medium">Ghi chú:</span> {order.note}
                    </p>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-base font-semibold">
                    Tổng cộng: {order.totalAmount.toLocaleString('vi-VN')} đ
                  </p>
                  {order.status === 'PENDING' && (
                    <button
                      type="button"
                      disabled={cancellingOrderId !== null}
                      onClick={() => onCancelOrder(order.id)}
                      className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {cancellingOrderId === order.id
                        ? 'Đang hủy...'
                        : 'Hủy đơn hàng'}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
