'use client';

import type { ReactNode } from 'react';
import type { OrderIntent, Product } from '../types';

interface ProductOptionsDialogProps {
  product: Product | null;
  intent: OrderIntent;
  size: string;
  quantity: number;
  sugarLevel: string;
  iceLevel: string;
  note: string;
  isCreatingOrder: boolean;
  deliveryFields: ReactNode;
  onClose: () => void;
  onSizeChange: (value: string) => void;
  onQuantityChange: (value: number) => void;
  onSugarChange: (value: string) => void;
  onIceChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onConfirm: () => void;
}

export function ProductOptionsDialog({
  product,
  intent,
  size,
  quantity,
  sugarLevel,
  iceLevel,
  note,
  isCreatingOrder,
  deliveryFields,
  onClose,
  onSizeChange,
  onQuantityChange,
  onSugarChange,
  onIceChange,
  onNoteChange,
  onConfirm,
}: ProductOptionsDialogProps) {
  if (!product) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center overflow-y-auto bg-black/40 p-0 sm:items-center sm:p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-options-heading"
        className="my-auto max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-h-[90vh] sm:max-w-lg sm:rounded-3xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[#59775e]">
              Tùy chỉnh món
            </p>
            <h2
              id="product-options-heading"
              className="mt-2 text-2xl font-semibold"
            >
              {product.name}
            </h2>
            <p className="mt-1 text-sm text-[#69746b]">
              {product.price.toLocaleString('vi-VN')} đ · Chưa tính phụ thu
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl text-[#69746b] hover:bg-[#f4f7f2]"
            aria-label="Đóng tùy chỉnh món"
          >
            ×
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-6 sm:gap-4">
          {product.category !== 'TOPPING' && (
            <label className="text-sm font-medium text-[#46544a]">
              Kích cỡ
              <select
                value={size}
                onChange={(event) => onSizeChange(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-xl border border-[#dce2da] bg-white px-3 py-3"
              >
                {['S', 'M', 'L'].map((option) => (
                  <option key={option} value={option}>
                    Size {option}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="text-sm font-medium text-[#46544a]">
            Số lượng
            <input
              type="number"
              min={1}
              max={product.stockQuantity}
              value={quantity}
              onChange={(event) =>
                onQuantityChange(
                  Math.max(1, Number.parseInt(event.target.value, 10) || 1),
                )
              }
              className="mt-2 min-h-11 w-full rounded-xl border border-[#dce2da] px-3 py-3"
            />
          </label>
          {product.category !== 'TOPPING' && (
            <>
              <label className="text-sm font-medium text-[#46544a]">
                Lượng đường
                <select
                  value={sugarLevel}
                  onChange={(event) => onSugarChange(event.target.value)}
                  className="mt-2 min-h-11 w-full rounded-xl border border-[#dce2da] bg-white px-3 py-3"
                >
                  {['25%', '50%', '75%', '100%'].map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-[#46544a]">
                Lượng đá
                <select
                  value={iceLevel}
                  onChange={(event) => onIceChange(event.target.value)}
                  className="mt-2 min-h-11 w-full rounded-xl border border-[#dce2da] bg-white px-3 py-3"
                >
                  {['0%', '50%', '100%'].map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
        </div>

        {intent === 'buyNow' && (
          <>
            <div className="mt-5">{deliveryFields}</div>
            <label className="mt-5 block text-sm font-medium text-[#46544a]">
              Ghi chú đơn hàng
              <textarea
                value={note}
                onChange={(event) => onNoteChange(event.target.value)}
                maxLength={500}
                rows={2}
                placeholder="Ví dụ: ít ngọt, nhận tại quầy..."
                className="mt-2 w-full resize-y rounded-xl border border-[#dce2da] px-3 py-2.5 outline-none transition focus:border-[#59775e] focus:ring-4 focus:ring-[#59775e]/10"
              />
            </label>
          </>
        )}

        <div className="mt-5 grid gap-3 sm:mt-6 sm:grid-cols-2">
          <button
            type="button"
            disabled={isCreatingOrder}
            onClick={onConfirm}
            className="min-h-12 rounded-xl bg-[#304b39] px-4 py-3 font-semibold text-white transition hover:bg-[#243b2c] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isCreatingOrder
              ? 'Đang đặt...'
              : intent === 'buyNow'
                ? 'Xác nhận mua ngay'
                : 'Thêm vào giỏ'}
          </button>
          <button
            type="button"
            disabled={isCreatingOrder}
            onClick={onClose}
            className="min-h-12 rounded-xl border border-[#dce2da] px-4 py-3 font-semibold text-[#405d47] transition hover:bg-[#f4f7f2] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Quay lại
          </button>
        </div>
      </section>
    </div>
  );
}
