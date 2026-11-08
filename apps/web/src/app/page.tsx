'use client';

import Image from 'next/image';
import { FormEvent, useState } from 'react';
import { useCartStore } from '../stores/useCartStore';

type Screen = 'welcome' | 'login' | 'register' | 'menu';

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  stockQuantity: number;
  status: string;
}

interface AuthenticatedUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

interface LoginResult {
  accessToken: string;
  user: AuthenticatedUser;
}

interface OrderItemInput {
  productId: string;
  quantity: number;
  selectedSize: string;
  sugarLevel: string;
  iceLevel: string;
  selectedToppings: string[];
}

interface OrderConfirmation {
  orderCode: string;
  status: string;
  totalAmount: number;
  note: string | null;
  orderItems: Array<{
    productName: string;
    quantity: number;
    selectedSize: string | null;
    sugarLevel: string | null;
    iceLevel: string | null;
    selectedToppings: string | null;
    subtotal: number;
  }>;
}

type OrderIntent = 'buyNow' | 'cart';
type PendingOrderAction =
  | { type: 'configureProduct'; product: Product; intent: OrderIntent }
  | { type: 'checkoutCart' };

const toppingOptions = ['trân châu', 'pudding', 'thạch'];

const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').replace(
  /\/$/,
  '',
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readErrorMessage(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) return fallback;

  const message = payload.message;
  if (typeof message === 'string') return message;
  if (Array.isArray(message)) {
    return message.filter((part): part is string => typeof part === 'string').join(', ');
  }
  return fallback;
}

function parseProducts(payload: unknown): Product[] {
  if (!Array.isArray(payload)) {
    throw new Error('Dữ liệu thực đơn từ máy chủ không hợp lệ.');
  }

  return payload.map((item: unknown) => {
    if (!isRecord(item)) {
      throw new Error('Dữ liệu món ăn từ máy chủ không hợp lệ.');
    }

    const price = Number(item.basePrice);
    if (
      typeof item.id !== 'string' ||
      typeof item.name !== 'string' ||
      !Number.isFinite(price) ||
      typeof item.stockQuantity !== 'number' ||
      typeof item.status !== 'string' ||
      (item.imageUrl !== null && typeof item.imageUrl !== 'string')
    ) {
      throw new Error('Dữ liệu món ăn từ máy chủ không hợp lệ.');
    }

    return {
      id: item.id,
      name: item.name,
      price,
      imageUrl: item.imageUrl,
      stockQuantity: item.stockQuantity,
      status: item.status,
    };
  });
}

function parseLoginResult(payload: unknown): LoginResult {
  if (!isRecord(payload) || !isRecord(payload.user)) {
    throw new Error('Phản hồi đăng nhập từ máy chủ không hợp lệ.');
  }

  const { user } = payload;
  if (
    typeof payload.accessToken !== 'string' ||
    typeof user.id !== 'string' ||
    typeof user.fullName !== 'string' ||
    typeof user.email !== 'string' ||
    typeof user.role !== 'string'
  ) {
    throw new Error('Phản hồi đăng nhập từ máy chủ không hợp lệ.');
  }

  return {
    accessToken: payload.accessToken,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    },
  };
}

function parseOrderConfirmation(payload: unknown): OrderConfirmation {
  if (
    !isRecord(payload) ||
    typeof payload.orderCode !== 'string' ||
    typeof payload.status !== 'string' ||
    !Array.isArray(payload.orderItems)
  ) {
    throw new Error('Thông tin đơn hàng từ máy chủ không hợp lệ.');
  }

  const totalAmount = Number(payload.totalAmount);
  if (!Number.isFinite(totalAmount)) {
    throw new Error('Tổng tiền đơn hàng từ máy chủ không hợp lệ.');
  }

  const orderItems = payload.orderItems.map((item: unknown) => {
    if (
      !isRecord(item) ||
      typeof item.productName !== 'string' ||
      typeof item.quantity !== 'number' ||
      typeof item.subtotal !== 'string' &&
        typeof item.subtotal !== 'number'
    ) {
      throw new Error('Chi tiết món hàng từ máy chủ không hợp lệ.');
    }

    const subtotal = Number(item.subtotal);
    if (!Number.isFinite(subtotal)) {
      throw new Error('Thành tiền món hàng từ máy chủ không hợp lệ.');
    }

    return {
      productName: item.productName,
      quantity: item.quantity,
      selectedSize:
        typeof item.selectedSize === 'string' ? item.selectedSize : null,
      sugarLevel:
        typeof item.sugarLevel === 'string' ? item.sugarLevel : null,
      iceLevel: typeof item.iceLevel === 'string' ? item.iceLevel : null,
      selectedToppings:
        typeof item.selectedToppings === 'string'
          ? item.selectedToppings
          : null,
      subtotal,
    };
  });

  return {
    orderCode: payload.orderCode,
    status: payload.status,
    totalAmount,
    note: typeof payload.note === 'string' ? payload.note : null,
    orderItems,
  };
}

export default function MenuPage() {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [searchId, setSearchId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginNotice, setLoginNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registerFullName, setRegisterFullName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [configProduct, setConfigProduct] = useState<Product | null>(null);
  const [configIntent, setConfigIntent] = useState<OrderIntent>('cart');
  const [pendingOrderAction, setPendingOrderAction] =
    useState<PendingOrderAction | null>(null);
  const [authReturnScreen, setAuthReturnScreen] = useState<Screen>('welcome');
  const [selectedSize, setSelectedSize] = useState('M');
  const [sugarLevel, setSugarLevel] = useState('100%');
  const [iceLevel, setIceLevel] = useState('100%');
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [configuredQuantity, setConfiguredQuantity] = useState(1);
  const [directOrderNote, setDirectOrderNote] = useState('');
  const [cartOrderNote, setCartOrderNote] = useState('');
  const [orderError, setOrderError] = useState<string | null>(null);
  const [cartNotice, setCartNotice] = useState<string | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [orderConfirmation, setOrderConfirmation] =
    useState<OrderConfirmation | null>(null);

  const addItem = useCartStore((state) => state.addItem);
  const updateCartQuantity = useCartStore((state) => state.updateQuantity);
  const removeCartItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const cartItems = useCartStore((state) => state.items);
  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );

  async function loadMenu(token?: string | null) {
    setLoadingMenu(true);
    setMenuError(null);

    try {
      const headers = new Headers();
      if (token) headers.set('Authorization', `Bearer ${token}`);

      const response = await fetch(`${apiUrl}/menu/all`, { headers });
      const payload: unknown = await response.json();

      if (!response.ok) {
        throw new Error(readErrorMessage(payload, 'Không thể tải thực đơn.'));
      }

      setProducts(parseProducts(payload));
    } catch (error) {
      setMenuError(
        error instanceof Error ? error.message : 'Không thể kết nối đến máy chủ.',
      );
    } finally {
      setLoadingMenu(false);
    }
  }

  function showProductOptions(product: Product, intent: OrderIntent) {
    setConfigProduct(product);
    setConfigIntent(intent);
    setSelectedSize('M');
    setSugarLevel('100%');
    setIceLevel('100%');
    setSelectedToppings([]);
    setConfiguredQuantity(1);
    if (intent === 'buyNow') setDirectOrderNote('');
    setOrderError(null);
    setCartNotice(null);
    setOrderConfirmation(null);
  }

  function requestLogin(action: PendingOrderAction) {
    setPendingOrderAction(action);
    setAuthReturnScreen('menu');
    setLoginError(null);
    setLoginNotice('Đăng nhập hoặc đăng ký để tiếp tục đặt hàng.');
    setScreen('login');
  }

  function openProductOptions(product: Product, intent: OrderIntent) {
    if (!user) {
      requestLogin({ type: 'configureProduct', product, intent });
      return;
    }

    showProductOptions(product, intent);
  }

  async function placeOrder(
    items: OrderItemInput[],
    clearCartAfterSuccess = false,
    userId = user?.id,
    note = '',
  ) {
    if (!userId) {
      setOrderError('Vui lòng đăng nhập trước khi đặt hàng.');
      return;
    }

    setIsCreatingOrder(true);
    setOrderError(null);

    try {
      const response = await fetch(`${apiUrl}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          items,
          note: note.trim() || undefined,
        }),
      });
      const payload: unknown = await response.json();

      if (!response.ok) {
        throw new Error(readErrorMessage(payload, 'Không thể tạo đơn hàng.'));
      }

      const confirmation = parseOrderConfirmation(payload);
      setOrderConfirmation(confirmation);

      // =========================================================================
      // THÊM ĐOẠN NÀY: TỰ ĐỘNG ĐẨY ĐƠN HÀNG SANG TRANG NHÂN VIÊN VÀ LƯU BỘ NHỚ
      // =========================================================================
      try {
        const existingOrders = JSON.parse(
          localStorage.getItem('brewlite_orders') || '[]'
        );

        const newOrderForStaff = {
          id: confirmation.orderCode || `BL${Date.now().toString().slice(-3)}`,
          customer: user?.fullName || 'Khách hàng',
          items: confirmation.orderItems.map(
            (item) => `${item.productName} (Size ${item.selectedSize ?? 'M'}) x${item.quantity}`
          ),
          total: confirmation.totalAmount,
          status: 'PENDING',
          note: note.trim() || undefined,
        };

        localStorage.setItem(
          'brewlite_orders',
          JSON.stringify([newOrderForStaff, ...existingOrders])
        );
      } catch (err) {
        console.error('Lỗi khi đồng bộ đơn tới LocalStorage:', err);
      }
      // =========================================================================

      setConfigProduct(null);
      if (clearCartAfterSuccess) {
        clearCart();
        setCartOrderNote('');
      } else {
        setDirectOrderNote('');
      }
    } catch (error) {
      setOrderError(
        error instanceof Error ? error.message : 'Không thể kết nối đến máy chủ.',
      );
    } finally {
      setIsCreatingOrder(false);
    }
  }

  function addConfiguredProductToCart() {
    if (!configProduct) return;

    const sortedToppings = [...selectedToppings].sort();
    addItem({
      id: JSON.stringify([
        configProduct.id,
        selectedSize,
        sugarLevel,
        iceLevel,
        sortedToppings,
      ]),
      productId: configProduct.id,
      name: configProduct.name,
      price: configProduct.price,
      quantity: configuredQuantity,
      selectedSize,
      sugarLevel,
      iceLevel,
      selectedToppings: sortedToppings,
    });
    setCartNotice(`${configProduct.name} đã được thêm vào giỏ hàng.`);
    setConfigProduct(null);
  }

  function orderConfiguredProductNow() {
    if (!configProduct) return;
    void placeOrder(
      [
        {
          productId: configProduct.id,
          quantity: configuredQuantity,
          selectedSize,
          sugarLevel,
          iceLevel,
          selectedToppings,
        },
      ],
      false,
      undefined,
      directOrderNote,
    );
  }

  function confirmProductOptions() {
    if (configIntent === 'buyNow') {
      orderConfiguredProductNow();
    } else {
      addConfiguredProductToCart();
    }
  }

  function checkoutCart(userId = user?.id) {
    if (!userId) {
      requestLogin({ type: 'checkoutCart' });
      return;
    }

    void placeOrder(
      cartItems.map((item) => ({
        productId: item.productId ?? item.id,
        quantity: item.quantity,
        selectedSize: item.selectedSize ?? 'M',
        sugarLevel: item.sugarLevel ?? '100%',
        iceLevel: item.iceLevel ?? '100%',
        selectedToppings: item.selectedToppings ?? [],
      })),
      true,
      userId,
      cartOrderNote,
    );
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setLoginError(null);
    setLoginNotice(null);

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

      const result = parseLoginResult(payload);
      setAccessToken(result.accessToken);
      setUser(result.user);
      setPassword('');
      setLoginNotice(null);
      setScreen('menu');
      await loadMenu(result.accessToken);

      const nextAction = pendingOrderAction;
      setPendingOrderAction(null);
      if (nextAction?.type === 'configureProduct') {
        showProductOptions(nextAction.product, nextAction.intent);
      } else if (nextAction?.type === 'checkoutCart') {
        checkoutCart(result.user.id);
      }
    } catch (error) {
      setLoginError(
        error instanceof Error ? error.message : 'Không thể kết nối đến máy chủ.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsRegistering(true);
    setRegisterError(null);

    try {
      const response = await fetch(`${apiUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: registerFullName,
          email: registerEmail,
          password: registerPassword,
          ...(registerPhone.trim() ? { phone: registerPhone } : {}),
        }),
      });
      const payload: unknown = await response.json();

      if (!response.ok) {
        throw new Error(readErrorMessage(payload, 'Không thể tạo tài khoản.'));
      }

      setEmail(registerEmail.trim().toLowerCase());
      setPassword('');
      setRegisterPassword('');
      setLoginError(null);
      setLoginNotice('Tạo tài khoản thành công. Hãy đăng nhập để tiếp tục.');
      setScreen('login');
    } catch (error) {
      setRegisterError(
        error instanceof Error ? error.message : 'Không thể kết nối đến máy chủ.',
      );
    } finally {
      setIsRegistering(false);
    }
  }

  function openMenu() {
    setPendingOrderAction(null);
    setLoginNotice(null);
    setScreen('menu');
    void loadMenu(accessToken);
  }

  function returnFromAuth() {
    setPendingOrderAction(null);
    setLoginNotice(null);
    setScreen(authReturnScreen);
  }

  function logout() {
    setAccessToken(null);
    setUser(null);
    setConfigProduct(null);
    setPendingOrderAction(null);
    setScreen('menu');
  }

  const normalizedSearchId = searchId.trim().toLowerCase();
  const visibleProducts = products.filter((product) =>
    product.id.toLowerCase().includes(normalizedSearchId),
  );

  if (screen === 'welcome') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f4ed] px-5 py-12 text-[#26352c]">
        <section className="w-full max-w-3xl rounded-[2rem] border border-[#e8e1d3] bg-white p-8 shadow-[0_24px_80px_rgba(47,57,45,0.10)] sm:p-14">
          <div className="mb-10 inline-flex items-center gap-3 rounded-full bg-[#edf2e9] px-4 py-2 text-sm font-semibold text-[#405d47]">
            <span aria-hidden="true">B</span>
            BrewLite
          </div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#9a6d3e]">
            Cà phê, theo cách của bạn
          </p>
          <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
            Một chút tỉnh táo, một chút thư thái.
          </h1>
          <p className="mt-5 max-w-xl leading-7 text-[#69746b]">
            Đăng nhập để tiếp tục, hoặc xem thực đơn và tìm món bạn yêu thích.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                setLoginError(null);
                setLoginNotice(null);
                setPendingOrderAction(null);
                setAuthReturnScreen('welcome');
                setScreen('login');
              }}
              className="rounded-xl bg-[#304b39] px-6 py-3.5 font-semibold text-white transition hover:bg-[#243b2c]"
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={openMenu}
              className="rounded-xl border border-[#d8dfd6] px-6 py-3.5 font-semibold text-[#304b39] transition hover:bg-[#f4f7f2]"
            >
              Xem thực đơn
            </button>
            <button
              type="button"
              onClick={() => {
                setRegisterError(null);
                setPendingOrderAction(null);
                setAuthReturnScreen('welcome');
                setScreen('register');
              }}
              className="rounded-xl border border-[#d8dfd6] px-6 py-3.5 font-semibold text-[#304b39] transition hover:bg-[#f4f7f2]"
            >
              Tạo tài khoản
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (screen === 'login') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f4ed] px-5 py-12 text-[#26352c]">
        <section className="w-full max-w-md rounded-[2rem] border border-[#e8e1d3] bg-white p-7 shadow-[0_24px_80px_rgba(47,57,45,0.10)] sm:p-10">
          <button
            type="button"
            onClick={returnFromAuth}
            className="mb-8 text-sm font-semibold text-[#647268] hover:text-[#304b39]"
          >
            ← Quay lại
          </button>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#9a6d3e]">
            Chào mừng trở lại
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Đăng nhập BrewLite</h1>
          {loginNotice && (
            <p
              role="status"
              className="mt-5 rounded-xl bg-[#edf2e9] px-4 py-3 text-sm text-[#405d47]"
            >
              {loginNotice}
            </p>
          )}
          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            <label className="block text-sm font-medium text-[#46544a]">
              Email
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[#dce2da] bg-white px-4 py-3 text-base outline-none transition placeholder:text-[#a1aaa2] focus:border-[#59775e] focus:ring-4 focus:ring-[#59775e]/10"
                placeholder="ban@example.com"
              />
            </label>
            <label className="block text-sm font-medium text-[#46544a]">
              Mật khẩu
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[#dce2da] bg-white px-4 py-3 text-base outline-none transition placeholder:text-[#a1aaa2] focus:border-[#59775e] focus:ring-4 focus:ring-[#59775e]/10"
                placeholder="Nhập mật khẩu"
              />
            </label>
            {loginError && (
              <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {loginError}
              </p>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-[#304b39] px-5 py-3.5 font-semibold text-white transition hover:bg-[#243b2c] disabled:cursor-wait disabled:opacity-60"
            >
              {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>
          <button
            type="button"
            onClick={openMenu}
            className="mt-5 w-full text-center text-sm font-medium text-[#647268] hover:text-[#304b39]"
          >
            Tiếp tục xem thực đơn
          </button>
          <button
            type="button"
            onClick={() => {
              setRegisterError(null);
              setScreen('register');
            }}
            className="mt-3 w-full text-center text-sm font-semibold text-[#405d47] hover:text-[#243b2c]"
          >
            Chưa có tài khoản? Đăng ký
          </button>
        </section>
      </main>
    );
  }

  if (screen === 'register') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f4ed] px-5 py-12 text-[#26352c]">
        <section className="w-full max-w-md rounded-[2rem] border border-[#e8e1d3] bg-white p-7 shadow-[0_24px_80px_rgba(47,57,45,0.10)] sm:p-10">
          <button
            type="button"
            onClick={returnFromAuth}
            className="mb-8 text-sm font-semibold text-[#647268] hover:text-[#304b39]"
          >
            ← Quay lại
          </button>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#9a6d3e]">
            Tham gia BrewLite
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Tạo tài khoản</h1>
          <p className="mt-2 text-sm leading-6 text-[#69746b]">
            Tạo tài khoản khách hàng để đăng nhập và tiếp tục.
          </p>
          <form onSubmit={handleRegister} className="mt-7 space-y-4">
            <label className="block text-sm font-medium text-[#46544a]">
              Họ và tên
              <input
                type="text"
                autoComplete="name"
                minLength={2}
                required
                value={registerFullName}
                onChange={(event) => setRegisterFullName(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[#dce2da] px-4 py-3 outline-none transition focus:border-[#59775e] focus:ring-4 focus:ring-[#59775e]/10"
                placeholder="Nguyễn Văn A"
              />
            </label>
            <label className="block text-sm font-medium text-[#46544a]">
              Email
              <input
                type="email"
                autoComplete="email"
                required
                value={registerEmail}
                onChange={(event) => setRegisterEmail(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[#dce2da] px-4 py-3 outline-none transition focus:border-[#59775e] focus:ring-4 focus:ring-[#59775e]/10"
                placeholder="ban@example.com"
              />
            </label>
            <label className="block text-sm font-medium text-[#46544a]">
              Mật khẩu (ít nhất 8 ký tự)
              <input
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={registerPassword}
                onChange={(event) => setRegisterPassword(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[#dce2da] px-4 py-3 outline-none transition focus:border-[#59775e] focus:ring-4 focus:ring-[#59775e]/10"
                placeholder="Tạo mật khẩu"
              />
            </label>
            <label className="block text-sm font-medium text-[#46544a]">
              Số điện thoại <span className="font-normal text-[#818a81]">(không bắt buộc)</span>
              <input
                type="tel"
                autoComplete="tel"
                value={registerPhone}
                onChange={(event) => setRegisterPhone(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[#dce2da] px-4 py-3 outline-none transition focus:border-[#59775e] focus:ring-4 focus:ring-[#59775e]/10"
                placeholder="0901234567"
              />
            </label>
            {registerError && (
              <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {registerError}
              </p>
            )}
            <button
              type="submit"
              disabled={isRegistering}
              className="w-full rounded-xl bg-[#304b39] px-5 py-3.5 font-semibold text-white transition hover:bg-[#243b2c] disabled:cursor-wait disabled:opacity-60"
            >
              {isRegistering ? 'Đang tạo tài khoản...' : 'Đăng ký'}
            </button>
          </form>
          <button
            type="button"
            onClick={() => {
              setLoginError(null);
              setScreen('login');
            }}
            className="mt-5 w-full text-center text-sm font-medium text-[#647268] hover:text-[#304b39]"
          >
            Đã có tài khoản? Đăng nhập
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f4ed] text-[#26352c]">
      <header className="border-b border-[#e7e2d7] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <div>
            <p className="text-sm font-semibold tracking-wide text-[#59775e]">BREWLITE</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Thực đơn hôm nay</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-[#edf2e9] px-4 py-2 text-sm font-semibold text-[#405d47]">
              Giỏ hàng · {cartCount}
            </span>
            <button
              type="button"
              onClick={() => {
                setPendingOrderAction(null);
                setConfigProduct(null);
                setScreen('welcome');
              }}
              className="hidden text-sm font-medium text-[#647268] hover:text-[#304b39] sm:block"
            >
              Trang chủ
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:py-12">
        <section>
          <div className="mb-7">
            <p className="text-sm leading-6 text-[#69746b]">
              Chọn món yêu thích hoặc tìm nhanh theo mã món.
            </p>
            <label className="mt-5 flex max-w-2xl items-center gap-3 rounded-2xl border border-[#dce2da] bg-white px-4 py-3 shadow-sm focus-within:border-[#59775e] focus-within:ring-4 focus-within:ring-[#59775e]/10">
              <span aria-hidden="true" className="text-lg text-[#768279]">
                ⌕
              </span>
              <input
                type="search"
                value={searchId}
                onChange={(event) => setSearchId(event.target.value)}
                placeholder="Tìm theo ID món..."
                aria-label="Tìm món theo ID"
                className="w-full bg-transparent text-sm outline-none placeholder:text-[#a1aaa2]"
              />
            </label>
          </div>

          {loadingMenu ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-48 animate-pulse rounded-2xl border border-[#e8e1d3] bg-white"
                />
              ))}
            </div>
          ) : menuError ? (
            <div className="rounded-2xl border border-red-100 bg-white p-6">
              <p role="alert" className="font-medium text-red-700">
                {menuError}
              </p>
              <button
                type="button"
                onClick={() => void loadMenu(accessToken)}
                className="mt-4 rounded-lg bg-[#304b39] px-4 py-2 text-sm font-semibold text-white hover:bg-[#243b2c]"
              >
                Thử tải lại
              </button>
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className="rounded-2xl border border-[#e8e1d3] bg-white px-6 py-12 text-center">
              <p className="font-medium text-[#46544a]">
                {products.length === 0
                  ? 'Thực đơn hiện chưa có món nào.'
                  : 'Không tìm thấy món có ID phù hợp.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {visibleProducts.map((product) => {
                const isAvailable =
                  product.status === 'AVAILABLE' && product.stockQuantity > 0;

                return (
                  <article
                    key={product.id}
                    className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[#e8e1d3] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        width={640}
                        height={360}
                        unoptimized
                        className="h-48 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-48 items-center justify-center bg-[#edf2e9] text-sm font-medium text-[#718074]">
                        Chưa có hình món
                      </div>
                    )}
                    <div className="flex flex-1 flex-col justify-between p-5">
                      <div>
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="text-lg font-semibold">{product.name}</h2>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            isAvailable
                              ? 'bg-[#edf2e9] text-[#405d47]'
                              : 'bg-[#f4eeee] text-[#8b5a53]'
                          }`}
                        >
                          {isAvailable ? 'Còn món' : 'Tạm hết'}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-[#9a6d3e]">
                        {product.price.toLocaleString('vi-VN')} đ
                      </p>
                      <p className="mt-3 break-all font-mono text-xs text-[#818a81]">
                        ID: {product.id}
                      </p>
                      </div>
                    <div className="mt-5 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => openProductOptions(product, 'buyNow')}
                        className="rounded-xl border border-[#dce2da] px-3 py-2.5 text-sm font-semibold text-[#405d47] transition hover:bg-[#f4f7f2] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Mua ngay
                      </button>
                      <button
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => openProductOptions(product, 'cart')}
                        className="rounded-xl bg-[#304b39] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#243b2c] disabled:cursor-not-allowed disabled:bg-[#d9ded8] disabled:text-[#788078]"
                      >
                        Thêm vào giỏ
                      </button>
                    </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside className="h-fit rounded-2xl border border-[#e8e1d3] bg-white p-6 shadow-sm lg:sticky lg:top-8">
          <section id="cart" aria-labelledby="cart-heading">
            <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[#59775e]">
              Đơn đang chọn
            </p>
            <h2 id="cart-heading" className="mt-2 text-xl font-semibold">
              Giỏ hàng · {cartCount}
            </h2>
            {cartNotice && (
              <p role="status" className="mt-3 rounded-xl bg-[#edf2e9] px-3 py-2 text-sm text-[#405d47]">
                {cartNotice}
              </p>
            )}
            {cartItems.length === 0 ? (
              <p className="mt-3 text-sm text-[#69746b]">Giỏ hàng đang trống.</p>
            ) : (
              <>
                <ul className="mt-4 divide-y divide-[#edf0eb]">
                  {cartItems.map((item) => (
                    <li key={item.id} className="py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{item.name}</p>
                          <p className="mt-1 text-xs leading-5 text-[#69746b]">
                            Size {item.selectedSize ?? 'M'} · Đường{' '}
                            {item.sugarLevel ?? '100%'} · Đá{' '}
                            {item.iceLevel ?? '100%'}
                            {(item.selectedToppings ?? []).length > 0 &&
                              ` · ${item.selectedToppings?.join(', ')}`}
                          </p>
                          <p className="mt-1 text-sm text-[#69746b]">
                            {item.price.toLocaleString('vi-VN')} đ / món
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCartItem(item.id)}
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
                              updateCartQuantity(item.id, item.quantity - 1)
                            }
                            className="h-8 w-8 rounded-full border border-[#dce2da] font-semibold"
                            aria-label={`Giảm số lượng ${item.name}`}
                          >
                            −
                          </button>
                          <span aria-label="Số lượng">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() =>
                              updateCartQuantity(item.id, item.quantity + 1)
                            }
                            className="h-8 w-8 rounded-full border border-[#dce2da] font-semibold"
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
                  <span>{cartTotal.toLocaleString('vi-VN')} đ</span>
                </div>
                <label className="mt-4 block text-sm font-medium text-[#46544a]">
                  Ghi chú đơn hàng
                  <textarea
                    value={cartOrderNote}
                    onChange={(event) => setCartOrderNote(event.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="Ví dụ: ít ngọt, nhận tại quầy..."
                    className="mt-2 w-full resize-y rounded-xl border border-[#dce2da] px-3 py-2.5 outline-none transition focus:border-[#59775e] focus:ring-4 focus:ring-[#59775e]/10"
                  />
                </label>
                <p className="mt-2 text-xs text-[#818a81]">
                  Tùy chọn size, đường, đá và topping hiện chưa tính phụ thu.
                </p>
                {orderError && (
                  <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
                    {orderError}
                  </p>
                )}
                <button
                  type="button"
                  disabled={isCreatingOrder}
                  onClick={() => checkoutCart()}
                  className="mt-4 w-full rounded-xl bg-[#304b39] px-4 py-3 font-semibold text-white transition hover:bg-[#243b2c] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCreatingOrder
                    ? 'Đang đặt hàng...'
                    : user
                      ? 'Đặt hàng từ giỏ'
                      : 'Đăng nhập để đặt hàng'}
                </button>
              </>
            )}
          </section>

          <div className="my-6 border-t border-[#edf0eb]" />
          {user ? (
            <>
              <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[#59775e]">
                Đã đăng nhập
              </p>
              <h2 className="mt-3 text-xl font-semibold">{user.fullName}</h2>
              <p className="mt-1 break-all text-sm text-[#69746b]">{user.email}</p>
              <button
                type="button"
                onClick={logout}
                className="mt-6 w-full rounded-xl border border-[#dce2da] px-4 py-3 text-sm font-semibold text-[#405d47] transition hover:bg-[#f4f7f2]"
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[#9a6d3e]">
                Thành viên BrewLite
              </p>
              <h2 className="mt-2 text-xl font-semibold">Đăng nhập</h2>
              <p className="mt-2 text-sm leading-6 text-[#69746b]">
                Bạn vẫn có thể xem thực đơn. Đăng nhập ngay tại đây khi sẵn sàng.
              </p>
              <button
                type="button"
                onClick={() => {
                  setRegisterError(null);
                  setAuthReturnScreen('menu');
                  setScreen('register');
                }}
                className="mt-4 text-sm font-semibold text-[#405d47] hover:text-[#243b2c]"
              >
                Tạo tài khoản mới
              </button>
              <form onSubmit={handleLogin} className="mt-5 space-y-4">
                <label className="block text-sm font-medium text-[#46544a]">
                  Email
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#dce2da] px-3.5 py-3 outline-none transition focus:border-[#59775e] focus:ring-4 focus:ring-[#59775e]/10"
                    placeholder="ban@example.com"
                  />
                </label>
                <label className="block text-sm font-medium text-[#46544a]">
                  Mật khẩu
                  <input
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#dce2da] px-3.5 py-3 outline-none transition focus:border-[#59775e] focus:ring-4 focus:ring-[#59775e]/10"
                    placeholder="Nhập mật khẩu"
                  />
                </label>
                {loginError && (
                  <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-3 text-sm text-red-700">
                    {loginError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-[#304b39] px-4 py-3 font-semibold text-white transition hover:bg-[#243b2c] disabled:cursor-wait disabled:opacity-60"
                >
                  {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </button>
              </form>
            </>
          )}
        </aside>
      </div>

      {configProduct && (
        <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-options-heading"
            className="my-auto w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[#59775e]">
                  Tùy chỉnh món
                </p>
                <h2 id="product-options-heading" className="mt-2 text-2xl font-semibold">
                  {configProduct.name}
                </h2>
                <p className="mt-1 text-sm text-[#69746b]">
                  {configProduct.price.toLocaleString('vi-VN')} đ · Chưa tính phụ thu
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfigProduct(null)}
                className="rounded-full px-3 py-1 text-xl text-[#69746b] hover:bg-[#f4f7f2]"
                aria-label="Đóng tùy chỉnh món"
              >
                ×
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-[#46544a]">
                Kích cỡ
                <select
                  value={selectedSize}
                  onChange={(event) => setSelectedSize(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#dce2da] bg-white px-3 py-3"
                >
                  {['S', 'M', 'L'].map((size) => (
                    <option key={size} value={size}>Size {size}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-[#46544a]">
                Số lượng
                <input
                  type="number"
                  min={1}
                  max={configProduct.stockQuantity}
                  value={configuredQuantity}
                  onChange={(event) =>
                    setConfiguredQuantity(
                      Math.max(1, Number.parseInt(event.target.value, 10) || 1),
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-[#dce2da] px-3 py-3"
                />
              </label>
              <label className="text-sm font-medium text-[#46544a]">
                Lượng đường
                <select
                  value={sugarLevel}
                  onChange={(event) => setSugarLevel(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#dce2da] bg-white px-3 py-3"
                >
                  {['0%', '50%', '100%'].map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-[#46544a]">
                Lượng đá
                <select
                  value={iceLevel}
                  onChange={(event) => setIceLevel(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#dce2da] bg-white px-3 py-3"
                >
                  {['0%', '50%', '100%'].map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </label>
            </div>

            {configIntent === 'buyNow' && (
              <label className="mt-5 block text-sm font-medium text-[#46544a]">
                Ghi chú đơn hàng
                <textarea
                  value={directOrderNote}
                  onChange={(event) => setDirectOrderNote(event.target.value)}
                  maxLength={500}
                  rows={2}
                  placeholder="Ví dụ: ít ngọt, nhận tại quầy..."
                  className="mt-2 w-full resize-y rounded-xl border border-[#dce2da] px-3 py-2.5 outline-none transition focus:border-[#59775e] focus:ring-4 focus:ring-[#59775e]/10"
                />
              </label>
            )}

            <fieldset className="mt-5">
              <legend className="text-sm font-medium text-[#46544a]">
                Topping (không phụ thu)
              </legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {toppingOptions.map((topping) => {
                  const checked = selectedToppings.includes(topping);
                  return (
                    <label
                      key={topping}
                      className={`cursor-pointer rounded-full border px-4 py-2 text-sm ${
                        checked
                          ? 'border-[#59775e] bg-[#edf2e9] text-[#304b39]'
                          : 'border-[#dce2da] text-[#69746b]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelectedToppings((current) =>
                            checked
                              ? current.filter((value) => value !== topping)
                              : [...current, topping],
                          )
                        }
                        className="sr-only"
                      />
                      {topping}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {orderError && (
              <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {orderError}
              </p>
            )}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={isCreatingOrder}
                onClick={confirmProductOptions}
                className="rounded-xl bg-[#304b39] px-4 py-3 font-semibold text-white transition hover:bg-[#243b2c] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreatingOrder
                  ? 'Đang đặt...'
                  : configIntent === 'buyNow'
                    ? 'Xác nhận mua ngay'
                    : 'Thêm vào giỏ'}
              </button>
              <button
                type="button"
                disabled={isCreatingOrder}
                onClick={
                  configIntent === 'buyNow'
                    ? addConfiguredProductToCart
                    : orderConfiguredProductNow
                }
                className="rounded-xl border border-[#dce2da] px-4 py-3 font-semibold text-[#405d47] transition hover:bg-[#f4f7f2] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {configIntent === 'buyNow' ? 'Thêm vào giỏ' : 'Mua ngay'}
              </button>
            </div>
          </section>
        </div>
      )}

      {orderConfirmation && (
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
            <h2 id="order-confirmation-heading" className="mt-2 text-2xl font-semibold">
              Mã đơn {orderConfirmation.orderCode}
            </h2>
            <p className="mt-2 text-sm text-[#69746b]">
              Trạng thái: {orderConfirmation.status}
            </p>
            {orderConfirmation.note && (
              <p className="mt-3 rounded-xl bg-[#f7f4ed] px-4 py-3 text-sm text-[#46544a]">
                Ghi chú: {orderConfirmation.note}
              </p>
            )}
            <ul className="mt-5 divide-y divide-[#edf0eb]">
              {orderConfirmation.orderItems.map((item, index) => {
                let toppings = item.selectedToppings ?? '';
                if (toppings) {
                  try {
                    const parsed: unknown = JSON.parse(toppings);
                    if (
                      Array.isArray(parsed) &&
                      parsed.every((value) => typeof value === 'string')
                    ) {
                      toppings = parsed.join(', ');
                    }
                  } catch {
                    toppings = item.selectedToppings ?? '';
                  }
                }

                return (
                  <li key={`${item.productName}-${index}`} className="py-4">
                    <div className="flex justify-between gap-3">
                      <span className="font-semibold">
                        {item.productName} × {item.quantity}
                      </span>
                      <span>{item.subtotal.toLocaleString('vi-VN')} đ</span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-[#69746b]">
                      Size {item.selectedSize ?? 'M'} · Đường{' '}
                      {item.sugarLevel ?? '100%'} · Đá {item.iceLevel ?? '100%'}
                      {toppings ? ` · Topping: ${toppings}` : ''}
                    </p>
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 flex justify-between border-t border-[#edf0eb] pt-4 text-lg font-semibold">
              <span>Tổng cộng</span>
              <span>{orderConfirmation.totalAmount.toLocaleString('vi-VN')} đ</span>
            </div>
            <button
              type="button"
              onClick={() => setOrderConfirmation(null)}
              className="mt-6 w-full rounded-xl bg-[#304b39] px-4 py-3 font-semibold text-white transition hover:bg-[#243b2c]"
            >
              Đóng
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
