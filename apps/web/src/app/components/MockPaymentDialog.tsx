'use client';

import { QRCodeSVG } from 'qrcode.react';
import { useSyncExternalStore } from 'react';
import type { OrderConfirmation, PaymentMethod } from '../types';

interface MockPaymentDialogProps {
  order: OrderConfirmation | null;
  method: PaymentMethod;
  isProcessing: boolean;
  error: string | null;
  onMethodChange: (method: PaymentMethod) => void;
  onCancelPayment: () => void;
}

export function MockPaymentDialog({
  order,
  method,
  isProcessing,
  error,
  onMethodChange,
  onCancelPayment,
}: MockPaymentDialogProps) {
  const payment =
    order?.payments.find((candidate) => candidate.status === 'PENDING') ??
    order?.payments[0];
  const origin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => '',
  );

  if (!order || !payment) return null;
  const checkoutUrl = origin
    ? `${origin}/mock-checkout?paymentId=${encodeURIComponent(payment.id)}&paymentMethod=${encodeURIComponent(method)}`
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="mock-payment-heading"
        className="max-h-[calc(100dvh-1rem)] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-3xl sm:p-8"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[#59775e]">
          Môi trường thanh toán mô phỏng
        </p>
        <h2 id="mock-payment-heading" className="mt-2 text-2xl font-semibold">
          Thanh toán đơn {order.orderCode}
        </h2>
        <p className="mt-3 text-sm text-[#69746b]">
          {payment.amount.toLocaleString('vi-VN')} đ
        </p>
        <label className="mt-4 block text-sm font-medium text-[#46544a]">
          Phương thức thanh toán
          <select
            value={method}
            onChange={(event) => {
              const value = event.target.value;
              if (
                value === 'MOMO' ||
                value === 'VNPAY' ||
                value === 'SHOPEEPAY'
              ) {
                onMethodChange(value);
              }
            }}
            disabled={isProcessing}
            className="mt-2 min-h-11 w-full rounded-xl border border-[#dce2da] bg-white px-3.5 py-3"
          >
            <option value="MOMO">MoMo (Mock)</option>
            <option value="VNPAY">VNPay (Mock)</option>
            <option value="SHOPEEPAY">ShopeePay (Mock)</option>
          </select>
        </label>
        <p className="mt-3 rounded-xl bg-[#f7f4ed] px-4 py-3 text-sm text-[#69746b]">
          Quét mã bằng điện thoại để mở trang thanh toán mô phỏng. Không có
          giao dịch tiền thật.
        </p>
        <div className="mt-4 flex flex-col items-center rounded-2xl border border-[#e8e4da] bg-white p-4">
          {checkoutUrl ? (
            <QRCodeSVG value={checkoutUrl} size={176} level="M" includeMargin />
          ) : (
            <div className="h-44 w-44 animate-pulse rounded-xl bg-[#f4f4f0]" />
          )}
          <a
            href={checkoutUrl || undefined}
            target="_blank"
            rel="noreferrer"
            className="mt-3 text-center text-sm font-medium text-[#405d47] underline underline-offset-4"
          >
            Mở trang thanh toán trên thiết bị này
          </a>
        </div>
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          type="button"
          disabled={isProcessing}
          onClick={onCancelPayment}
          className="mt-4 min-h-12 w-full rounded-xl border border-[#dce2da] px-4 py-3 font-semibold text-[#405d47] transition hover:bg-[#f4f7f2] disabled:cursor-wait disabled:opacity-60"
        >
          {isProcessing ? 'Đang hủy thanh toán...' : 'Hủy thanh toán'}
        </button>
      </section>
    </div>
  );
}
