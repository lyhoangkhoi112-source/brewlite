'use client';

import type { ReactNode } from 'react';
import type { CartItem } from '../../stores/useCartStore';

interface CartDrawerProps {
  open: boolean;
  items: CartItem[];
  count: number;
  total: number;
  notice: string | null;
  note: string;
  isCreatingOrder: boolean;
  deliveryFields: ReactNode;
  onClose: () => void;
  onNoteChange: (value: string) => void;
  onUpdateOptions: (
    id: string,
    options: { selectedSize: string; sugarLevel: string; iceLevel: string },
  ) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  onCheckout: () => void;
}

export function CartDrawer({
  open,
  items,
  count,
  total,
  notice,
  note,
  isCreatingOrder,
  deliveryFields,
  onClose,
  onNoteChange,
  onUpdateOptions,
  onUpdateQuantity,
  onRemove,
  onCheckout,
}: CartDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/40 sm:p-4">
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-heading"
        className="h-dvh w-full max-w-xl overflow-y-auto rounded-none border border-[#e8e1d3] bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:h-full sm:rounded-2xl sm:p-8"
      >
        <div className="mb-5 flex items-center justify-between">
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[#59775e]">
            Giỏ hàng của bạn
          </p>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full text-2xl text-[#69746b] hover:bg-[#f4f7f2]"
            aria-label="Đóng giỏ hàng"
          >
            ×
          </button>
        </div>
        <section id="cart" aria-labelledby="cart-heading">
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[#59775e]">
            Đơn đang chọn
          </p>
          <h2 id="cart-heading" className="mt-2 text-xl font-semibold">
            Giỏ hàng · {count}
          </h2>
          {notice && (
            <p
              role="status"
              className="mt-3 rounded-xl bg-[#edf2e9] px-3 py-2 text-sm text-[#405d47]"
            >
              {notice}
            </p>
          )}
          {items.length === 0 ? (
            <p className="mt-3 text-sm text-[#69746b]">Giỏ hàng đang trống.</p>
          ) : (
            <>
              {deliveryFields}
              <ul className="mt-4 divide-y divide-[#edf0eb]">
                {items.map((item) => (
                  <li key={item.id} className="py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{item.name}</p>
                        {item.category === 'TOPPING' ? (
                          <p className="mt-1 text-xs text-[#69746b]">Topping</p>
                        ) : (
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            <label className="text-xs font-medium text-[#69746b]">
                              Kích cỡ
                              <select
                                value={item.selectedSize ?? 'M'}
                                onChange={(event) =>
                                  onUpdateOptions(item.id, {
                                    selectedSize: event.target.value,
                                    sugarLevel: item.sugarLevel ?? '100%',
                                    iceLevel: item.iceLevel ?? '100%',
                                  })
                                }
                                className="mt-1 w-full rounded-lg border border-[#dce2da] bg-white px-2 py-2 text-sm text-[#46544a]"
                              >
                                {['S', 'M', 'L'].map((size) => (
                                  <option key={size} value={size}>
                                    Size {size}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="text-xs font-medium text-[#69746b]">
                              Lượng đường
                              <select
                                value={item.sugarLevel ?? '100%'}
                                onChange={(event) =>
                                  onUpdateOptions(item.id, {
                                    selectedSize: item.selectedSize ?? 'M',
                                    sugarLevel: event.target.value,
                                    iceLevel: item.iceLevel ?? '100%',
                                  })
                                }
                                className="mt-1 w-full rounded-lg border border-[#dce2da] bg-white px-2 py-2 text-sm text-[#46544a]"
                              >
                                {['25%', '50%', '75%', '100%'].map((level) => (
                                  <option key={level} value={level}>
                                    {level}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="text-xs font-medium text-[#69746b]">
                              Lượng đá
                              <select
                                value={item.iceLevel ?? '100%'}
                                onChange={(event) =>
                                  onUpdateOptions(item.id, {
                                    selectedSize: item.selectedSize ?? 'M',
                                    sugarLevel: item.sugarLevel ?? '100%',
                                    iceLevel: event.target.value,
                                  })
                                }
                                className="mt-1 w-full rounded-lg border border-[#dce2da] bg-white px-2 py-2 text-sm text-[#46544a]"
                              >
                                {['0%', '50%', '100%'].map((level) => (
                                  <option key={level} value={level}>
                                    {level}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                        )}
                        <p className="mt-1 text-sm text-[#69746b]">
                          {item.price.toLocaleString('vi-VN')} đ / món
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemove(item.id)}
                        className="text-xs font-semibold text-[#8b5a53] hover:underline"
                        aria-label={`Xóa ${item.name} khỏi giỏ`}
                      >
                        Xóa
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQuantity(item.id, item.quantity - 1)
                          }
                          className="h-11 w-11 rounded-full border border-[#dce2da] font-semibold"
                          aria-label={`Giảm số lượng ${item.name}`}
                        >
                          −
                        </button>
                        <span aria-label="Số lượng">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateQuantity(item.id, item.quantity + 1)
                          }
                          className="h-11 w-11 rounded-full border border-[#dce2da] font-semibold"
                          aria-label={`Tăng số lượng ${item.name}`}
                        >
                          +
                        </button>
                      </div>
                      <span className="text-sm font-semibold">
                        {(item.price * item.quantity).toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex justify-between border-t border-[#edf0eb] pt-4 font-semibold">
                <span>Tạm tính</span>
                <span>{total.toLocaleString('vi-VN')} đ</span>
              </div>
              <label className="mt-4 block text-sm font-medium text-[#46544a]">
                Ghi chú đơn hàng
                <textarea
                  value={note}
                  onChange={(event) => onNoteChange(event.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Ví dụ: ít ngọt, gọi trước khi giao..."
                  className="mt-2 w-full resize-y rounded-xl border border-[#dce2da] px-3 py-2.5 outline-none transition focus:border-[#59775e] focus:ring-4 focus:ring-[#59775e]/10"
                />
              </label>
              <p className="mt-2 text-xs text-[#818a81]">
                Tùy chọn size, đường và đá hiện chưa tính phụ thu.
              </p>
              <button
                type="button"
                disabled={isCreatingOrder}
                onClick={onCheckout}
                className="sticky bottom-0 mt-4 min-h-12 w-full rounded-xl bg-[#304b39] px-4 py-3 font-semibold text-white shadow-[0_-8px_16px_rgba(255,255,255,0.9)] transition hover:bg-[#243b2c] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreatingOrder ? 'Đang đặt hàng...' : 'Đặt hàng'}
              </button>
            </>
          )}
        </section>
      </aside>
    </div>
  );
}
