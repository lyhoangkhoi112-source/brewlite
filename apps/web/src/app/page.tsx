'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useCartStore } from '../stores/useCartStore';
import { AuthScreens } from './components/AuthScreens';
import { ChangePasswordDialog } from './components/ChangePasswordDialog';
import { CartDrawer } from './components/CartDrawer';
import { DeliveryFields } from './components/DeliveryFields';
import { GuestCheckoutDialog } from './components/GuestCheckoutDialog';
import { MenuHeader } from './components/MenuHeader';
import { LoyaltyRedemptionField } from './components/LoyaltyRedemptionField';
import { MockPaymentDialog } from './components/MockPaymentDialog';
import { OrderConfirmationDialog } from './components/OrderConfirmationDialog';
import { OrderHistoryDialog } from './components/OrderHistoryDialog';
import { ProductOptionsDialog } from './components/ProductOptionsDialog';
import { ProductCatalog } from './components/ProductCatalog';
import {
  apiUrl,
  getGuestOrderTokens,
  guestOrderTokensKey,
  isRecord,
  parseLoginResult,
  parseLoyaltySummary,
  parseOrderConfirmation,
  parseOrderHistory,
  parseProducts,
  readErrorMessage,
} from './api-helpers';
import type {
  AuthenticatedUser,
  LoyaltySummary,
  MockPaymentOutcome,
  OrderConfirmation,
  OrderHistoryEntry,
  OrderItemInput,
  OrderIntent,
  PaymentMethod,
  PendingOrderAction,
  Product,
  ProductMenuCategory,
  Screen,
} from './types';
import { productCategories } from './types';

const guestCheckoutPreferenceKey = 'brewlite-guest-checkout';
const customerSessionKey = 'brewlite-customer-session';

export default function MenuPage() {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [sessionReady, setSessionReady] = useState(false);
  const sessionRestoreStarted = useRef(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [searchName, setSearchName] = useState('');
  const [selectedMenuCategory, setSelectedMenuCategory] =
    useState<ProductMenuCategory>('ALL');
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
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
  const [configuredQuantity, setConfiguredQuantity] = useState(1);
  const [directOrderNote, setDirectOrderNote] = useState('');
  const [cartOrderNote, setCartOrderNote] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('MOMO');
  const [deliveryValidationAttempted, setDeliveryValidationAttempted] =
    useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [loginChoiceOpen, setLoginChoiceOpen] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [cartNotice, setCartNotice] = useState<string | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [orderConfirmation, setOrderConfirmation] =
    useState<OrderConfirmation | null>(null);
  const [pendingPaymentOrder, setPendingPaymentOrder] = useState<{
    order: OrderConfirmation;
    guestAccessToken: string | null;
  } | null>(null);
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [myOrders, setMyOrders] = useState<OrderHistoryEntry[]>([]);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loyalty, setLoyalty] = useState<LoyaltySummary | null>(null);
  const [loyaltyError, setLoyaltyError] = useState<string | null>(null);
  const [loadingLoyalty, setLoadingLoyalty] = useState(false);
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(
    null,
  );
  const [retryingPaymentOrderId, setRetryingPaymentOrderId] = useState<
    string | null
  >(null);

  const addItem = useCartStore((state) => state.addItem);
  const updateCartOptions = useCartStore((state) => state.updateOptions);
  const updateCartQuantity = useCartStore((state) => state.updateQuantity);
  const removeCartItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const cartItems = useCartStore((state) => state.items);
  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );

  const loadMenu = useCallback(async (token?: string | null) => {
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
        error instanceof Error
          ? error.message
          : 'Không thể kết nối đến máy chủ.',
      );
    } finally {
      setLoadingMenu(false);
    }
  }, []);

  function showProductOptions(product: Product, intent: OrderIntent) {
    setConfigProduct(product);
    setConfigIntent(intent);
    setSelectedSize('M');
    setSugarLevel('100%');
    setIceLevel('100%');
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
      if (sessionStorage.getItem(guestCheckoutPreferenceKey) === 'true') {
        handleProductAction(product, intent);
        return;
      }

      setPendingOrderAction({ type: 'configureProduct', product, intent });
      setLoginChoiceOpen(true);
      return;
    }

    void loadLoyalty();
    handleProductAction(product, intent);
  }

  function openCart() {
    setCartOpen(true);
    if (user) void loadLoyalty();
  }

  function getRedeemablePoints(subtotal: number) {
    if (!user || !loyalty) return 0;
    return Math.min(
      redeemPoints,
      loyalty.balance,
      Math.floor((subtotal * 0.2) / 3_000),
    );
  }

  function continueAsGuest() {
    const action = pendingOrderAction;
    sessionStorage.setItem(guestCheckoutPreferenceKey, 'true');
    setPendingOrderAction(null);
    setLoginChoiceOpen(false);
    if (action?.type === 'configureProduct') {
      handleProductAction(action.product, action.intent);
    }
  }

  function loginToContinue() {
    const action = pendingOrderAction;
    setLoginChoiceOpen(false);
    if (action) requestLogin(action);
  }

  function addStandaloneProductToCart(product: Product) {
    addItem({
      id: JSON.stringify([product.id]),
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      category: product.category ?? undefined,
    });
    setCartNotice(`${product.name} đã được thêm vào giỏ hàng.`);
  }

  function handleProductAction(product: Product, intent: OrderIntent) {
    if (product.category === 'TOPPING' && intent === 'cart') {
      addStandaloneProductToCart(product);
      return;
    }
    showProductOptions(product, intent);
  }

  function addConfiguredProductToCart() {
    if (!configProduct) return;

    addItem({
      id:
        configProduct.category === 'TOPPING'
          ? JSON.stringify([configProduct.id])
          : JSON.stringify([
              configProduct.id,
              selectedSize,
              sugarLevel,
              iceLevel,
            ]),
      productId: configProduct.id,
      name: configProduct.name,
      price: configProduct.price,
      quantity: configuredQuantity,
      category: configProduct.category ?? undefined,
      ...(configProduct.category === 'TOPPING'
        ? {}
        : { selectedSize, sugarLevel, iceLevel }),
      selectedToppings: [],
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
          selectedToppings: [],
        },
      ],
      false,
      directOrderNote,
      getRedeemablePoints(configProduct.price * configuredQuantity),
    );
  }

  function confirmProductOptions() {
    if (configIntent === 'buyNow') {
      orderConfiguredProductNow();
    } else {
      addConfiguredProductToCart();
    }
  }

  async function placeOrder(
    items: OrderItemInput[],
    clearCartAfterSuccess = false,
    note = '',
    pointsToRedeem = 0,
  ) {
    setDeliveryValidationAttempted(true);
    if (
      !deliveryAddress.trim() ||
      !/\d/.test(deliveryAddress) ||
      !deliveryPhone.trim()
    ) {
      return;
    }

    setIsCreatingOrder(true);
    setOrderError(null);
    setDeliveryValidationAttempted(false);
    setOrderConfirmation(null);
    setPendingPaymentOrder(null);
    setPaymentError(null);

    try {
      const response = await fetch(`${apiUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          shippingAddress: deliveryAddress.trim(),
          contactPhone: deliveryPhone.trim(),
          items,
          note: note.trim() || undefined,
          ...(user && pointsToRedeem > 0
            ? { redeemPoints: pointsToRedeem }
            : {}),
        }),
      });
      const payload: unknown = await response.json();

      if (!response.ok) {
        throw new Error(readErrorMessage(payload, 'Không thể tạo đơn hàng.'));
      }

      const confirmation = parseOrderConfirmation(payload);
      setOrderConfirmation(confirmation);
      if (user && pointsToRedeem > 0) {
        setRedeemPoints(0);
        void loadLoyalty();
      }

      let guestAccessToken: string | null = null;
      if (!user) {
        if (
          !isRecord(payload) ||
          typeof payload.guestAccessToken !== 'string'
        ) {
          throw new Error(
            'Máy chủ không trả về mã truy cập đơn hàng của khách.',
          );
        }
        guestAccessToken = payload.guestAccessToken;
        const tokens = getGuestOrderTokens();
        tokens.push(guestAccessToken);
        window.localStorage.setItem(
          guestOrderTokensKey,
          JSON.stringify(tokens),
        );
      }

      const orderedQuantities = new Map<string, number>();
      for (const item of items) {
        orderedQuantities.set(
          item.productId,
          (orderedQuantities.get(item.productId) ?? 0) + item.quantity,
        );
      }
      setProducts((currentProducts) =>
        currentProducts.map((product) => {
          const orderedQuantity = orderedQuantities.get(product.id);
          if (orderedQuantity === undefined) return product;

          const stockQuantity = Math.max(
            0,
            product.stockQuantity - orderedQuantity,
          );
          return {
            ...product,
            stockQuantity,
            status: stockQuantity === 0 ? 'OUT_OF_STOCK' : product.status,
          };
        }),
      );
      const displayOrder = {
        ...confirmation,
        orderItems: confirmation.orderItems.map((item) => ({
          ...item,
          isStandaloneTopping:
            products.find((product) => product.id === item.productId)
              ?.category === 'TOPPING',
        })),
      };
      if (displayOrder.payments.length > 1) {
        throw new Error('Máy chủ không tạo được giao dịch thanh toán.');
      }
      if (displayOrder.payments.length === 1) {
        setPendingPaymentOrder({ order: displayOrder, guestAccessToken });
      } else {
        setOrderConfirmation(displayOrder);
      }
      setConfigProduct(null);
      setCartOpen(false);
      if (clearCartAfterSuccess) {
        clearCart();
        setCartOrderNote('');
      } else {
        setDirectOrderNote('');
      }
    } catch (error) {
      setOrderError(
        error instanceof Error
          ? error.message
          : 'Không thể kết nối đến máy chủ.',
      );
    } finally {
      setIsCreatingOrder(false);
    }
  }

  async function simulateMockPayment(outcome: MockPaymentOutcome) {
    const pending = pendingPaymentOrder;
    const payment = pending?.order.payments.find(
      (candidate) => candidate.status === 'PENDING',
    );
    if (!pending || !payment) return;

    setIsSimulatingPayment(true);
    setPaymentError(null);
    try {
      const response = await fetch(
        `${apiUrl}/orders/${encodeURIComponent(pending.order.id)}/payments/${encodeURIComponent(payment.id)}/mock`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({
            outcome,
            paymentMethod,
            ...(pending.guestAccessToken
              ? { guestAccessToken: pending.guestAccessToken }
              : {}),
          }),
        },
      );
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          readErrorMessage(payload, 'Không thể xử lý giao dịch mô phỏng.'),
        );
      }

      const updatedOrder = parseOrderConfirmation(payload);
      if (updatedOrder.status !== 'CONFIRMED') {
        const restoredQuantities = new Map<string, number>();
        for (const item of updatedOrder.orderItems) {
          restoredQuantities.set(
            item.productId,
            (restoredQuantities.get(item.productId) ?? 0) + item.quantity,
          );
        }
        setProducts((current) =>
          current.map((product) => {
            const restored = restoredQuantities.get(product.id);
            if (restored === undefined) return product;
            const stockQuantity = product.stockQuantity + restored;
            return {
              ...product,
              stockQuantity,
              status: stockQuantity > 0 ? 'AVAILABLE' : product.status,
            };
          }),
        );
      }

      setPendingPaymentOrder(null);
      setOrderConfirmation({
        ...updatedOrder,
        orderItems: updatedOrder.orderItems.map((item) => ({
          ...item,
          isStandaloneTopping:
            products.find((product) => product.id === item.productId)
              ?.category === 'TOPPING',
        })),
      });
      if (outcome === 'SUCCESS' && user) void loadLoyalty();
    } catch (error) {
      setPaymentError(
        error instanceof Error
          ? error.message
          : 'Không thể kết nối đến máy chủ.',
      );
    } finally {
      setIsSimulatingPayment(false);
    }
  }

  function checkoutCart() {
    if (cartItems.length === 0) {
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
      cartOrderNote,
      getRedeemablePoints(cartTotal),
    );
  }

  const activeTrackedOrderId =
    orderConfirmation?.id ?? pendingPaymentOrder?.order.id;
  const syncTrackedOrderStatus = useCallback(
    (orderHistory: OrderHistoryEntry[]) => {
      if (pendingPaymentOrder) {
        const matchingOrder = orderHistory.find(
          (order) => order.id === pendingPaymentOrder.order.id,
        );
        if (!matchingOrder || matchingOrder.status === 'PENDING') return;

        setPendingPaymentOrder((current) =>
          current?.order.id === matchingOrder.id ? null : current,
        );
        setOrderConfirmation((current) => ({
          ...(current?.id === matchingOrder.id
            ? current
            : pendingPaymentOrder.order),
          status: matchingOrder.status,
          rejectionReason: matchingOrder.rejectionReason,
        }));
        void loadMenu(accessToken);
        return;
      }

      if (orderConfirmation) {
        const matchingOrder = orderHistory.find(
          (order) => order.id === orderConfirmation.id,
        );
        if (
          matchingOrder &&
          (matchingOrder.status !== orderConfirmation.status ||
            matchingOrder.rejectionReason !==
              orderConfirmation.rejectionReason)
        ) {
          setOrderConfirmation((current) =>
            current?.id === matchingOrder.id
              ? {
                  ...current,
                  status: matchingOrder.status,
                  rejectionReason: matchingOrder.rejectionReason,
                }
              : current,
          );
        }
        return;
      }

    },
    [accessToken, loadMenu, orderConfirmation, pendingPaymentOrder],
  );

  const loadOrderHistory = useCallback(async (showLoading = true) => {
    if (showLoading) setLoadingOrders(true);
    setOrdersError(null);
    try {
      if (user && accessToken) {
        const response = await fetch(`${apiUrl}/orders/mine`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const payload: unknown = await response.json();
        if (!response.ok) {
          throw new Error(readErrorMessage(payload, 'Không thể tải đơn hàng.'));
        }
        const orderHistory = parseOrderHistory(payload);
        setMyOrders(orderHistory);
        syncTrackedOrderStatus(orderHistory);
        return;
      }

      const tokens = getGuestOrderTokens();
      const orderResults: OrderHistoryEntry[] = [];
      for (let index = 0; index < tokens.length; index += 100) {
        const response = await fetch(`${apiUrl}/orders/guest/history`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessTokens: tokens.slice(index, index + 100),
          }),
        });
        const payload: unknown = await response.json();
        if (!response.ok) {
          throw new Error(readErrorMessage(payload, 'Không thể tải đơn hàng.'));
        }
        orderResults.push(...parseOrderHistory(payload));
      }
      orderResults.sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      );
      setMyOrders(orderResults);
      syncTrackedOrderStatus(orderResults);
    } catch (error) {
      setOrdersError(
        error instanceof Error
          ? error.message
          : 'Không thể kết nối đến máy chủ.',
      );
    } finally {
      if (showLoading) setLoadingOrders(false);
    }
  }, [accessToken, syncTrackedOrderStatus, user]);

  useEffect(() => {
    if (!ordersOpen && !activeTrackedOrderId) return;
    const intervalId = window.setInterval(() => {
      void loadOrderHistory(false);
    }, 5000);
    return () => window.clearInterval(intervalId);
  }, [activeTrackedOrderId, loadOrderHistory, ordersOpen]);

  const loadLoyalty = useCallback(async (
    token = accessToken,
    isAuthenticated = Boolean(user),
  ) => {
    if (!isAuthenticated || !token) return;

    setLoadingLoyalty(true);
    setLoyaltyError(null);
    try {
      const response = await fetch(`${apiUrl}/orders/loyalty/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        throw new Error(
          readErrorMessage(payload, 'Không thể tải điểm khách hàng.'),
        );
      }
      setLoyalty(parseLoyaltySummary(payload));
    } catch (error) {
      setLoyaltyError(
        error instanceof Error
          ? error.message
          : 'Không thể kết nối đến máy chủ.',
      );
    } finally {
      setLoadingLoyalty(false);
    }
  }, [accessToken, user]);

  useEffect(() => {
    if (sessionRestoreStarted.current) return;
    const frame = window.requestAnimationFrame(() => {
      sessionRestoreStarted.current = true;
      try {
        const savedSession = window.sessionStorage.getItem(customerSessionKey);
        if (savedSession) {
          const parsed: unknown = JSON.parse(savedSession);
          const restoredSession = parseLoginResult(parsed);
          if (restoredSession.user.role !== 'CUSTOMER') {
            throw new Error('Phiên đăng nhập khách hàng không hợp lệ.');
          }
          setAccessToken(restoredSession.accessToken);
          setUser(restoredSession.user);
          setDeliveryPhone(restoredSession.user.phone ?? '');
          setScreen('menu');
          void loadMenu(restoredSession.accessToken);
          void loadLoyalty(restoredSession.accessToken, true);
        }
      } catch (error) {
        window.sessionStorage.removeItem(customerSessionKey);
        console.error('Không thể khôi phục phiên khách hàng:', error);
      } finally {
        setSessionReady(true);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [loadLoyalty, loadMenu]);

  async function cancelOrder(orderId: string) {
    if (
      !window.confirm(
        'Bạn có chắc muốn hủy đơn hàng này? Hệ thống không tự động hoàn tiền cho giao dịch đã thanh toán.',
      )
    ) {
      return;
    }

    setCancellingOrderId(orderId);
    setOrdersError(null);
    try {
      const tokens = user ? [] : getGuestOrderTokens();
      const tokenBatches = user
        ? [[]]
        : Array.from({ length: Math.ceil(tokens.length / 100) }, (_, index) =>
            tokens.slice(index * 100, (index + 1) * 100),
          );
      if (!user && tokenBatches.length === 0) {
        throw new Error(
          'Không tìm thấy mã truy cập đơn hàng trên thiết bị này.',
        );
      }

      let cancelled = false;
      for (const accessTokens of tokenBatches) {
        const response = await fetch(
          `${apiUrl}/orders/${encodeURIComponent(orderId)}/cancel`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(user && accessToken
                ? { Authorization: `Bearer ${accessToken}` }
                : {}),
            },
            body: JSON.stringify({ accessTokens }),
          },
        );
        const payload: unknown = await response.json();
        if (response.status === 404 && !user) continue;
        if (!response.ok) {
          throw new Error(readErrorMessage(payload, 'Không thể hủy đơn hàng.'));
        }
        cancelled = true;
        break;
      }

      if (!cancelled) throw new Error('Không tìm thấy đơn hàng cần hủy.');
      await loadOrderHistory();
      if (user) await loadLoyalty();
    } catch (error) {
      setOrdersError(
        error instanceof Error
          ? error.message
          : 'Không thể kết nối đến máy chủ.',
      );
    } finally {
      setCancellingOrderId(null);
    }
  }

  async function retryPayment(orderId: string) {
    setRetryingPaymentOrderId(orderId);
    setOrdersError(null);
    try {
      const tokens = user ? [] : getGuestOrderTokens();
      const guestTokens = user ? [null] : tokens;
      if (guestTokens.length === 0) {
        throw new Error(
          'Không tìm thấy mã truy cập đơn hàng trên thiết bị này.',
        );
      }

      let retriedOrder: OrderConfirmation | null = null;
      let guestAccessToken: string | null = null;
      for (const token of guestTokens) {
        const response = await fetch(
          `${apiUrl}/orders/${encodeURIComponent(orderId)}/payments/retry`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(user && accessToken
                ? { Authorization: `Bearer ${accessToken}` }
                : {}),
            },
            body: JSON.stringify({
              paymentMethod,
              ...(token ? { guestAccessToken: token } : {}),
            }),
          },
        );
        const payload: unknown = await response.json();
        if (response.status === 404 && !user) continue;
        if (!response.ok) {
          throw new Error(
            readErrorMessage(payload, 'Không thể thanh toán lại đơn hàng.'),
          );
        }
        retriedOrder = parseOrderConfirmation(payload);
        guestAccessToken = token;
        break;
      }

      if (!retriedOrder) {
        throw new Error('Không tìm thấy đơn hàng cần thanh toán lại.');
      }

      const reservedQuantities = new Map<string, number>();
      for (const item of retriedOrder.orderItems) {
        reservedQuantities.set(
          item.productId,
          (reservedQuantities.get(item.productId) ?? 0) + item.quantity,
        );
      }
      setProducts((current) =>
        current.map((product) => {
          const reserved = reservedQuantities.get(product.id);
          if (reserved === undefined) return product;
          const stockQuantity = Math.max(0, product.stockQuantity - reserved);
          return {
            ...product,
            stockQuantity,
            status: stockQuantity === 0 ? 'OUT_OF_STOCK' : product.status,
          };
        }),
      );
      setOrdersOpen(false);
      setPendingPaymentOrder({ order: retriedOrder, guestAccessToken });
    } catch (error) {
      setOrdersError(
        error instanceof Error
          ? error.message
          : 'Không thể kết nối đến máy chủ.',
      );
    } finally {
      setRetryingPaymentOrderId(null);
    }
  }

  function openOrderHistory() {
    setOrdersOpen(true);
    void loadOrderHistory();
    if (user) void loadLoyalty();
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
      if (result.user.role !== 'CUSTOMER') {
        throw new Error('Vui lòng đăng nhập bằng tài khoản khách hàng.');
      }
      window.sessionStorage.setItem(
        customerSessionKey,
        JSON.stringify(result),
      );
      setAccessToken(result.accessToken);
      setUser(result.user);
      setDeliveryPhone(result.user.phone ?? '');
      setPassword('');
      setLoginNotice(null);
      setScreen('menu');
      await loadMenu(result.accessToken);
      void loadLoyalty(result.accessToken, true);

      const nextAction = pendingOrderAction;
      setPendingOrderAction(null);
      if (nextAction?.type === 'configureProduct') {
        handleProductAction(nextAction.product, nextAction.intent);
      }
    } catch (error) {
      setLoginError(
        error instanceof Error
          ? error.message
          : 'Không thể kết nối đến máy chủ.',
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
        error instanceof Error
          ? error.message
          : 'Không thể kết nối đến máy chủ.',
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
    window.sessionStorage.removeItem(customerSessionKey);
    setAccessToken(null);
    setUser(null);
    setOrdersOpen(false);
    setMyOrders([]);
    setLoyalty(null);
    setRedeemPoints(0);
    setChangePasswordOpen(false);
    setConfigProduct(null);
    setPendingOrderAction(null);
    setScreen('menu');
  }

  const deliveryFields = (
    <DeliveryFields
      phone={deliveryPhone}
      address={deliveryAddress}
      validationAttempted={deliveryValidationAttempted}
      error={orderError}
      onPhoneChange={setDeliveryPhone}
      onAddressChange={setDeliveryAddress}
      onClearError={() => setOrderError(null)}
    />
  );

  if (!sessionReady) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f7f4ed] text-sm text-[#69746b]">
        Đang tải phiên đăng nhập...
      </main>
    );
  }

  if (screen !== 'menu') {
    return (
      <AuthScreens
        screen={screen}
        email={email}
        password={password}
        loginError={loginError}
        loginNotice={loginNotice}
        isSubmitting={isSubmitting}
        registerFullName={registerFullName}
        registerEmail={registerEmail}
        registerPassword={registerPassword}
        registerPhone={registerPhone}
        registerError={registerError}
        isRegistering={isRegistering}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onRegisterFullNameChange={setRegisterFullName}
        onRegisterEmailChange={setRegisterEmail}
        onRegisterPasswordChange={setRegisterPassword}
        onRegisterPhoneChange={setRegisterPhone}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onReturn={returnFromAuth}
        onOpenMenu={openMenu}
        onOpenLogin={() => {
          setLoginError(null);
          if (screen === 'welcome') {
            setLoginNotice(null);
            setPendingOrderAction(null);
            setAuthReturnScreen('welcome');
          }
          setScreen('login');
        }}
        onOpenRegister={() => {
          setRegisterError(null);
          if (screen === 'welcome') {
            setPendingOrderAction(null);
            setAuthReturnScreen('welcome');
          }
          setScreen('register');
        }}
      />
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f4ed] text-[#26352c]">
      <MenuHeader
        user={user}
        cartCount={cartCount}
        selectedCategoryLabel={
          selectedMenuCategory === 'ALL'
            ? 'Tất cả món'
            : selectedMenuCategory === 'UNCATEGORIZED'
              ? 'Chưa phân loại'
              : (productCategories.find(
                  ({ value }) => value === selectedMenuCategory,
                )?.label ?? 'Tất cả món')
        }
        categoryMenuOpen={categoryMenuOpen}
        onOpenOrders={openOrderHistory}
        onChangePassword={() => setChangePasswordOpen(true)}
        onOpenCart={openCart}
        onOpenCategories={() => setCategoryMenuOpen(true)}
        onLogout={logout}
        onLogin={() => {
          setAuthReturnScreen('menu');
          setLoginError(null);
          setScreen('login');
        }}
        onHome={() => {
          setPendingOrderAction(null);
          setConfigProduct(null);
          setScreen('welcome');
        }}
      />

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-8 sm:py-8 lg:py-12">
        <ProductCatalog
          products={products}
          loading={loadingMenu}
          error={menuError}
          searchName={searchName}
          selectedCategory={selectedMenuCategory}
          categoryMenuOpen={categoryMenuOpen}
          onSearchChange={setSearchName}
          onSelectCategory={setSelectedMenuCategory}
          onCloseCategoryMenu={() => setCategoryMenuOpen(false)}
          onRetry={() => void loadMenu(accessToken)}
          onBuyNow={(product) => openProductOptions(product, 'buyNow')}
          onAddToCart={(product) => openProductOptions(product, 'cart')}
        />
        <CartDrawer
          open={cartOpen}
          items={cartItems}
          count={cartCount}
          total={cartTotal}
          loyaltyRedemption={
            user ? (
              <LoyaltyRedemptionField
                balance={loyalty?.balance ?? null}
                loading={loadingLoyalty}
                subtotal={cartTotal}
                points={redeemPoints}
                onPointsChange={setRedeemPoints}
              />
            ) : null
          }
          notice={cartNotice}
          note={cartOrderNote}
          isCreatingOrder={isCreatingOrder}
          deliveryFields={deliveryFields}
          onClose={() => setCartOpen(false)}
          onNoteChange={setCartOrderNote}
          onUpdateOptions={updateCartOptions}
          onUpdateQuantity={updateCartQuantity}
          onRemove={removeCartItem}
          onCheckout={checkoutCart}
        />
      </div>

      <GuestCheckoutDialog
        open={loginChoiceOpen}
        onLogin={loginToContinue}
        onContinueAsGuest={continueAsGuest}
        onCancel={() => {
          setLoginChoiceOpen(false);
          setPendingOrderAction(null);
        }}
      />

      <ProductOptionsDialog
        product={configProduct}
        intent={configIntent}
        size={selectedSize}
        quantity={configuredQuantity}
        sugarLevel={sugarLevel}
        iceLevel={iceLevel}
        note={directOrderNote}
        isCreatingOrder={isCreatingOrder}
        deliveryFields={deliveryFields}
        loyaltyRedemption={
          user && configIntent === 'buyNow' ? (
            <LoyaltyRedemptionField
              balance={loyalty?.balance ?? null}
              loading={loadingLoyalty}
              subtotal={(configProduct?.price ?? 0) * configuredQuantity}
              points={redeemPoints}
              onPointsChange={setRedeemPoints}
            />
          ) : null
        }
        onClose={() => setConfigProduct(null)}
        onSizeChange={setSelectedSize}
        onQuantityChange={setConfiguredQuantity}
        onSugarChange={setSugarLevel}
        onIceChange={setIceLevel}
        onNoteChange={setDirectOrderNote}
        onConfirm={confirmProductOptions}
      />

      <OrderConfirmationDialog
        order={orderConfirmation}
        cancellingOrder={cancellingOrderId === orderConfirmation?.id}
        error={ordersError}
        onClose={() => setOrderConfirmation(null)}
        onCancelOrder={(orderId) => void cancelOrder(orderId)}
        onViewOrders={() => {
          setOrderConfirmation(null);
          openOrderHistory();
        }}
      />

      <MockPaymentDialog
        order={pendingPaymentOrder?.order ?? null}
        method={paymentMethod}
        isProcessing={isSimulatingPayment}
        error={paymentError}
        onMethodChange={setPaymentMethod}
        onSimulate={(outcome) => void simulateMockPayment(outcome)}
      />

      <OrderHistoryDialog
        open={ordersOpen}
        orders={myOrders}
        loyalty={user ? loyalty : null}
        loyaltyError={user ? loyaltyError : null}
        loadingLoyalty={Boolean(user) && loadingLoyalty}
        error={ordersError}
        loading={loadingOrders}
        cancellingOrderId={cancellingOrderId}
        retryingPaymentOrderId={retryingPaymentOrderId}
        onClose={() => setOrdersOpen(false)}
        onCancelOrder={(orderId) => void cancelOrder(orderId)}
        onRetryPayment={(orderId) => void retryPayment(orderId)}
      />
      {changePasswordOpen && accessToken && (
        <ChangePasswordDialog
          accessToken={accessToken}
          onClose={() => setChangePasswordOpen(false)}
        />
      )}
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Trở về đầu trang"
        className="fixed bottom-5 right-5 z-20 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#304b39] text-xl font-semibold text-white shadow-lg transition hover:-translate-y-1 hover:bg-[#243b2c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#304b39]"
      >
        <span aria-hidden="true">↑</span>
      </button>
    </main>
  );
}
