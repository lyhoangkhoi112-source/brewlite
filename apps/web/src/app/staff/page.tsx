'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { apiUrl, isRecord, readErrorMessage } from '../api-helpers';

type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'DELIVERING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'PAYMENT_FAILED';

interface Order {
  id: string;
  orderCode: string;
  customer: string;
  items: string[];
  total: number;
  status: OrderStatus;
  hasPendingPayment: boolean;
  deleted: boolean;
  note?: string;
  rejectionReason?: string;
}

interface StaffSession {
  accessToken: string;
  fullName: string;
  email: string;
}

const staffSessionKey = 'brewlite-staff-session';

const orderStatuses: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'DELIVERING',
  'COMPLETED',
  'CANCELLED',
  'PAYMENT_FAILED',
];

function isOrderStatus(value: unknown): value is OrderStatus {
  return orderStatuses.some((status) => status === value);
}

function parseStaffOrder(value: unknown): Order {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.orderCode !== 'string' ||
    !isOrderStatus(value.status) ||
    !Array.isArray(value.orderItems) ||
    !Array.isArray(value.payments)
  ) {
    throw new Error('Thông tin đơn hàng từ máy chủ không hợp lệ.');
  }
  const total = Number(value.totalAmount);
  if (!Number.isFinite(total)) {
    throw new Error('Tổng tiền đơn hàng từ máy chủ không hợp lệ.');
  }
  const items = value.orderItems.map((item: unknown) => {
    if (
      !isRecord(item) ||
      typeof item.productName !== 'string' ||
      typeof item.quantity !== 'number'
    ) {
      throw new Error('Chi tiết món hàng từ máy chủ không hợp lệ.');
    }
    const size =
      typeof item.selectedSize === 'string'
        ? ` (Size ${item.selectedSize})`
        : '';
    return `${item.productName}${size} × ${item.quantity}`;
  });
  const customer =
    isRecord(value.user) && typeof value.user.fullName === 'string'
      ? value.user.fullName
      : 'Khách hàng';
  return {
    id: value.id,
    orderCode: value.orderCode,
    status: value.status,
    hasPendingPayment: value.payments.some(
      (payment) => isRecord(payment) && payment.status === 'PENDING',
    ),
    customer,
    items,
    total,
    deleted: value.deletedAt !== null && value.deletedAt !== undefined,
    ...(typeof value.note === 'string' ? { note: value.note } : {}),
    ...(typeof value.rejectionReason === 'string'
      ? { rejectionReason: value.rejectionReason }
      : {}),
  };
}

const statusInfo: Record<OrderStatus, { label: string; color: string; background: string }> = {
  PENDING: { label: 'Đơn mới', color: '#9A5B20', background: '#FFF0D9' },
  CONFIRMED: { label: 'Đã nhận', color: '#4169A1', background: '#E6F0FF' },
  PREPARING: { label: 'Đang pha chế', color: '#8A5A9E', background: '#F3E8FA' },
  READY: { label: 'Sẵn sàng', color: '#28764A', background: '#E1F3E7' },
  DELIVERING: { label: 'Đang giao', color: '#4169A1', background: '#E6F0FF' },
  COMPLETED: { label: 'Hoàn tất', color: '#28764A', background: '#E1F3E7' },
  CANCELLED: { label: 'Đã từ chối / hủy', color: '#A33B32', background: '#FBE9E7' },
  PAYMENT_FAILED: { label: 'Thanh toán thất bại', color: '#A33B32', background: '#FBE9E7' },
};

export default function StaffPage() {
  const [session, setSession] = useState<StaffSession | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [searchOrderCode, setSearchOrderCode] = useState('');
  const [searchedOrder, setSearchedOrder] = useState<Order | null>(null);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [isSearchingOrder, setIsSearchingOrder] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const savedSession = window.sessionStorage.getItem(staffSessionKey);
        if (savedSession) {
          const parsed: unknown = JSON.parse(savedSession);
          if (
            isRecord(parsed) &&
            typeof parsed.accessToken === 'string' &&
            typeof parsed.fullName === 'string' &&
            typeof parsed.email === 'string'
          ) {
            setSession({
              accessToken: parsed.accessToken,
              fullName: parsed.fullName,
              email: parsed.email,
            });
          } else {
            window.sessionStorage.removeItem(staffSessionKey);
          }
        }
      } catch (error) {
        window.sessionStorage.removeItem(staffSessionKey);
        console.error('Không thể khôi phục phiên nhân viên:', error);
      } finally {
        setSessionReady(true);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const loadOrders = useCallback(async (showLoading = true) => {
    if (!session) return;
    if (showLoading) setLoadingOrders(true);
    setOrdersError(null);
    try {
      const response = await fetch(`${apiUrl}/orders/staff`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(readErrorMessage(payload, 'Không thể tải đơn hàng.'));
      }
      if (!Array.isArray(payload)) {
        throw new Error('Danh sách đơn hàng từ máy chủ không hợp lệ.');
      }
      setOrders(payload.map(parseStaffOrder));
    } catch (error) {
      setOrdersError(
        error instanceof Error ? error.message : 'Không thể kết nối đến máy chủ.',
      );
    } finally {
      if (showLoading) setLoadingOrders(false);
    }
  }, [session]);

  async function searchStaffOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    const orderCode = searchOrderCode.trim();
    if (!orderCode) {
      setSearchMessage('Nhập mã đơn hàng để tìm kiếm.');
      setSearchedOrder(null);
      return;
    }

    setIsSearchingOrder(true);
    setSearchMessage(null);
    setSearchedOrder(null);
    try {
      const response = await fetch(
        `${apiUrl}/orders/staff/search?orderCode=${encodeURIComponent(orderCode)}`,
        { headers: { Authorization: `Bearer ${session.accessToken}` } },
      );
      const responseText = await response.text();
      let payload: unknown = null;
      if (responseText.trim()) {
        try {
          payload = JSON.parse(responseText);
        } catch {
          throw new Error(
            `Máy chủ trả về dữ liệu không hợp lệ (HTTP ${response.status}).`,
          );
        }
      }
      if (!response.ok) {
        throw new Error(readErrorMessage(payload, 'Không thể tìm đơn hàng.'));
      }
      if (payload === null) {
        setSearchMessage('Không tìm thấy đơn hàng theo mã đã nhập.');
        return;
      }
      setSearchedOrder(parseStaffOrder(payload));
    } catch (error) {
      setSearchMessage(
        error instanceof Error ? error.message : 'Không thể kết nối đến máy chủ.',
      );
    } finally {
      setIsSearchingOrder(false);
    }
  }

  async function softDeleteSearchedOrder() {
    if (!session || !searchedOrder || searchedOrder.deleted) return;
    if (
      !window.confirm(
        `Ẩn đơn ${searchedOrder.orderCode} khỏi danh sách thông thường? Dữ liệu vẫn được giữ trong hệ thống.`,
      )
    ) {
      return;
    }
    setUpdatingOrderId(searchedOrder.id);
    setSearchMessage(null);
    try {
      const response = await fetch(
        `${apiUrl}/orders/${encodeURIComponent(searchedOrder.id)}/staff-soft-delete`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.accessToken}` },
        },
      );
      const responseText = await response.text();
      let payload: unknown = null;
      if (responseText.trim()) {
        try {
          payload = JSON.parse(responseText);
        } catch {
          throw new Error(
            `Máy chủ trả về dữ liệu không hợp lệ (HTTP ${response.status}).`,
          );
        }
      }
      if (!response.ok) {
        throw new Error(readErrorMessage(payload, 'Không thể xóa mềm đơn hàng.'));
      }
      setSearchedOrder({ ...searchedOrder, deleted: true });
      await loadOrders(false);
    } catch (error) {
      setSearchMessage(
        error instanceof Error ? error.message : 'Không thể kết nối đến máy chủ.',
      );
    } finally {
      setUpdatingOrderId(null);
    }
  }

  useEffect(() => {
    if (!session) return;
    const frame = window.requestAnimationFrame(() => {
      void loadOrders();
    });
    const intervalId = window.setInterval(() => {
      void loadOrders(false);
    }, 5000);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(intervalId);
    };
  }, [loadOrders, session]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const response = await fetch(`${apiUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(readErrorMessage(payload, 'Đăng nhập thất bại.'));
      }
      if (
        !isRecord(payload) ||
        typeof payload.accessToken !== 'string' ||
        !isRecord(payload.user) ||
        payload.user.role !== 'STAFF' ||
        typeof payload.user.fullName !== 'string' ||
        typeof payload.user.email !== 'string'
      ) {
        throw new Error('Vui lòng đăng nhập bằng tài khoản nhân viên.');
      }
      const nextSession = {
        accessToken: payload.accessToken,
        fullName: payload.user.fullName,
        email: payload.user.email,
      };
      window.sessionStorage.setItem(
        staffSessionKey,
        JSON.stringify(nextSession),
      );
      setSession(nextSession);
      setPassword('');
    } catch (error) {
      setLoginError(
        error instanceof Error ? error.message : 'Không thể kết nối đến máy chủ.',
      );
    } finally {
      setIsLoggingIn(false);
    }
  }

  function handleLogout() {
    window.sessionStorage.removeItem(staffSessionKey);
    setSession(null);
    setOrders([]);
    setEmail('');
    setPassword('');
  }

  async function updateStatus(
    orderId: string,
    status: 'CONFIRMED' | 'PREPARING' | 'READY',
  ) {
    if (!session) return;
    setUpdatingOrderId(orderId);
    setOrdersError(null);
    try {
      const response = await fetch(`${apiUrl}/orders/${orderId}/staff-status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({ status }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          readErrorMessage(payload, 'Không thể cập nhật đơn hàng.'),
        );
      }
      await loadOrders(false);
    } catch (error) {
      setOrdersError(
        error instanceof Error ? error.message : 'Không thể kết nối đến máy chủ.',
      );
    } finally {
      setUpdatingOrderId(null);
    }
  }

  async function rejectOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !rejectingOrderId) return;
    setUpdatingOrderId(rejectingOrderId);
    setOrdersError(null);
    try {
      const response = await fetch(
        `${apiUrl}/orders/${rejectingOrderId}/reject`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({ reason: rejectionReason.trim() }),
        },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          readErrorMessage(payload, 'Không thể từ chối đơn hàng.'),
        );
      }
      setRejectingOrderId(null);
      setRejectionReason('');
      await loadOrders(false);
    } catch (error) {
      setOrdersError(
        error instanceof Error ? error.message : 'Không thể kết nối đến máy chủ.',
      );
    } finally {
      setUpdatingOrderId(null);
    }
  }

  async function cancelOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session || !cancellingOrderId) return;
    setUpdatingOrderId(cancellingOrderId);
    setOrdersError(null);
    try {
      const response = await fetch(
        `${apiUrl}/orders/${cancellingOrderId}/staff-cancel`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({ reason: cancellationReason.trim() }),
        },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          readErrorMessage(payload, 'Không thể hủy đơn hàng.'),
        );
      }
      setCancellingOrderId(null);
      setCancellationReason('');
      await loadOrders(false);
    } catch (error) {
      setOrdersError(
        error instanceof Error ? error.message : 'Không thể kết nối đến máy chủ.',
      );
    } finally {
      setUpdatingOrderId(null);
    }
  }

  const filteredOrders = orders.filter(
    (order) => filter === 'ALL' || order.status === filter
  );
  const canSoftDeleteSearchedOrder =
    searchedOrder?.status === 'READY' ||
    searchedOrder?.status === 'COMPLETED' ||
    searchedOrder?.status === 'CANCELLED';

  const stats = [
    { label: 'Đơn mới', value: orders.filter((o) => o.status === 'PENDING').length, color: '#C28B55' },
    { label: 'Đang pha chế', value: orders.filter((o) => o.status === 'PREPARING').length, color: '#8A5A9E' },
    { label: 'Sẵn sàng', value: orders.filter((o) => o.status === 'READY').length, color: '#28764A' },
  ];

  if (!sessionReady) {
    return (
      <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        Đang tải...
      </main>
    );
  }

  if (!session) {
    return (
      <main className="grid min-h-screen bg-[#f4f5ef] text-[#24382c] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-[#294432] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-20">
          <div className="absolute -right-36 -top-32 h-[34rem] w-[34rem] rounded-full border border-white/10" />
          <div className="absolute -right-12 -top-8 h-[25rem] w-[25rem] rounded-full border border-white/10" />
          <div className="relative flex items-center gap-3 text-sm font-semibold tracking-[0.24em]">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#d2a66f] text-lg text-[#294432]">
              B
            </span>
            BREWLITE
          </div>
          <div className="relative max-w-xl">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.28em] text-[#d9ba91]">
              Không gian vận hành
            </p>
            <h1 className="text-5xl font-semibold leading-[1.12] tracking-tight xl:text-6xl">
              Pha chế tỉ mỉ, phục vụ tận tâm.
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-white/65">
              Theo dõi danh sách đơn hàng, cập nhật trạng thái món ăn và đồ uống
              tức thì cho khách hàng.
            </p>
          </div>
          <p className="relative text-sm text-white/45">
            BrewLite · Trang dành riêng cho nhân viên
          </p>
        </section>
        <section className="flex items-center justify-center px-5 py-12 sm:px-10">
          <div className="w-full max-w-md">
            <div className="mb-10 flex items-center gap-3 lg:hidden">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#294432] font-semibold text-white">
                B
              </span>
              <span className="text-sm font-bold tracking-[0.2em]">
                BREWLITE
              </span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9a6d3e]">
              Khu vực nhân viên
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              Chào mừng trở lại
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#748076]">
              Đăng nhập bằng tài khoản nhân viên để tiếp tục.
            </p>
            {loginError && (
              <p
                role="alert"
                className="mt-6 rounded-2xl border border-[#f2d1cc] bg-[#fff3f1] px-4 py-3 text-sm text-[#9c392f]"
              >
                {loginError}
              </p>
            )}
            <form onSubmit={handleLogin} className="mt-8 space-y-5">
              <label className="flex flex-col gap-2 text-sm font-medium text-[#46544a]">
                Email
                <input
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="staff@brewlite.vn"
                  className="h-12 rounded-xl border border-[#dfe4dc] bg-white px-4 text-[#26382d] outline-none transition placeholder:text-[#aab2aa] focus:border-[#607e65] focus:ring-4 focus:ring-[#607e65]/10"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-[#46544a]">
                Mật khẩu
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="h-12 rounded-xl border border-[#dfe4dc] bg-white px-4 text-[#26382d] outline-none transition placeholder:text-[#aab2aa] focus:border-[#607e65] focus:ring-4 focus:ring-[#607e65]/10"
                />
              </label>
              <button
                type="submit"
                disabled={isLoggingIn}
                className="mt-2 flex h-12 w-full items-center justify-center rounded-xl bg-[#294432] px-5 font-semibold text-white transition hover:bg-[#203728] disabled:cursor-wait disabled:opacity-60"
              >
                {isLoggingIn ? 'Đang xác thực…' : 'Đăng nhập nhân viên'}
              </button>
            </form>
            <Link
              href="/"
              className="mt-7 inline-flex text-sm font-medium text-[#657367] transition hover:text-[#294432]"
            >
              ← Quay về trang thực đơn
            </Link>
          </div>
        </section>
      </main>
    );
  }

  // ==================== GIAO DIỆN QUẢN LÝ ĐƠN HÀNG ====================
  return (
    <main style={{ minHeight: '100vh', background: '#F7F4ED', color: '#26382D', fontFamily: 'var(--font-geist-sans), sans-serif' }}>
      {/* HEADER */}
      <header style={{ background: '#294735', color: 'white', padding: '20px 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>BrewLite</div>
          <div style={{ fontSize: 13, opacity: 0.8 }}>STAFF ORDER MANAGEMENT</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>{session.fullName}</span>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#E8DCC7', color: '#294735', display: 'grid', placeItems: 'center', fontWeight: 700 }}>
              {session.fullName.substring(0, 2).toUpperCase()}
            </div>
          </div>
          <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>
            Đăng xuất
          </button>
        </div>
      </header>

      {/* BODY CONTENT */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 20px' }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ color: '#A66B3F', fontSize: 12, fontWeight: 700, letterSpacing: 2 }}>ORDER MANAGEMENT</div>
          <h1 style={{ fontSize: 32, margin: '10px 0' }}>Quản lý đơn hàng</h1>
          <p style={{ color: '#777', margin: 0 }}>Theo dõi và xử lý đơn hàng tự động từ khách hàng.</p>
        </div>

        <section
          aria-labelledby="staff-order-search-heading"
          style={{
            background: 'white',
            border: '1px solid #E8E1D6',
            borderRadius: 18,
            padding: 20,
            marginBottom: 24,
          }}
        >
          <h2 id="staff-order-search-heading" style={{ margin: '0 0 12px', fontSize: 18 }}>
            Tìm hóa đơn theo mã đơn hoặc ID
          </h2>
          <form
            onSubmit={searchStaffOrder}
            style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}
          >
            <input
              type="search"
              value={searchOrderCode}
              onChange={(event) => setSearchOrderCode(event.target.value)}
              placeholder="Nhập mã đơn hoặc ID hóa đơn"
              aria-label="Mã đơn hoặc ID hóa đơn cần tìm"
              style={{ ...inputStyle, flex: '1 1 240px' }}
            />
            <button type="submit" disabled={isSearchingOrder} style={buttonStyle}>
              {isSearchingOrder ? 'Đang tìm...' : 'Tìm hóa đơn'}
            </button>
          </form>
          {searchMessage && (
            <p role="status" style={{ color: '#A33B32', margin: '12px 0 0' }}>
              {searchMessage}
            </p>
          )}
          {searchedOrder && (
            <div
              style={{
                marginTop: 16,
                border: '1px solid #E8E1D6',
                borderRadius: 12,
                padding: 16,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div>
                <strong>{searchedOrder.orderCode}</strong>
                <p style={{ margin: '6px 0 0', color: '#555', fontSize: 14 }}>
                  {searchedOrder.customer} · {statusInfo[searchedOrder.status]?.label} ·{' '}
                  {searchedOrder.total.toLocaleString('vi-VN')}đ
                </p>
                {searchedOrder.deleted && (
                  <p style={{ margin: '6px 0 0', color: '#A33B32', fontSize: 13 }}>
                    Hóa đơn này đã được xóa mềm.
                  </p>
                )}
              </div>
              {searchedOrder.deleted ? null : canSoftDeleteSearchedOrder ? (
                <button
                  type="button"
                  disabled={updatingOrderId !== null}
                  onClick={() => void softDeleteSearchedOrder()}
                  style={{ ...buttonStyle, background: '#A33B32' }}
                >
                  {updatingOrderId === searchedOrder.id
                    ? 'Đang xóa mềm...'
                    : 'Xóa mềm hóa đơn'}
                </button>
              ) : (
                <p style={{ margin: 0, color: '#69746b', fontSize: 13 }}>
                  Chỉ đơn sẵn sàng, hoàn tất hoặc đã hủy mới được xóa mềm.
                </p>
              )}
            </div>
          )}
        </section>

        {/* THỐNG KÊ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
          {stats.map((stat) => (
            <div key={stat.label} style={{ background: 'white', padding: 22, borderRadius: 16, border: '1px solid #E8E1D6' }}>
              <div style={{ fontSize: 14, color: '#777', marginBottom: 12 }}>{stat.label}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* DANH SÁCH ĐƠN HÀNG */}
        <div style={{ background: 'white', border: '1px solid #E8E1D6', borderRadius: 18, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
            <h2 style={{ margin: 0, fontSize: 21 }}>Danh sách đơn hàng</h2>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #D9D9D9', background: 'white', color: '#294735', cursor: 'pointer' }}>
              <option value="ALL">Tất cả đơn hàng</option>
              <option value="PENDING">Đơn mới</option>
              <option value="CONFIRMED">Đã nhận</option>
              <option value="PREPARING">Đang pha chế</option>
              <option value="READY">Sẵn sàng</option>
              <option value="CANCELLED">Đã từ chối / hủy</option>
              <option value="PAYMENT_FAILED">Thanh toán thất bại</option>
            </select>
          </div>

          {ordersError && (
            <div role="alert" style={{ marginBottom: 16, color: '#A33B32' }}>
              {ordersError}
            </div>
          )}
          {loadingOrders && orders.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
              Đang tải đơn hàng...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
              Chưa có đơn hàng nào từ khách.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
              {filteredOrders.map((order) => (
                <div key={order.id} style={{ border: '1px solid #E8E1D6', borderRadius: 14, padding: 18, background: '#FFFEFC', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                      <strong>{order.orderCode}</strong>
                      <span style={{ background: statusInfo[order.status]?.background || '#eee', color: statusInfo[order.status]?.color || '#333', padding: '6px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                        {statusInfo[order.status]?.label || order.status}
                      </span>
                    </div>

                    <div style={{ fontWeight: 700, marginBottom: 8 }}>{order.customer}</div>

                    <div style={{ color: '#555', fontSize: 14, lineHeight: 1.8, minHeight: 56 }}>
                      {order.items.map((item, index) => (
                        <div key={index}>{item}</div>
                      ))}
                    </div>

                    {order.note && (
                      <div style={{ fontSize: 12, color: '#A66B3F', background: '#FFF9F2', padding: 8, borderRadius: 6, marginTop: 8 }}>
                        Ghi chú: {order.note}
                      </div>
                    )}
                    {order.rejectionReason && (
                      <div style={{ fontSize: 12, color: '#A33B32', background: '#FBE9E7', padding: 8, borderRadius: 6, marginTop: 8 }}>
                        Lý do hủy / từ chối: {order.rejectionReason}
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ borderTop: '1px solid #EEE7DC', marginTop: 16, paddingTop: 14, fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                      <span>Tổng tiền</span>
                      <span>{order.total.toLocaleString('vi-VN')}đ</span>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
                      {order.status === 'CONFIRMED' && (
                        <button disabled={updatingOrderId !== null} onClick={() => void updateStatus(order.id, 'PREPARING')} style={buttonStyle}>
                          {updatingOrderId === order.id ? 'Đang cập nhật...' : 'Bắt đầu pha chế'}
                        </button>
                      )}
                      {order.status === 'PREPARING' && (
                        <button disabled={updatingOrderId !== null} onClick={() => void updateStatus(order.id, 'READY')} style={buttonStyle}>
                          {updatingOrderId === order.id ? 'Đang cập nhật...' : 'Đánh dấu sẵn sàng'}
                        </button>
                      )}
                      {order.status === 'PENDING' &&
                        !order.hasPendingPayment &&
                        rejectingOrderId !== order.id && (
                          <button
                            disabled={updatingOrderId !== null}
                            onClick={() =>
                              void updateStatus(order.id, 'CONFIRMED')
                            }
                            style={buttonStyle}
                          >
                            {updatingOrderId === order.id
                              ? 'Đang cập nhật...'
                              : 'Nhận đơn'}
                          </button>
                        )}
                      {order.status === 'READY' && (
                        <div style={{ textAlign: 'center', color: '#28764A', background: '#E1F3E7', padding: 10, borderRadius: 10, fontWeight: 700, fontSize: 13 }}>
                          ✓ Đã sẵn sàng phục vụ
                        </div>
                      )}
                      {order.status === 'PENDING' &&
                        rejectingOrderId !== order.id && (
                        <>
                          <p style={{ color: '#777', fontSize: 12, margin: '0 0 4px' }}>
                            {order.hasPendingPayment
                              ? 'Đơn đang chờ thanh toán.'
                              : 'Đơn đang chờ nhân viên xác nhận.'}
                          </p>
                          <button
                            type="button"
                            disabled={updatingOrderId !== null}
                            onClick={() => {
                              setRejectingOrderId(order.id);
                              setRejectionReason('');
                              setCancellingOrderId(null);
                              setCancellationReason('');
                            }}
                            style={{ ...buttonStyle, background: '#A33B32' }}
                          >
                            Không nhận đơn
                          </button>
                        </>
                      )}
                      {order.status === 'CONFIRMED' &&
                        rejectingOrderId !== order.id && (
                          <button
                            type="button"
                            disabled={updatingOrderId !== null}
                            onClick={() => {
                              setRejectingOrderId(null);
                              setRejectionReason('');
                              setCancellingOrderId(order.id);
                              setCancellationReason('');
                            }}
                            style={{ ...buttonStyle, background: '#A33B32' }}
                          >
                            Hủy đơn
                          </button>
                        )}
                      {cancellingOrderId === order.id ? (
                        <form onSubmit={cancelOrder} style={{ display: 'grid', gap: 8 }}>
                          <label htmlFor={'cancel-reason-' + order.id} style={{ fontSize: 13, fontWeight: 600 }}>
                            Lý do hủy (không bắt buộc)
                          </label>
                          <textarea
                            id={'cancel-reason-' + order.id}
                            maxLength={500}
                            value={cancellationReason}
                            onChange={(event) => setCancellationReason(event.target.value)}
                            placeholder="Có thể để trống"
                            style={{ ...inputStyle, minHeight: 84, resize: 'vertical' }}
                          />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              type="submit"
                              disabled={updatingOrderId !== null}
                              style={{ ...buttonStyle, background: '#A33B32' }}
                            >
                              {updatingOrderId === order.id ? 'Đang hủy...' : 'Xác nhận hủy'}
                            </button>
                            <button
                              type="button"
                              disabled={updatingOrderId !== null}
                              onClick={() => {
                                setCancellingOrderId(null);
                                setCancellationReason('');
                              }}
                              style={{ ...buttonStyle, background: '#69746B' }}
                            >
                              Quay lại
                            </button>
                          </div>
                        </form>
                      ) : null}
                      {rejectingOrderId === order.id && (
                        <form onSubmit={rejectOrder} style={{ display: 'grid', gap: 8 }}>
                          <label htmlFor={'reject-reason-' + order.id} style={{ fontSize: 13, fontWeight: 600 }}>
                            Lý do không nhận đơn
                          </label>
                          <textarea
                            id={'reject-reason-' + order.id}
                            required
                            maxLength={500}
                            value={rejectionReason}
                            onChange={(event) => setRejectionReason(event.target.value)}
                            placeholder="Nhập lý do để khách hàng biết"
                            style={{ ...inputStyle, minHeight: 84, resize: 'vertical' }}
                          />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              type="submit"
                              disabled={updatingOrderId !== null || !rejectionReason.trim()}
                              style={{ ...buttonStyle, background: '#A33B32' }}
                            >
                              {updatingOrderId === order.id ? 'Đang xử lý...' : 'Xác nhận từ chối'}
                            </button>
                            <button
                              type="button"
                              disabled={updatingOrderId !== null}
                              onClick={() => {
                                setRejectingOrderId(null);
                                setRejectionReason('');
                              }}
                              style={{ ...buttonStyle, background: '#69746B' }}
                            >
                              Hủy
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

const inputStyle = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: 10,
  border: '1px solid #E0D8CC',
  background: 'white',
  color: '#26382D',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box' as const,
};

const buttonStyle = {
  background: '#294735',
  color: 'white',
  border: 'none',
  borderRadius: 10,
  padding: '12px 16px',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 13,
};