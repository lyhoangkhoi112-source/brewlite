'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import Link from 'next/link';
import { apiUrl, isRecord, readErrorMessage } from '../api-helpers';
import { productCategories } from '../types';

type DashboardTab = 'overview' | 'products' | 'users';
type UserRole = 'STAFF' | 'CUSTOMER';
type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
type ProductStatus = 'AVAILABLE' | 'OUT_OF_STOCK' | 'UNAVAILABLE';

interface ManagerUser {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  failedLoginAttempts: number;
  loginLockoutStage: number;
  lockedUntil: string | null;
  createdAt: string;
}

interface ManagedProduct {
  id: string;
  name: string;
  category: string | null;
  basePrice: number;
  stockQuantity: number;
  status: ProductStatus;
  imageUrl: string | null;
}

interface MonthlyRevenue {
  month: number;
  revenue: number;
}

interface InventorySummary {
  lowStockThreshold: number;
  products: Array<{
    id: string;
    name: string;
    category: string | null;
    stockQuantity: number;
    status: ProductStatus;
    isLowStock: boolean;
  }>;
  lowStockProducts: Array<{
    id: string;
    name: string;
    category: string | null;
    stockQuantity: number;
    status: ProductStatus;
  }>;
}

interface ManagerSession {
  accessToken: string;
  fullName: string;
  email: string;
}

interface UserForm {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  status: Exclude<UserStatus, 'BLOCKED'>;
}

interface ProductForm {
  name: string;
  category: string;
  basePrice: string;
  stockQuantity: string;
  status: ProductStatus;
  imageUrl: string;
}

const sessionStorageKey = 'brewlite-manager-session';
const monthLabels = [
  'Th1',
  'Th2',
  'Th3',
  'Th4',
  'Th5',
  'Th6',
  'Th7',
  'Th8',
  'Th9',
  'Th10',
  'Th11',
  'Th12',
];

const emptyUserForm: UserForm = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  role: 'CUSTOMER',
  status: 'ACTIVE',
};

const emptyProductForm: ProductForm = {
  name: '',
  category: 'COFFEE',
  basePrice: '',
  stockQuantity: '0',
  status: 'AVAILABLE',
  imageUrl: '',
};

function isUserRole(value: unknown): value is UserRole {
  return value === 'STAFF' || value === 'CUSTOMER';
}

function isUserStatus(value: unknown): value is UserStatus {
  return value === 'ACTIVE' || value === 'INACTIVE' || value === 'BLOCKED';
}

function isProductStatus(value: unknown): value is ProductStatus {
  return (
    value === 'AVAILABLE' ||
    value === 'OUT_OF_STOCK' ||
    value === 'UNAVAILABLE'
  );
}

function parseUser(value: unknown): ManagerUser {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.fullName !== 'string' ||
    typeof value.email !== 'string' ||
    !isUserRole(value.role) ||
    !isUserStatus(value.status)
  ) {
    throw new Error('Dữ liệu tài khoản từ máy chủ không hợp lệ.');
  }
  return {
    id: value.id,
    fullName: value.fullName,
    email: value.email,
    phone: typeof value.phone === 'string' ? value.phone : null,
    role: value.role,
    status: value.status,
    failedLoginAttempts:
      typeof value.failedLoginAttempts === 'number'
        ? value.failedLoginAttempts
        : 0,
    loginLockoutStage:
      typeof value.loginLockoutStage === 'number'
        ? value.loginLockoutStage
        : 0,
    lockedUntil: typeof value.lockedUntil === 'string' ? value.lockedUntil : null,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : '',
  };
}

function parseProduct(value: unknown): ManagedProduct {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    !isProductStatus(value.status)
  ) {
    throw new Error('Dữ liệu sản phẩm từ máy chủ không hợp lệ.');
  }
  const basePrice = Number(value.basePrice);
  if (
    !Number.isFinite(basePrice) ||
    typeof value.stockQuantity !== 'number'
  ) {
    throw new Error('Dữ liệu giá hoặc tồn kho không hợp lệ.');
  }
  return {
    id: value.id,
    name: value.name,
    category: typeof value.category === 'string' ? value.category : null,
    basePrice,
    stockQuantity: value.stockQuantity,
    status: value.status,
    imageUrl: typeof value.imageUrl === 'string' ? value.imageUrl : null,
  };
}

function parseInventoryProduct(
  value: unknown,
): InventorySummary['products'][number] {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.stockQuantity !== 'number' ||
    !isProductStatus(value.status)
  ) {
    throw new Error('Dữ liệu tồn kho từ máy chủ không hợp lệ.');
  }
  return {
    id: value.id,
    name: value.name,
    category: typeof value.category === 'string' ? value.category : null,
    stockQuantity: value.stockQuantity,
    status: value.status,
    isLowStock: value.isLowStock === true,
  };
}

function parseLowStockProduct(
  value: unknown,
): InventorySummary['lowStockProducts'][number] {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.stockQuantity !== 'number' ||
    !isProductStatus(value.status)
  ) {
    throw new Error('Dữ liệu cảnh báo tồn kho từ máy chủ không hợp lệ.');
  }
  return {
    id: value.id,
    name: value.name,
    category: typeof value.category === 'string' ? value.category : null,
    stockQuantity: value.stockQuantity,
    status: value.status,
  };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function categoryName(category: string | null) {
  return (
    productCategories.find((item) => item.value === category)?.label ??
    'Chưa phân loại'
  );
}

async function apiRequest(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new Error('Không thể kết nối đến máy chủ API.');
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      readErrorMessage(payload, 'Không thể thực hiện yêu cầu. Vui lòng thử lại.'),
    );
  }
  return payload;
}

function Icon({
  name,
  className = 'h-5 w-5',
}: {
  name: 'overview' | 'products' | 'users' | 'search' | 'plus' | 'logout';
  className?: string;
}) {
  const paths: Record<typeof name, ReactNode> = {
    overview: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
      </>
    ),
    products: (
      <>
        <path d="M4 8.5 12 4l8 4.5-8 4.5-8-4.5Z" />
        <path d="M4 12.5 12 17l8-4.5M4 16.5 12 21l8-4.5" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    logout: (
      <>
        <path d="M10 17l5-5-5-5M15 12H3" />
        <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-[#3d4d42]">
      {label}
      {children}
    </label>
  );
}

function StatusBadge({ status }: { status: UserStatus | ProductStatus }) {
  const styles: Record<string, string> = {
    ACTIVE: 'bg-[#e7f2e8] text-[#356044]',
    AVAILABLE: 'bg-[#e7f2e8] text-[#356044]',
    OUT_OF_STOCK: 'bg-[#fff2dc] text-[#936321]',
    INACTIVE: 'bg-[#f0f0ec] text-[#73786f]',
    BLOCKED: 'bg-[#fce8e5] text-[#a33c32]',
    UNAVAILABLE: 'bg-[#fce8e5] text-[#a33c32]',
  };
  const labels: Record<string, string> = {
    ACTIVE: 'Đang hoạt động',
    AVAILABLE: 'Đang bán',
    OUT_OF_STOCK: 'Tạm hết',
    INACTIVE: 'Đã ngừng',
    BLOCKED: 'Đã khóa',
    UNAVAILABLE: 'Đã ẩn',
  };
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

export default function ManagerDashboard() {
  const [session, setSession] = useState<ManagerSession | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [users, setUsers] = useState<ManagerUser[]>([]);
  const [products, setProducts] = useState<ManagedProduct[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [inventory, setInventory] = useState<InventorySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('ALL');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState('ALL');
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagerUser | null>(null);
  const [userForm, setUserForm] = useState<UserForm>(emptyUserForm);
  const [savingUser, setSavingUser] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ManagedProduct | null>(
    null,
  );
  const [productForm, setProductForm] =
    useState<ProductForm>(emptyProductForm);
  const [savingProduct, setSavingProduct] = useState(false);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const currentYear = currentDate?.getFullYear() ?? null;

  const loadDashboard = useCallback(async (token: string) => {
    if (currentYear === null) return;
    setLoading(true);
    setPageError(null);
    try {
      const [revenuePayload, inventoryPayload, productPayload, userPayload] =
        await Promise.all([
          apiRequest(`/statistics/monthly-revenue?year=${currentYear}`, token),
          apiRequest('/statistics/inventory', token),
          apiRequest('/products', token),
          apiRequest('/users', token),
        ]);

      if (
        !isRecord(revenuePayload) ||
        !Array.isArray(revenuePayload.monthlyRevenue) ||
        !isRecord(inventoryPayload) ||
        !Array.isArray(inventoryPayload.products) ||
        !Array.isArray(inventoryPayload.lowStockProducts) ||
        !Array.isArray(productPayload) ||
        !Array.isArray(userPayload)
      ) {
        throw new Error('Dữ liệu tổng quan từ máy chủ không hợp lệ.');
      }

      setMonthlyRevenue(
        revenuePayload.monthlyRevenue.map((value: unknown) => {
          if (!isRecord(value)) {
            throw new Error('Dữ liệu doanh thu từ máy chủ không hợp lệ.');
          }
          const revenue = Number(value.revenue);
          if (
            typeof value.month !== 'number' ||
            !Number.isFinite(revenue)
          ) {
            throw new Error('Dữ liệu doanh thu từ máy chủ không hợp lệ.');
          }
          return { month: value.month, revenue };
        }),
      );
      setInventory({
        lowStockThreshold:
          typeof inventoryPayload.lowStockThreshold === 'number'
            ? inventoryPayload.lowStockThreshold
            : 10,
        products: inventoryPayload.products.map(parseInventoryProduct),
        lowStockProducts:
          inventoryPayload.lowStockProducts.map(parseLowStockProduct),
      });
      setProducts(productPayload.map(parseProduct));
      setUsers(userPayload.map(parseUser));
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : 'Không thể tải dữ liệu.',
      );
    } finally {
      setLoading(false);
    }
  }, [currentYear]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const savedSession = window.sessionStorage.getItem(sessionStorageKey);
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
            window.sessionStorage.removeItem(sessionStorageKey);
          }
        }
      } catch {
        window.sessionStorage.removeItem(sessionStorageKey);
      } finally {
        setSessionReady(true);
      }
      setCurrentDate(new Date());
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!session || currentYear === null) return;
    const frame = window.requestAnimationFrame(() => {
      void loadDashboard(session.accessToken);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [currentYear, loadDashboard, session]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('vi');
    return users.filter((user) => {
      const matchesSearch =
        !query ||
        user.fullName.toLocaleLowerCase('vi').includes(query) ||
        user.email.toLocaleLowerCase('vi').includes(query);
      const matchesRole = userRoleFilter === 'ALL' || user.role === userRoleFilter;
      const matchesStatus =
        userStatusFilter === 'ALL' || user.status === userStatusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [search, userRoleFilter, userStatusFilter, users]);

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLocaleLowerCase('vi');
    return products.filter((product) => {
      const matchesName = product.name.toLocaleLowerCase('vi').includes(query);
      const matchesCategory =
        productCategoryFilter === 'ALL' ||
        product.category === productCategoryFilter;
      return matchesName && matchesCategory;
    });
  }, [productCategoryFilter, productSearch, products]);

  const activeProducts = products.filter(
    (product) => product.status !== 'UNAVAILABLE',
  );
  const annualRevenue = monthlyRevenue.reduce(
    (total, month) => total + month.revenue,
    0,
  );
  const currentMonthRevenue = currentDate
    ? (monthlyRevenue[currentDate.getMonth()]?.revenue ?? 0)
    : 0;
  const totalStock = activeProducts.reduce(
    (total, product) => total + product.stockQuantity,
    0,
  );
  const lowStockCount = inventory?.lowStockProducts.length ?? 0;

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const response = await fetch(`${apiUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(readErrorMessage(payload, 'Đăng nhập thất bại.'));
      }
      if (
        !isRecord(payload) ||
        !isRecord(payload.user) ||
        typeof payload.accessToken !== 'string' ||
        typeof payload.user.role !== 'string' ||
        typeof payload.user.fullName !== 'string' ||
        typeof payload.user.email !== 'string'
      ) {
        throw new Error('Phản hồi đăng nhập từ máy chủ không hợp lệ.');
      }
      if (payload.user.role !== 'MANAGER') {
        throw new Error('Tài khoản này không có quyền truy cập trang quản lý.');
      }
      const nextSession = {
        accessToken: payload.accessToken,
        fullName: payload.user.fullName,
        email: payload.user.email,
      };
      window.sessionStorage.setItem(
        sessionStorageKey,
        JSON.stringify(nextSession),
      );
      setSession(nextSession);
      setPassword('');
    } catch (error) {
      setLoginError(
        error instanceof Error
          ? error.message
          : 'Không thể kết nối đến máy chủ.',
      );
    } finally {
      setIsLoggingIn(false);
    }
  }

  function logout() {
    window.sessionStorage.removeItem(sessionStorageKey);
    setSession(null);
    setUsers([]);
    setProducts([]);
    setMonthlyRevenue([]);
    setInventory(null);
    setPageError(null);
  }

  function openCreateUser() {
    setEditingUser(null);
    setUserForm(emptyUserForm);
    setAccountDialogOpen(true);
  }

  function openEditUser(user: ManagerUser) {
    setEditingUser(user);
    setUserForm({
      fullName: user.fullName,
      email: user.email,
      phone: user.phone ?? '',
      password: '',
      role: user.role,
      status: user.status === 'BLOCKED' ? 'ACTIVE' : user.status,
    });
    setAccountDialogOpen(true);
  }

  async function saveUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setSavingUser(true);
    setPageError(null);
    try {
      const body: Record<string, unknown> = {
        fullName: userForm.fullName.trim(),
        email: userForm.email.trim(),
        phone: userForm.phone.trim() || null,
        role: userForm.role,
        ...(editingUser?.status !== 'BLOCKED'
          ? { status: userForm.status }
          : {}),
        ...(userForm.password ? { password: userForm.password } : {}),
      };
      await apiRequest(
        editingUser ? `/users/${editingUser.id}` : '/users',
        session.accessToken,
        {
          method: editingUser ? 'PATCH' : 'POST',
          body: JSON.stringify(body),
        },
      );
      setAccountDialogOpen(false);
      await loadDashboard(session.accessToken);
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : 'Không thể lưu tài khoản.',
      );
    } finally {
      setSavingUser(false);
    }
  }

  async function unlockUser(user: ManagerUser) {
    if (!session) return;
    setPageError(null);
    try {
      await apiRequest(`/users/${user.id}/unlock`, session.accessToken, {
        method: 'POST',
      });
      await loadDashboard(session.accessToken);
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : 'Không thể mở khóa tài khoản.',
      );
    }
  }

  async function deactivateUser(user: ManagerUser) {
    if (!session || !window.confirm(`Ngừng hoạt động tài khoản ${user.fullName}?`)) {
      return;
    }
    setPageError(null);
    try {
      await apiRequest(`/users/${user.id}`, session.accessToken, {
        method: 'DELETE',
      });
      await loadDashboard(session.accessToken);
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : 'Không thể ngừng tài khoản.',
      );
    }
  }

  function openCreateProduct() {
    setEditingProduct(null);
    setProductForm(emptyProductForm);
    setProductDialogOpen(true);
  }

  function openEditProduct(product: ManagedProduct) {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      category: product.category ?? 'COFFEE',
      basePrice: String(product.basePrice),
      stockQuantity: String(product.stockQuantity),
      status: product.status,
      imageUrl: product.imageUrl ?? '',
    });
    setProductDialogOpen(true);
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setSavingProduct(true);
    setPageError(null);
    try {
      const body = {
        name: productForm.name.trim(),
        category: productForm.category,
        basePrice: Number(productForm.basePrice),
        stockQuantity: Number(productForm.stockQuantity),
        status: productForm.status,
        imageUrl: productForm.imageUrl.trim() || null,
      };
      await apiRequest(
        editingProduct ? `/products/${editingProduct.id}` : '/products',
        session.accessToken,
        {
          method: editingProduct ? 'PATCH' : 'POST',
          body: JSON.stringify(body),
        },
      );
      setProductDialogOpen(false);
      await loadDashboard(session.accessToken);
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : 'Không thể lưu sản phẩm.',
      );
    } finally {
      setSavingProduct(false);
    }
  }

  async function deactivateProduct(product: ManagedProduct) {
    if (!session || !window.confirm(`Ẩn sản phẩm ${product.name}?`)) return;
    setPageError(null);
    try {
      await apiRequest(`/products/${product.id}`, session.accessToken, {
        method: 'DELETE',
      });
      await loadDashboard(session.accessToken);
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : 'Không thể ẩn sản phẩm.',
      );
    }
  }

  if (!sessionReady) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f6f1]">
        <p className="text-sm font-medium text-[#617166]">Đang mở trang quản lý…</p>
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
              Chăm chút từng con số, vận hành thật nhẹ nhàng.
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-white/65">
              Theo dõi doanh thu, kiểm soát tồn kho và quản lý đội ngũ tại một
              nơi.
            </p>
          </div>
          <p className="relative text-sm text-white/45">
            BrewLite · Trang dành riêng cho quản lý
          </p>
        </section>
        <section className="flex items-center justify-center px-5 py-12 sm:px-10">
          <div className="w-full max-w-md">
            <div className="mb-10 flex items-center gap-3 lg:hidden">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#294432] font-semibold text-white">
                B
              </span>
              <span className="text-sm font-bold tracking-[0.2em]">BREWLITE</span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9a6d3e]">
              Khu vực quản trị
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              Chào mừng trở lại
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#748076]">
              Đăng nhập bằng tài khoản quản lý để tiếp tục.
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
              <Field label="Email">
                <input
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="manager@brewlife.vn"
                  className="h-12 rounded-xl border border-[#dfe4dc] bg-white px-4 outline-none transition placeholder:text-[#aab2aa] focus:border-[#607e65] focus:ring-4 focus:ring-[#607e65]/10"
                />
              </Field>
              <Field label="Mật khẩu">
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="h-12 rounded-xl border border-[#dfe4dc] bg-white px-4 outline-none transition placeholder:text-[#aab2aa] focus:border-[#607e65] focus:ring-4 focus:ring-[#607e65]/10"
                />
              </Field>
              <button
                type="submit"
                disabled={isLoggingIn}
                className="mt-2 flex h-12 w-full items-center justify-center rounded-xl bg-[#294432] px-5 font-semibold text-white transition hover:bg-[#203728] disabled:cursor-wait disabled:opacity-60"
              >
                {isLoggingIn ? 'Đang xác thực…' : 'Đăng nhập quản lý'}
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

  const maxRevenue = Math.max(
    ...monthlyRevenue.map((item) => item.revenue),
    1,
  );
  const selectedLabel =
    activeTab === 'overview'
      ? 'Tổng quan'
      : activeTab === 'products'
        ? 'Sản phẩm'
        : 'Tài khoản';

  return (
    <main className="min-h-screen bg-[#f5f6f1] text-[#25372b]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[252px] flex-col border-r border-[#e7e9e1] bg-white px-5 py-6 lg:flex">
        <Link href="/" className="flex items-center gap-3 px-2">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#294432] font-semibold text-white">
            B
          </span>
          <span>
            <span className="block text-sm font-bold tracking-[0.17em]">
              BREWLITE
            </span>
            <span className="mt-0.5 block text-xs text-[#8a948a]">
              Management
            </span>
          </span>
        </Link>
        <p className="mb-3 mt-12 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#a1a99f]">
          Không gian làm việc
        </p>
        <nav className="space-y-1.5" aria-label="Điều hướng quản lý">
          {(
            [
              ['overview', 'Tổng quan'],
              ['products', 'Sản phẩm & kho'],
              ['users', 'Nhân sự & khách hàng'],
            ] as const
          ).map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setActiveTab(tab);
                setSearch('');
              }}
              className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition ${
                activeTab === tab
                  ? 'bg-[#edf3eb] text-[#31513b]'
                  : 'text-[#778178] hover:bg-[#f7f8f4] hover:text-[#31513b]'
              }`}
            >
              <Icon name={tab === 'overview' ? 'overview' : tab === 'products' ? 'products' : 'users'} className="h-[18px] w-[18px]" />
              {label}
              {tab === 'products' && lowStockCount > 0 && (
                <span className="ml-auto rounded-full bg-[#fff0d4] px-2 py-0.5 text-[10px] font-bold text-[#9b6a23]">
                  {lowStockCount}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl bg-[#f4f6f0] p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-[#dfe9dc] text-sm font-bold text-[#45634b]">
              {session.fullName.slice(0, 1).toLocaleUpperCase('vi')}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{session.fullName}</p>
              <p className="truncate text-xs text-[#849086]">Quản lý</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="mt-4 flex min-h-10 w-full items-center gap-2 rounded-xl px-2 text-sm font-semibold text-[#7b857c] transition hover:bg-white hover:text-[#36513c]"
          >
            <Icon name="logout" className="h-4 w-4" />
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="lg:pl-[252px]">
        <header className="sticky top-0 z-10 border-b border-[#e7e9e1] bg-white/95 backdrop-blur">
          <div className="mx-auto flex min-h-[72px] max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-7 lg:px-10">
            <div>
              <p className="hidden text-xs font-medium text-[#8a948a] sm:block">
                BrewLite / Quản lý
              </p>
              <h1 className="mt-0.5 text-lg font-semibold tracking-tight sm:text-xl">
                {selectedLabel}
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="hidden rounded-full bg-[#edf3eb] px-3 py-1.5 text-xs font-semibold text-[#426149] sm:inline-flex">
                ● Hệ thống đang hoạt động
              </span>
              <div className="hidden h-8 w-px bg-[#e8ebe4] sm:block" />
              <div className="text-right">
                <p className="max-w-36 truncate text-sm font-semibold sm:max-w-none">
                  {session.fullName}
                </p>
                <p className="hidden text-xs text-[#8a948a] sm:block">
                  {currentDate
                    ? new Intl.DateTimeFormat('vi-VN', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      }).format(currentDate)
                    : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={logout}
                aria-label="Đăng xuất"
                className="ml-1 grid h-10 w-10 place-items-center rounded-xl border border-[#e7e9e1] text-[#647267] hover:bg-[#f6f8f3] lg:hidden"
              >
                <Icon name="logout" className="h-[18px] w-[18px]" />
              </button>
            </div>
          </div>
          <nav
            className="flex gap-2 overflow-x-auto border-t border-[#f0f1ec] px-4 py-2 lg:hidden"
            aria-label="Điều hướng quản lý"
          >
            {(
              [
                ['overview', 'Tổng quan'],
                ['products', 'Sản phẩm'],
                ['users', 'Tài khoản'],
              ] as const
            ).map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold ${
                  activeTab === tab
                    ? 'bg-[#294432] text-white'
                    : 'bg-[#f2f4ef] text-[#657267]'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </header>

        <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-10">
          {pageError && (
            <div
              role="alert"
              className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-[#f0d2cc] bg-[#fff5f2] px-4 py-3 text-sm text-[#9b4036]"
            >
              <span>{pageError}</span>
              <button
                type="button"
                onClick={() => setPageError(null)}
                className="font-semibold"
              >
                Đóng
              </button>
            </div>
          )}

          {loading && (
            <div
              role="status"
              className="mb-5 rounded-xl bg-white px-4 py-3 text-sm text-[#657267]"
            >
              Đang đồng bộ dữ liệu…
            </div>
          )}

          {activeTab === 'overview' && (
            <section>
              <div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <p className="text-sm text-[#7b867d]">
                    Xin chào, {session.fullName.split(' ')[0]} 👋
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-[28px]">
                    Đây là tình hình cửa hàng
                  </h2>
                </div>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void loadDashboard(session.accessToken)}
                  className="min-h-10 self-start rounded-xl border border-[#dfe4dc] bg-white px-4 text-sm font-semibold text-[#526254] transition hover:bg-[#f8faf6] disabled:opacity-50 sm:self-auto"
                >
                  Làm mới dữ liệu
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard
                  label="Doanh thu năm nay"
                  value={formatCurrency(annualRevenue)}
                  detail={`${currentYear ?? '—'} · Thanh toán thành công`}
                  tone="green"
                  icon="↗"
                />
                <MetricCard
                  label="Doanh thu tháng này"
                  value={formatCurrency(currentMonthRevenue)}
                  detail={
                    currentDate
                      ? currentDate.toLocaleDateString('vi-VN', {
                          month: 'long',
                          year: 'numeric',
                        })
                      : ''
                  }
                  tone="gold"
                  icon="₫"
                />
                <MetricCard
                  label="Tổng tồn kho"
                  value={new Intl.NumberFormat('vi-VN').format(totalStock)}
                  detail={`${activeProducts.length} món đang kinh doanh`}
                  tone="blue"
                  icon="▤"
                />
                <MetricCard
                  label="Sắp hết hàng"
                  value={String(lowStockCount)}
                  detail={`Tồn kho dưới ${inventory?.lowStockThreshold ?? 10}`}
                  tone="rose"
                  icon="!"
                />
              </div>

              <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
                <section className="rounded-2xl border border-[#e8eae3] bg-white p-5 sm:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#48564b]">
                        Biểu đồ doanh thu
                      </p>
                      <h3 className="mt-1 text-2xl font-semibold tracking-tight">
                        {formatCurrency(annualRevenue)}
                      </h3>
                    </div>
                    <span className="rounded-full bg-[#f2f5ef] px-3 py-1.5 text-xs font-semibold text-[#607363]">
                      Năm {currentYear ?? '—'}
                    </span>
                  </div>
                  <div className="mt-8 grid h-48 grid-cols-12 items-end gap-2 sm:h-56 sm:gap-3">
                    {monthLabels.map((label, index) => {
                      const month = monthlyRevenue.find(
                        (item) => item.month === index + 1,
                      );
                      const amount = month?.revenue ?? 0;
                      const height =
                        amount === 0
                          ? 4
                          : Math.max(12, (amount / maxRevenue) * 100);
                      const isCurrentMonth =
                        index === currentDate?.getMonth();
                      return (
                        <div
                          key={label}
                          className="group flex h-full flex-col items-center justify-end gap-2"
                          title={`${label}: ${formatCurrency(amount)}`}
                        >
                          <div className="flex h-[calc(100%-22px)] w-full items-end">
                            <div
                              className={`relative w-full rounded-t-md transition-all group-hover:opacity-80 ${
                                isCurrentMonth ? 'bg-[#c89455]' : 'bg-[#88a58a]'
                              }`}
                              style={{ height: `${height}%` }}
                            />
                          </div>
                          <span className="text-[9px] font-medium text-[#929b92] sm:text-[11px]">
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-5 flex items-center gap-5 border-t border-[#f0f1ec] pt-4 text-xs text-[#7d887f]">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm bg-[#88a58a]" />
                      Doanh thu theo tháng
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm bg-[#c89455]" />
                      Tháng hiện tại
                    </span>
                  </div>
                </section>

                <section className="rounded-2xl border border-[#e8eae3] bg-white p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#48564b]">
                        Cần nhập thêm
                      </p>
                      <p className="mt-1 text-xs text-[#8a948a]">
                        Các món còn dưới {inventory?.lowStockThreshold ?? 10}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('products')}
                      className="text-xs font-semibold text-[#426149] hover:underline"
                    >
                      Xem kho →
                    </button>
                  </div>
                  <div className="mt-5 space-y-2.5">
                    {inventory?.lowStockProducts.length ? (
                      inventory.lowStockProducts.slice(0, 5).map((product) => (
                        <div
                          key={product.id}
                          className="flex items-center justify-between gap-3 rounded-xl bg-[#faf8f3] px-3 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">
                              {product.name}
                            </p>
                            <p className="mt-0.5 text-xs text-[#899187]">
                              {categoryName(product.category)}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-lg bg-[#fff0d4] px-2.5 py-1.5 text-xs font-bold text-[#9b6a23]">
                            Còn {product.stockQuantity}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="grid min-h-40 place-items-center rounded-xl bg-[#f7f9f5] px-5 text-center">
                        <div>
                          <span className="text-2xl text-[#749277]">✓</span>
                          <p className="mt-2 text-sm font-semibold">
                            Kho hàng đang ổn
                          </p>
                          <p className="mt-1 text-xs text-[#879187]">
                            Chưa có món nào cần nhập thêm.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <section className="mt-6 rounded-2xl border border-[#e8eae3] bg-white p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">Sản phẩm sắp hết</h3>
                    <p className="mt-1 text-xs text-[#899187]">
                      Theo dõi nhanh số lượng tồn kho hiện tại
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('products')}
                    className="rounded-lg px-3 py-2 text-xs font-semibold text-[#426149] hover:bg-[#f2f5ef]"
                  >
                    Quản lý sản phẩm
                  </button>
                </div>
                <LowStockTable inventory={inventory} />
              </section>
            </section>
          )}

          {activeTab === 'products' && (
            <section>
              <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="text-sm text-[#7b867d]">
                    Danh mục và số lượng đang kinh doanh
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                    Sản phẩm & tồn kho
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={openCreateProduct}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#294432] px-4 text-sm font-semibold text-white transition hover:bg-[#203728]"
                >
                  <Icon name="plus" className="h-4 w-4" />
                  Thêm sản phẩm
                </button>
              </div>
              <div className="mb-5 grid gap-3 sm:grid-cols-3">
                <MiniMetric label="Món đang kinh doanh" value={activeProducts.length} />
                <MiniMetric label="Tổng số lượng tồn" value={totalStock} />
                <MiniMetric label="Cần nhập thêm" value={lowStockCount} warning />
              </div>
              <section className="overflow-hidden rounded-2xl border border-[#e8eae3] bg-white">
                <div className="border-b border-[#eff0eb] p-4 sm:px-6 sm:py-5">
                  <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                    <div className="shrink-0">
                      <h3 className="text-sm font-semibold">
                        Danh sách sản phẩm
                      </h3>
                      <p className="mt-1 text-xs text-[#8b948b]">
                        {filteredProducts.length} / {products.length} sản phẩm
                        · bao gồm món đã ẩn
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <label className="relative min-w-0 flex-1">
                        <span className="sr-only">Tìm sản phẩm theo tên</span>
                        <Icon
                          name="search"
                          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98a097]"
                        />
                        <input
                          value={productSearch}
                          onChange={(event) =>
                            setProductSearch(event.target.value)
                          }
                          placeholder="Tìm sản phẩm theo tên…"
                          className="h-10 w-full rounded-xl border border-[#e2e6df] pl-9 pr-3 text-sm outline-none focus:border-[#739077] sm:w-52 lg:w-44 xl:w-56"
                        />
                      </label>
                      <select
                        aria-label="Lọc danh mục sản phẩm"
                        value={productCategoryFilter}
                        onChange={(event) =>
                          setProductCategoryFilter(event.target.value)
                        }
                        className="h-10 rounded-xl border border-[#e2e6df] bg-white px-3 text-sm text-[#627065] outline-none focus:border-[#739077]"
                      >
                        <option value="ALL">Tất cả danh mục</option>
                        {productCategories.map((category) => (
                          <option key={category.value} value={category.value}>
                            {category.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => void loadDashboard(session.accessToken)}
                        className="min-h-10 rounded-xl border border-[#e1e5de] px-3 text-xs font-semibold text-[#69766b] hover:bg-[#f7f8f4]"
                      >
                        Làm mới
                      </button>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left">
                    <thead className="bg-[#fafbf8] text-[11px] font-semibold uppercase tracking-wide text-[#929a91]">
                      <tr>
                        <th className="px-6 py-3">Sản phẩm</th>
                        <th className="px-4 py-3">Danh mục</th>
                        <th className="px-4 py-3">Giá bán</th>
                        <th className="px-4 py-3">Tồn kho</th>
                        <th className="px-4 py-3">Trạng thái</th>
                        <th className="px-6 py-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0f1ec]">
                      {filteredProducts.map((product) => (
                        <tr key={product.id} className="hover:bg-[#fcfcfa]">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f0f3eb] text-lg">
                                ☕
                              </div>
                              <span className="font-semibold">{product.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-[#788379]">
                            {categoryName(product.category)}
                          </td>
                          <td className="px-4 py-4 text-sm font-medium">
                            {formatCurrency(product.basePrice)}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`text-sm font-semibold ${
                                product.stockQuantity < 10 &&
                                product.status !== 'UNAVAILABLE'
                                  ? 'text-[#a66e25]'
                                  : 'text-[#46564a]'
                              }`}
                            >
                              {product.stockQuantity}
                            </span>
                            <span className="ml-1 text-xs text-[#929a91]">món</span>
                          </td>
                          <td className="px-4 py-4">
                            <StatusBadge status={product.status} />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openEditProduct(product)}
                                className="rounded-lg px-3 py-2 text-xs font-semibold text-[#48644d] hover:bg-[#edf3eb]"
                              >
                                Chỉnh sửa
                              </button>
                              {product.status !== 'UNAVAILABLE' && (
                                <button
                                  type="button"
                                  onClick={() => void deactivateProduct(product)}
                                  className="rounded-lg px-3 py-2 text-xs font-semibold text-[#a24b40] hover:bg-[#fff1ee]"
                                >
                                  Ẩn
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!filteredProducts.length && !loading && (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-6 py-14 text-center text-sm text-[#899187]"
                          >
                            {products.length
                              ? 'Không tìm thấy sản phẩm phù hợp.'
                              : 'Chưa có sản phẩm nào.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </section>
          )}

          {activeTab === 'users' && (
            <section>
              <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="text-sm text-[#7b867d]">
                    Nhân viên và khách hàng của cửa hàng
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight">
                    Nhân sự & khách hàng
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={openCreateUser}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#294432] px-4 text-sm font-semibold text-white transition hover:bg-[#203728]"
                >
                  <Icon name="plus" className="h-4 w-4" />
                  Tạo tài khoản
                </button>
              </div>
              <div className="mb-5 grid gap-3 sm:grid-cols-3">
                <MiniMetric
                  label="Tổng tài khoản"
                  value={users.length}
                />
                <MiniMetric
                  label="Nhân viên"
                  value={users.filter((user) => user.role === 'STAFF').length}
                />
                <MiniMetric
                  label="Đang bị khóa"
                  value={users.filter((user) => user.status === 'BLOCKED').length}
                  warning
                />
              </div>
              <section className="overflow-hidden rounded-2xl border border-[#e8eae3] bg-white">
                <div className="flex flex-col gap-3 border-b border-[#eff0eb] p-4 sm:px-6 sm:py-5">
                  <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                    <div>
                      <h3 className="text-sm font-semibold">Danh sách tài khoản</h3>
                      <p className="mt-1 text-xs text-[#8b948b]">
                        Tìm kiếm, cập nhật trạng thái và mở khóa tài khoản
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <label className="relative">
                        <span className="sr-only">Tìm theo tên hoặc email</span>
                        <Icon
                          name="search"
                          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98a097]"
                        />
                        <input
                          value={search}
                          onChange={(event) => setSearch(event.target.value)}
                          placeholder="Tìm tên, email…"
                          className="h-10 w-full rounded-xl border border-[#e2e6df] pl-9 pr-3 text-sm outline-none focus:border-[#739077] sm:w-52"
                        />
                      </label>
                      <select
                        aria-label="Lọc vai trò"
                        value={userRoleFilter}
                        onChange={(event) => setUserRoleFilter(event.target.value)}
                        className="h-10 rounded-xl border border-[#e2e6df] bg-white px-3 text-sm text-[#627065] outline-none focus:border-[#739077]"
                      >
                        <option value="ALL">Tất cả vai trò</option>
                        <option value="STAFF">Nhân viên</option>
                        <option value="CUSTOMER">Khách hàng</option>
                      </select>
                      <select
                        aria-label="Lọc trạng thái"
                        value={userStatusFilter}
                        onChange={(event) => setUserStatusFilter(event.target.value)}
                        className="h-10 rounded-xl border border-[#e2e6df] bg-white px-3 text-sm text-[#627065] outline-none focus:border-[#739077]"
                      >
                        <option value="ALL">Mọi trạng thái</option>
                        <option value="ACTIVE">Đang hoạt động</option>
                        <option value="INACTIVE">Đã ngừng</option>
                        <option value="BLOCKED">Đã khóa</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[780px] text-left">
                    <thead className="bg-[#fafbf8] text-[11px] font-semibold uppercase tracking-wide text-[#929a91]">
                      <tr>
                        <th className="px-6 py-3">Tài khoản</th>
                        <th className="px-4 py-3">Vai trò</th>
                        <th className="px-4 py-3">Trạng thái</th>
                        <th className="px-4 py-3">Lần đăng nhập sai</th>
                        <th className="px-4 py-3">Ngày tạo</th>
                        <th className="px-6 py-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0f1ec]">
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-[#fcfcfa]">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#edf2e9] text-sm font-bold text-[#49644e]">
                                {user.fullName.slice(0, 1).toLocaleUpperCase('vi')}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">
                                  {user.fullName}
                                </p>
                                <p className="mt-0.5 truncate text-xs text-[#8a948a]">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-[#667268]">
                            {user.role === 'STAFF' ? 'Nhân viên' : 'Khách hàng'}
                          </td>
                          <td className="px-4 py-4">
                            <StatusBadge status={user.status} />
                            {user.status === 'BLOCKED' && (
                              <p className="mt-1 text-[10px] text-[#a24b40]">
                                Khóa vĩnh viễn
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-4 text-sm text-[#69766b]">
                            {user.failedLoginAttempts} lần
                          </td>
                          <td className="px-4 py-4 text-sm text-[#7f897f]">
                            {formatDate(user.createdAt)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-end gap-1">
                              {user.status === 'BLOCKED' && (
                                <button
                                  type="button"
                                  onClick={() => void unlockUser(user)}
                                  className="rounded-lg px-3 py-2 text-xs font-semibold text-[#356044] hover:bg-[#edf3eb]"
                                >
                                  Mở khóa
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openEditUser(user)}
                                className="rounded-lg px-3 py-2 text-xs font-semibold text-[#526b56] hover:bg-[#f1f5ef]"
                              >
                                Sửa
                              </button>
                              {user.status !== 'INACTIVE' && (
                                <button
                                  type="button"
                                  onClick={() => void deactivateUser(user)}
                                  className="rounded-lg px-3 py-2 text-xs font-semibold text-[#a24b40] hover:bg-[#fff1ee]"
                                >
                                  Ngừng
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!filteredUsers.length && (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-6 py-14 text-center text-sm text-[#899187]"
                          >
                            Không tìm thấy tài khoản phù hợp.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-[#eff0eb] px-6 py-3 text-xs text-[#909990]">
                  Hiển thị {filteredUsers.length} / {users.length} tài khoản
                </div>
              </section>
            </section>
          )}
        </div>
      </div>

      {accountDialogOpen && (
        <Dialog
          title={editingUser ? 'Cập nhật tài khoản' : 'Tạo tài khoản mới'}
          description="Thông tin tài khoản nhân viên hoặc khách hàng."
          onClose={() => setAccountDialogOpen(false)}
        >
          <form onSubmit={saveUser} className="space-y-4">
            <Field label="Họ và tên">
              <input
                required
                minLength={2}
                value={userForm.fullName}
                onChange={(event) =>
                  setUserForm({ ...userForm, fullName: event.target.value })
                }
                className="form-input"
              />
            </Field>
            <Field label="Email">
              <input
                required
                type="email"
                value={userForm.email}
                onChange={(event) =>
                  setUserForm({ ...userForm, email: event.target.value })
                }
                className="form-input"
              />
            </Field>
            <Field label="Số điện thoại">
              <input
                value={userForm.phone}
                onChange={(event) =>
                  setUserForm({ ...userForm, phone: event.target.value })
                }
                className="form-input"
              />
            </Field>
            <Field label={editingUser ? 'Mật khẩu mới (không bắt buộc)' : 'Mật khẩu'}>
              <input
                required={!editingUser}
                minLength={8}
                type="password"
                autoComplete="new-password"
                value={userForm.password}
                onChange={(event) =>
                  setUserForm({ ...userForm, password: event.target.value })
                }
                className="form-input"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Vai trò">
                <select
                  value={userForm.role}
                  onChange={(event) =>
                    setUserForm({
                      ...userForm,
                      role: event.target.value as UserRole,
                    })
                  }
                  className="form-input"
                >
                  <option value="CUSTOMER">Khách hàng</option>
                  <option value="STAFF">Nhân viên</option>
                </select>
              </Field>
              {editingUser && editingUser.status !== 'BLOCKED' && (
                <Field label="Trạng thái">
                  <select
                    value={userForm.status}
                    onChange={(event) =>
                      setUserForm({
                        ...userForm,
                        status: event.target.value as Exclude<
                          UserStatus,
                          'BLOCKED'
                        >,
                      })
                    }
                    className="form-input"
                  >
                    <option value="ACTIVE">Đang hoạt động</option>
                    <option value="INACTIVE">Đã ngừng</option>
                  </select>
                </Field>
              )}
            </div>
            {editingUser?.status === 'BLOCKED' && (
              <p className="rounded-xl bg-[#fff4e5] px-3 py-2 text-xs leading-5 text-[#8d6327]">
                Tài khoản đang bị khóa vĩnh viễn. Dùng nút “Mở khóa” trong danh
                sách để đặt lại trạng thái và bộ đếm đăng nhập.
              </p>
            )}
            <div className="flex justify-end gap-2 border-t border-[#eff0eb] pt-4">
              <button
                type="button"
                onClick={() => setAccountDialogOpen(false)}
                className="min-h-10 rounded-xl px-4 text-sm font-semibold text-[#69766b] hover:bg-[#f5f6f2]"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={savingUser}
                className="min-h-10 rounded-xl bg-[#294432] px-5 text-sm font-semibold text-white hover:bg-[#203728] disabled:opacity-50"
              >
                {savingUser ? 'Đang lưu…' : 'Lưu tài khoản'}
              </button>
            </div>
          </form>
        </Dialog>
      )}

      {productDialogOpen && (
        <Dialog
          title={editingProduct ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm'}
          description="Cập nhật thông tin món và số lượng tồn kho."
          onClose={() => setProductDialogOpen(false)}
        >
          <form onSubmit={saveProduct} className="space-y-4">
            <Field label="Tên sản phẩm">
              <input
                required
                minLength={1}
                maxLength={150}
                value={productForm.name}
                onChange={(event) =>
                  setProductForm({ ...productForm, name: event.target.value })
                }
                className="form-input"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Danh mục">
                <select
                  value={productForm.category}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      category: event.target.value,
                    })
                  }
                  className="form-input"
                >
                  {productCategories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Giá bán (₫)">
                <input
                  required
                  type="number"
                  min="0"
                  step="1000"
                  value={productForm.basePrice}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      basePrice: event.target.value,
                    })
                  }
                  className="form-input"
                />
              </Field>
              <Field label="Số lượng tồn kho">
                <input
                  required
                  type="number"
                  min="0"
                  step="1"
                  value={productForm.stockQuantity}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      stockQuantity: event.target.value,
                    })
                  }
                  className="form-input"
                />
              </Field>
              <Field label="Trạng thái">
                <select
                  value={productForm.status}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      status: event.target.value as ProductStatus,
                    })
                  }
                  className="form-input"
                >
                  <option value="AVAILABLE">Đang bán</option>
                  <option value="OUT_OF_STOCK">Tạm hết</option>
                  <option value="UNAVAILABLE">Đã ẩn</option>
                </select>
              </Field>
            </div>
            <Field label="Đường dẫn hình ảnh (không bắt buộc)">
              <input
                type="text"
                value={productForm.imageUrl}
                onChange={(event) =>
                  setProductForm({
                    ...productForm,
                    imageUrl: event.target.value,
                  })
                }
                className="form-input"
                placeholder="/product/tra-sua.png hoặc https://…"
              />
              <span className="text-xs font-normal text-[#899187]">
                Có thể nhập đường dẫn ảnh trong thư mục public hoặc URL đầy đủ.
              </span>
            </Field>
            <div className="flex justify-end gap-2 border-t border-[#eff0eb] pt-4">
              <button
                type="button"
                onClick={() => setProductDialogOpen(false)}
                className="min-h-10 rounded-xl px-4 text-sm font-semibold text-[#69766b] hover:bg-[#f5f6f2]"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={savingProduct}
                className="min-h-10 rounded-xl bg-[#294432] px-5 text-sm font-semibold text-white hover:bg-[#203728] disabled:opacity-50"
              >
                {savingProduct ? 'Đang lưu…' : 'Lưu sản phẩm'}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </main>
  );
}

function MetricCard({
  label,
  value,
  detail,
  tone,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  tone: 'green' | 'gold' | 'blue' | 'rose';
  icon: string;
}) {
  const tones = {
    green: 'bg-[#eaf2e8] text-[#3f6648]',
    gold: 'bg-[#faf0df] text-[#a07539]',
    blue: 'bg-[#eaf0f3] text-[#567180]',
    rose: 'bg-[#faece8] text-[#a65c4e]',
  };
  return (
    <article className="rounded-2xl border border-[#e8eae3] bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-[#778278]">{label}</p>
        <span
          className={`grid h-9 w-9 place-items-center rounded-xl text-sm font-bold ${tones[tone]}`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-4 truncate text-[22px] font-semibold tracking-tight sm:text-2xl">
        {value}
      </p>
      <p className="mt-1.5 text-xs text-[#929a91]">{detail}</p>
    </article>
  );
}

function MiniMetric({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: number;
  warning?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[#e8eae3] bg-white px-4 py-4">
      <p className="text-xs font-medium text-[#879187]">{label}</p>
      <p
        className={`mt-2 text-xl font-semibold ${
          warning && value ? 'text-[#a66e25]' : 'text-[#2e4434]'
        }`}
      >
        {new Intl.NumberFormat('vi-VN').format(value)}
      </p>
    </div>
  );
}

function LowStockTable({ inventory }: { inventory: InventorySummary | null }) {
  if (!inventory?.lowStockProducts.length) {
    return (
      <div className="mt-4 rounded-xl bg-[#f7f9f5] px-4 py-8 text-center text-sm text-[#879187]">
        Không có sản phẩm nào dưới ngưỡng tồn kho.
      </div>
    );
  }
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[480px] text-left">
        <thead className="text-[10px] font-semibold uppercase tracking-wide text-[#9aa198]">
          <tr>
            <th className="py-2">Sản phẩm</th>
            <th className="py-2">Danh mục</th>
            <th className="py-2">Trạng thái</th>
            <th className="py-2 text-right">Tồn kho</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f0f1ec]">
          {inventory.lowStockProducts.map((product) => (
            <tr key={product.id}>
              <td className="py-3 text-sm font-semibold">{product.name}</td>
              <td className="py-3 text-xs text-[#828c82]">
                {categoryName(product.category)}
              </td>
              <td className="py-3">
                <StatusBadge status={product.status} />
              </td>
              <td className="py-3 text-right text-sm font-bold text-[#a66e25]">
                {product.stockQuantity}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Dialog({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[#17231a]/45 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="manager-dialog-title"
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2
              id="manager-dialog-title"
              className="text-xl font-semibold tracking-tight"
            >
              {title}
            </h2>
            <p className="mt-1 text-sm text-[#818b81]">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg text-[#7c877d] hover:bg-[#f3f5f0]"
          >
            ×
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
