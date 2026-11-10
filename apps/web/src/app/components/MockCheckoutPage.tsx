'use client';

import { useEffect, useState } from 'react';
import {
  apiUrl,
  isRecord,
  readErrorMessage,
} from '../api-helpers';
import type { MockPaymentOutcome, PaymentMethod } from '../types';

interface MockPaymentDetails {
  paymentId: string;
  orderCode: string;
  amount: number;
  method: PaymentMethod;
  paymentStatus: string;
  orderStatus: string;
}

interface MockCheckoutPageProps {
  paymentId: string;
  paymentMethod?: string;
}

function isPaymentMethod(value: string | undefined): value is PaymentMethod {
  return (
    value === 'MOMO' ||
    value === 'VNPAY' ||
    value === 'SHOPEEPAY'
  );
}

function parsePaymentDetails(payload: unknown): MockPaymentDetails {
  if (
    !isRecord(payload) ||
    typeof payload.paymentId !== 'string' ||
    typeof payload.orderCode !== 'string' ||
    typeof payload.method !== 'string' ||
    typeof payload.paymentStatus !== 'string' ||
    typeof payload.orderStatus !== 'string'
  ) {
    throw new Error('Thông tin giao dịch không hợp lệ.');
  }

  const amount = Number(payload.amount);
  if (
    !Number.isFinite(amount) ||
    !isPaymentMethod(payload.method)
  ) {
    throw new Error('Thông tin giao dịch không hợp lệ.');
  }

  return {
    paymentId: payload.paymentId,
    orderCode: payload.orderCode,
    amount,
    method: payload.method,
    paymentStatus: payload.paymentStatus,
    orderStatus: payload.orderStatus,
  };
}

export function MockCheckoutPage({
  paymentId,
  paymentMethod,
}: MockCheckoutPageProps) {
  const [payment, setPayment] = useState<MockPaymentDetails | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const isValidPaymentId =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      paymentId,
    );

  useEffect(() => {
    const controller = new AbortController();
    if (!isValidPaymentId) return () => controller.abort();

    void (async () => {
      try {
        const response = await fetch(
          `${apiUrl}/orders/mock-payments/${encodeURIComponent(paymentId)}`,
          { signal: controller.signal },
        );
        const payload: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            readErrorMessage(payload, 'Không thể tải giao dịch thanh toán.'),
          );
        }
        const details = parsePaymentDetails(payload);
        setPayment({
          ...details,
          method: isPaymentMethod(paymentMethod)
            ? paymentMethod
            : details.method,
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : 'Không thể kết nối đến máy chủ.',
        );
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    })();

    return () => controller.abort();
  }, [isValidPaymentId, paymentId, paymentMethod]);

  async function handleOutcome(outcome: MockPaymentOutcome) {
    if (!payment || isProcessing) return;
    setIsProcessing(true);
    setActionError(null);
    try {
      const response = await fetch(
        `${apiUrl}/orders/mock-payments/${encodeURIComponent(payment.paymentId)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            outcome,
            paymentMethod: isPaymentMethod(paymentMethod)
              ? paymentMethod
              : payment.method,
          }),
        },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          readErrorMessage(payload, 'Không thể xử lý giao dịch mô phỏng.'),
        );
      }
      if (!isRecord(payload) || typeof payload.status !== 'string') {
        throw new Error('Kết quả giao dịch từ máy chủ không hợp lệ.');
      }
      const updatedOrderStatus = payload.status;
      setPayment((current) =>
        current
          ? {
              ...current,
              orderStatus: updatedOrderStatus,
              paymentStatus:
                outcome === 'SUCCESS'
                  ? 'SUCCESS'
                  : outcome === 'CANCELLED'
                    ? 'CANCELLED'
                    : 'FAILED',
            }
          : current,
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'Không thể kết nối đến máy chủ.',
      );
    } finally {
      setIsProcessing(false);
    }
  }

  const isPending =
    payment?.paymentStatus === 'PENDING' &&
    payment.orderStatus === 'PENDING';

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f4ed] px-4 py-8 text-[#26352c]">
      <section className="w-full max-w-md rounded-3xl border border-[#e8e1d3] bg-white p-6 shadow-[0_24px_80px_rgba(47,57,45,0.12)] sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[#59775e]">
          BrewLite · Thanh toán mô phỏng
        </p>
        <h1 className="mt-3 text-2xl font-semibold">Xác nhận thanh toán</h1>
        {!isValidPaymentId ? (
          <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            Liên kết thanh toán không hợp lệ.
          </p>
        ) : isLoading ? (
          <p role="status" className="mt-5 text-sm text-[#69746b]">
            Đang tải thông tin giao dịch...
          </p>
        ) : loadError ? (
          <p role="alert" className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}
          </p>
        ) : payment ? (
          <>
            <dl className="mt-6 space-y-3 rounded-2xl bg-[#f7f4ed] p-4 text-sm">
              <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-4">
                <dt className="whitespace-nowrap text-[#69746b]">Mã đơn</dt>
                <dd className="min-w-0 break-all text-right font-semibold">
                  {payment.orderCode}
                </dd>
              </div>
              <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-4">
                <dt className="whitespace-nowrap text-[#69746b]">Số tiền</dt>
                <dd className="text-right font-semibold">
                  {payment.amount.toLocaleString('vi-VN')} đ
                </dd>
              </div>
              <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-4">
                <dt className="whitespace-nowrap text-[#69746b]">Phương thức</dt>
                <dd className="text-right font-semibold">{payment.method} (Mock)</dd>
              </div>
            </dl>
            {isPending ? (
              <>
                <p className="mt-4 text-sm leading-6 text-[#69746b]">
                  Đây là giao dịch giả lập, không phát sinh thanh toán thật.
                </p>
                {actionError && (
                  <p role="alert" className="mt-3 text-sm text-red-700">
                    {actionError}
                  </p>
                )}
                <div className="mt-6 grid gap-3">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => void handleOutcome('SUCCESS')}
                    className="min-h-12 rounded-xl bg-[#304b39] px-4 py-3 font-semibold text-white transition hover:bg-[#243b2c] disabled:cursor-wait disabled:opacity-60"
                  >
                    {isProcessing ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
                  </button>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => void handleOutcome('CANCELLED')}
                    className="min-h-12 rounded-xl border border-[#dce2da] px-4 py-3 font-semibold text-[#405d47] transition hover:bg-[#f4f7f2] disabled:cursor-wait disabled:opacity-60"
                  >
                    Hủy thanh toán
                  </button>
                </div>
              </>
            ) : (
              <p role="status" className="mt-5 rounded-xl bg-[#edf2e9] px-4 py-3 text-sm text-[#405d47]">
                {payment.orderStatus === 'CONFIRMED'
                  ? 'Thanh toán thành công. Bạn có thể quay lại BrewLite.'
                  : payment.orderStatus === 'CANCELLED'
                    ? 'Giao dịch đã được hủy.'
                    : payment.orderStatus === 'PAYMENT_FAILED'
                      ? 'Giao dịch thất bại.'
                      : 'Giao dịch này đã được xử lý.'}
              </p>
            )}
          </>
        ) : null}
      </section>
    </main>
  );
}
