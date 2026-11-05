'use client';

import type { OrderConfirmation } from '../types';

interface OrderConfirmationDialogProps {
  order: OrderConfirmation | null;
  onClose: () => void;
  onViewOrders: () => void;
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

export function OrderConfirmationDialog({
  order,
  onClose,
  onViewOrders,
}: OrderConfirmationDialogProps) {
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-confirmation-heading"
        className="my-auto w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[#59775e]">
          Đặt hàng thành công
        </p>
        <h2
          id="order-confirmation-heading"
          className="mt-2 text-2xl font-semibold"
        >
          Mã đơn {order.orderCode}
        </h2>
        <p className="mt-2 text-sm text-[#69746b]">
          Trạng thái: {order.status}
        </p>
        {(order.shippingAddress || order.contactPhone) && (
          <p className="mt-3 rounded-xl bg-[#f7f4ed] px-4 py-3 text-sm text-[#46544a]">
            Giao đến: {order.shippingAddress ?? '—'}
            <br />
            Điện thoại: {order.contactPhone ?? '—'}
          </p>
        )}
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
        <div className="mt-3 flex justify-between border-t border-[#edf0eb] pt-4 text-lg font-semibold">
          <span>Tổng cộng</span>
          <span>{order.totalAmount.toLocaleString('vi-VN')} đ</span>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onViewOrders}
            className="rounded-xl bg-[#304b39] px-4 py-3 font-semibold text-white transition hover:bg-[#243b2c]"
          >
            Xem đơn hàng
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#dce2da] px-4 py-3 font-semibold text-[#405d47] transition hover:bg-[#f4f7f2]"
          >
            Đóng
          </button>
        </div>
      </section>
    </div>
  );
}
