'use client';

import { useState } from 'react';
import type { LoyaltySummary, OrderHistoryEntry } from '../types';

interface OrderHistoryDialogProps {
  open: boolean;
  orders: OrderHistoryEntry[];
  loyalty: LoyaltySummary | null;
  loyaltyError: string | null;
  loadingLoyalty: boolean;
  error: string | null;
  loading: boolean;
  cancellingOrderId: string | null;
  retryingPaymentOrderId: string | null;
  onClose: () => void;
  onCancelOrder: (orderId: string) => void;
  onRetryPayment: (orderId: string) => void;
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

export function OrderHistoryDialog({
  open,
  orders,
  loyalty,
  loyaltyError,
  loadingLoyalty,
  error,
  loading,
  cancellingOrderId,
  retryingPaymentOrderId,
  onClose,
  onCancelOrder,
  onRetryPayment,
}: OrderHistoryDialogProps) {
  const [orderCodeQuery, setOrderCodeQuery] = useState('');
  if (!open) return null;
  const normalizedOrderCode = orderCodeQuery.trim().toLocaleUpperCase('vi');
  const filteredOrders = normalizedOrderCode
    ? orders.filter((order) =>
        order.orderCode.toLocaleUpperCase('vi').includes(normalizedOrderCode) ||
        order.id.toLocaleUpperCase('vi').includes(normalizedOrderCode),
      )
    : orders;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/40 p-0 sm:items-center sm:p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="my-orders-heading"
        className="my-auto max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:max-h-[90vh] sm:rounded-3xl sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[#59775e]">
              Lịch sử mua hàng
            </p>
            <h2
              id="my-orders-heading"
              className="mt-2 text-xl font-semibold sm:text-2xl"
            >
              Đơn hàng của tôi
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-full border border-[#dce2da] px-3 py-1 text-sm font-medium text-[#405d47]"
          >
            Đóng
          </button>
        </div>

        {(loyalty || loadingLoyalty || loyaltyError) && (
          <section className="mt-5 rounded-2xl bg-[#edf2e9] p-4 sm:p-5">
            <p className="text-sm font-medium text-[#405d47]">
              Điểm khách hàng
            </p>
            <p className="mt-1 text-2xl font-semibold text-[#304b39]">
              {loyalty
                ? `${loyalty.balance.toLocaleString('vi-VN')} điểm`
                : loadingLoyalty
                  ? 'Đang tải...'
                  : 'Chưa tải được điểm'}
            </p>
            <p className="mt-1 text-xs text-[#69746b]">
              Mỗi 10.000 đ thanh toán nhận 1 điểm.
            </p>
            {loyaltyError && (
              <p role="alert" className="mt-2 text-sm text-red-700">
                {loyaltyError}
              </p>
            )}
            {loyalty && loyalty.transactions.length > 0 && (
              <ul className="mt-3 divide-y divide-[#dce6d8]">
                {loyalty.transactions.slice(0, 5).map((transaction) => (
                  <li
                    key={transaction.id}
                    className="flex justify-between gap-3 py-2 text-xs text-[#46544a]"
                  >
                    <span>
                      {transaction.description ?? 'Biến động điểm'} ·{' '}
                      {new Date(transaction.createdAt).toLocaleDateString(
                        'vi-VN',
                      )}
                    </span>
                    <span className="shrink-0 font-semibold">
                      {transaction.points > 0 ? '+' : ''}
                      {transaction.points}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}
        <label className="mt-5 block text-sm font-medium text-[#46544a]">
          Tìm hóa đơn theo mã đơn hoặc ID
          <input
            type="search"
            value={orderCodeQuery}
            onChange={(event) => setOrderCodeQuery(event.target.value)}
            placeholder="Nhập mã đơn hoặc ID hóa đơn"
            className="mt-2 min-h-11 w-full rounded-xl border border-[#dce2da] bg-white px-4 text-[#26382d] outline-none focus:border-[#607e65] focus:ring-4 focus:ring-[#607e65]/10"
          />
        </label>
        {loading ? (
          <p className="py-12 text-center text-sm text-[#69746b]">
            Đang tải đơn hàng...
          </p>
        ) : orders.length === 0 ? (
          <p className="py-12 text-center text-sm text-[#69746b]">
            Bạn chưa có đơn hàng nào trên thiết bị hoặc tài khoản này.
          </p>
        ) : filteredOrders.length === 0 ? (
          <p className="py-12 text-center text-sm text-[#69746b]">
            Không tìm thấy hóa đơn trong các đơn hàng thuộc tài khoản hoặc thiết
            bị này.
          </p>
        ) : (
          <ul className="mt-6 space-y-4">
            {filteredOrders.map((order) => (
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
                  {order.rejectionReason && (
                    <p className="text-red-700">
                      <span className="font-medium">Lý do hủy / từ chối:</span>{' '}
                      {order.rejectionReason}
                    </p>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm">
                    {order.discountAmount > 0 && (
                      <p className="text-[#28764a]">
                        Đã giảm {order.discountAmount.toLocaleString('vi-VN')} đ
                      </p>
                    )}
                    <p className="text-base font-semibold">
                      Tổng cộng: {order.totalAmount.toLocaleString('vi-VN')} đ
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(order.status === 'PAYMENT_FAILED' ||
                      order.canRetryPayment) && (
                      <button
                        type="button"
                        disabled={
                          cancellingOrderId !== null ||
                          retryingPaymentOrderId !== null
                        }
                        onClick={() => onRetryPayment(order.id)}
                        className="rounded-xl bg-[#304b39] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#243b2c] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {retryingPaymentOrderId === order.id
                          ? 'Đang xử lý...'
                          : 'Thanh toán lại'}
                      </button>
                    )}
                    {(order.status === 'PENDING' ||
                      order.status === 'CONFIRMED') && (
                      <button
                        type="button"
                        disabled={
                          cancellingOrderId !== null ||
                          retryingPaymentOrderId !== null
                        }
                        onClick={() => onCancelOrder(order.id)}
                        className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {cancellingOrderId === order.id
                          ? 'Đang hủy...'
                          : 'Hủy đơn hàng'}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
