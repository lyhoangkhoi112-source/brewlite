import type {
  LoginResult,
  LoyaltySummary,
  OrderConfirmation,
  OrderHistoryEntry,
  PaymentMethod,
  Product,
} from './types';
import { productCategories } from './types';

export const guestOrderTokensKey = 'brewlite-guest-order-tokens';

export const apiUrl = (
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
).replace(/\/$/, '');

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function readErrorMessage(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) return fallback;

  const message = payload.message;
  if (typeof message === 'string') return message;
  if (Array.isArray(message)) {
    return message
      .filter((part): part is string => typeof part === 'string')
      .join(', ');
  }
  return fallback;
}

export function parseProducts(payload: unknown): Product[] {
  if (!Array.isArray(payload)) {
    throw new Error('Dữ liệu thực đơn từ máy chủ không hợp lệ.');
  }

  return payload.map((item: unknown) => {
    if (!isRecord(item)) {
      throw new Error('Dữ liệu món ăn từ máy chủ không hợp lệ.');
    }

    const price = Number(item.basePrice);
    const category = productCategories.find(
      (option) => option.value === item.category,
    )?.value;
    if (
      typeof item.id !== 'string' ||
      typeof item.name !== 'string' ||
      (item.category !== null &&
        item.category !== undefined &&
        category === undefined) ||
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
      category: category ?? null,
      price,
      imageUrl: item.imageUrl,
      stockQuantity: item.stockQuantity,
      status: item.status,
    };
  });
}

export function parseLoginResult(payload: unknown): LoginResult {
  if (!isRecord(payload) || !isRecord(payload.user)) {
    throw new Error('Phản hồi đăng nhập từ máy chủ không hợp lệ.');
  }

  const { user } = payload;
  if (
    typeof payload.accessToken !== 'string' ||
    typeof user.id !== 'string' ||
    typeof user.fullName !== 'string' ||
    typeof user.email !== 'string' ||
    (user.phone !== null &&
      user.phone !== undefined &&
      typeof user.phone !== 'string') ||
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
      phone: typeof user.phone === 'string' ? user.phone : null,
      role: user.role,
    },
  };
}

export function parseOrderConfirmation(payload: unknown): OrderConfirmation {
  if (
    !isRecord(payload) ||
    typeof payload.id !== 'string' ||
    typeof payload.orderCode !== 'string' ||
    typeof payload.status !== 'string' ||
    !Array.isArray(payload.orderItems) ||
    (payload.payments !== undefined && !Array.isArray(payload.payments))
  ) {
    throw new Error('Thông tin đơn hàng từ máy chủ không hợp lệ.');
  }

  const totalAmount = Number(payload.totalAmount);
  const subtotal = Number(payload.subtotal ?? totalAmount);
  const discountAmount = Number(payload.discountAmount ?? 0);
  if (
    !Number.isFinite(totalAmount) ||
    !Number.isFinite(subtotal) ||
    !Number.isFinite(discountAmount)
  ) {
    throw new Error('Tổng tiền đơn hàng từ máy chủ không hợp lệ.');
  }

  const orderItems = payload.orderItems.map((item: unknown) => {
    if (
      !isRecord(item) ||
      typeof item.productId !== 'string' ||
      typeof item.productName !== 'string' ||
      typeof item.quantity !== 'number' ||
      (typeof item.subtotal !== 'string' && typeof item.subtotal !== 'number')
    ) {
      throw new Error('Chi tiết món hàng từ máy chủ không hợp lệ.');
    }

    const subtotal = Number(item.subtotal);
    if (!Number.isFinite(subtotal)) {
      throw new Error('Thành tiền món hàng từ máy chủ không hợp lệ.');
    }

    return {
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      selectedSize:
        typeof item.selectedSize === 'string' ? item.selectedSize : null,
      sugarLevel: typeof item.sugarLevel === 'string' ? item.sugarLevel : null,
      iceLevel: typeof item.iceLevel === 'string' ? item.iceLevel : null,
      selectedToppings:
        typeof item.selectedToppings === 'string'
          ? item.selectedToppings
          : null,
      subtotal,
    };
  });
  const payments = (payload.payments ?? []).map((value: unknown) => {
    if (
      !isRecord(value) ||
      typeof value.id !== 'string' ||
      (typeof value.amount !== 'string' && typeof value.amount !== 'number') ||
      typeof value.status !== 'string' ||
      (value.method !== 'MOMO' &&
        value.method !== 'VNPAY' &&
        value.method !== 'SHOPEEPAY')
    ) {
      throw new Error('Thông tin thanh toán từ máy chủ không hợp lệ.');
    }

    const amount = Number(value.amount);
    if (!Number.isFinite(amount)) {
      throw new Error('Số tiền thanh toán từ máy chủ không hợp lệ.');
    }
    const method: PaymentMethod =
      value.method === 'MOMO'
        ? 'MOMO'
        : value.method === 'VNPAY'
          ? 'VNPAY'
          : 'SHOPEEPAY';
    return {
      id: value.id,
      amount,
      method,
      status: value.status,
    };
  });

  return {
    id: payload.id,
    orderCode: payload.orderCode,
    status: payload.status,
    rejectionReason:
      typeof payload.rejectionReason === 'string'
        ? payload.rejectionReason
        : null,
    subtotal,
    discountAmount,
    totalAmount,
    payments,
    note: typeof payload.note === 'string' ? payload.note : null,
    shippingAddress:
      typeof payload.shippingAddress === 'string'
        ? payload.shippingAddress
        : null,
    contactPhone:
      typeof payload.contactPhone === 'string' ? payload.contactPhone : null,
    orderItems,
  };
}

export function parseLoyaltySummary(payload: unknown): LoyaltySummary {
  if (
    !isRecord(payload) ||
    typeof payload.balance !== 'number' ||
    !Array.isArray(payload.transactions)
  ) {
    throw new Error('Thông tin điểm khách hàng từ máy chủ không hợp lệ.');
  }
  return {
    balance: payload.balance,
    transactions: payload.transactions.map((transaction: unknown) => {
      if (
        !isRecord(transaction) ||
        typeof transaction.id !== 'string' ||
        typeof transaction.type !== 'string' ||
        typeof transaction.points !== 'number' ||
        typeof transaction.balanceAfter !== 'number' ||
        typeof transaction.createdAt !== 'string' ||
        (transaction.description !== null &&
          typeof transaction.description !== 'string')
      ) {
        throw new Error('Lịch sử điểm khách hàng từ máy chủ không hợp lệ.');
      }
      return {
        id: transaction.id,
        type: transaction.type,
        points: transaction.points,
        balanceAfter: transaction.balanceAfter,
        description:
          typeof transaction.description === 'string'
            ? transaction.description
            : null,
        createdAt: transaction.createdAt,
      };
    }),
  };
}

export function parseOrderHistory(payload: unknown): OrderHistoryEntry[] {
  if (!Array.isArray(payload)) {
    throw new Error('Danh sách đơn hàng từ máy chủ không hợp lệ.');
  }

  return payload.map((value: unknown) => {
    if (
      !isRecord(value) ||
      typeof value.id !== 'string' ||
      typeof value.orderCode !== 'string' ||
      typeof value.status !== 'string' ||
      typeof value.canRetryPayment !== 'boolean' ||
      typeof value.createdAt !== 'string' ||
      !Array.isArray(value.orderItems)
    ) {
      throw new Error('Thông tin đơn hàng từ máy chủ không hợp lệ.');
    }

    const totalAmount = Number(value.totalAmount);
    const subtotal = Number(value.subtotal ?? totalAmount);
    const discountAmount = Number(value.discountAmount ?? 0);
    if (
      !Number.isFinite(totalAmount) ||
      !Number.isFinite(subtotal) ||
      !Number.isFinite(discountAmount)
    ) {
      throw new Error('Tổng tiền đơn hàng từ máy chủ không hợp lệ.');
    }

    const orderItems = value.orderItems.map((item: unknown) => {
      if (
        !isRecord(item) ||
        typeof item.id !== 'string' ||
        typeof item.productName !== 'string' ||
        typeof item.quantity !== 'number' ||
        !isRecord(item.product)
      ) {
        throw new Error('Chi tiết món hàng từ máy chủ không hợp lệ.');
      }

      const subtotal = Number(item.subtotal);
      if (!Number.isFinite(subtotal)) {
        throw new Error('Thành tiền món hàng từ máy chủ không hợp lệ.');
      }

      return {
        id: item.id,
        productName: item.productName,
        quantity: item.quantity,
        isStandaloneTopping: item.product.category === 'TOPPING',
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
      id: value.id,
      orderCode: value.orderCode,
      status: value.status,
      canRetryPayment: value.canRetryPayment,
      createdAt: value.createdAt,
      subtotal,
      discountAmount,
      totalAmount,
      shippingAddress:
        typeof value.shippingAddress === 'string'
          ? value.shippingAddress
          : null,
      contactPhone:
        typeof value.contactPhone === 'string' ? value.contactPhone : null,
      note: typeof value.note === 'string' ? value.note : null,
      rejectionReason:
        typeof value.rejectionReason === 'string'
          ? value.rejectionReason
          : null,
      orderItems,
    };
  });
}

export function getGuestOrderTokens(): string[] {
  const stored = window.localStorage.getItem(guestOrderTokensKey);
  if (stored === null) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    throw new Error(
      'Không thể đọc thông tin truy cập đơn hàng trên thiết bị này.',
    );
  }

  if (
    !Array.isArray(parsed) ||
    !parsed.every(
      (token) => typeof token === 'string' && /^[a-f0-9]{64}$/i.test(token),
    )
  ) {
    throw new Error('Thông tin truy cập đơn hàng trên thiết bị không hợp lệ.');
  }
  return parsed;
}
