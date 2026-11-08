export const productCategories = [
  { value: 'COFFEE', label: 'Cà phê' },
  { value: 'MILK_TEA', label: 'Trà sữa' },
  { value: 'FRUIT_TEA', label: 'Trà trái cây' },
  { value: 'MATCHA', label: 'Matcha' },
  { value: 'ICE_BLEND', label: 'Ice Blend' },
  { value: 'MACCHIATO', label: 'Macchiato' },
  { value: 'TOPPING', label: 'Topping' },
] as const;

export type Screen = 'welcome' | 'login' | 'register' | 'menu';
export type ProductCategory = (typeof productCategories)[number]['value'];
export type ProductMenuCategory = ProductCategory | 'ALL' | 'UNCATEGORIZED';
export type OrderIntent = 'buyNow' | 'cart';
export type PaymentMethod = 'MOMO' | 'VNPAY' | 'SHOPEEPAY';
export type MockPaymentOutcome = 'SUCCESS' | 'FAILED' | 'CANCELLED';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory | null;
  price: number;
  imageUrl: string | null;
  stockQuantity: number;
  status: string;
}

export interface AuthenticatedUser {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: string;
}

export interface LoginResult {
  accessToken: string;
  user: AuthenticatedUser;
}

export interface OrderItemInput {
  productId: string;
  quantity: number;
  selectedSize: string;
  sugarLevel: string;
  iceLevel: string;
  selectedToppings: string[];
}

export interface OrderConfirmation {
  id: string;
  orderCode: string;
  status: string;
  totalAmount: number;
  payments: Array<{
    id: string;
    amount: number;
    method: PaymentMethod;
    status: string;
  }>;
  note: string | null;
  shippingAddress: string | null;
  contactPhone: string | null;
  orderItems: Array<{
    productId: string;
    productName: string;
    quantity: number;
    isStandaloneTopping?: boolean;
    selectedSize: string | null;
    sugarLevel: string | null;
    iceLevel: string | null;
    selectedToppings: string | null;
    subtotal: number;
  }>;
}

export interface LoyaltySummary {
  balance: number;
  transactions: Array<{
    id: string;
    type: string;
    points: number;
    balanceAfter: number;
    description: string | null;
    createdAt: string;
  }>;
}

export interface OrderHistoryItem {
  id: string;
  productName: string;
  quantity: number;
  isStandaloneTopping: boolean;
  selectedSize: string | null;
  sugarLevel: string | null;
  iceLevel: string | null;
  selectedToppings: string | null;
  subtotal: number;
}

export interface OrderHistoryEntry {
  id: string;
  orderCode: string;
  status: string;
  createdAt: string;
  totalAmount: number;
  shippingAddress: string | null;
  contactPhone: string | null;
  note: string | null;
  orderItems: OrderHistoryItem[];
}

export type PendingOrderAction = {
  type: 'configureProduct';
  product: Product;
  intent: OrderIntent;
};
