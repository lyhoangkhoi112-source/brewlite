'use client';

import type { AuthenticatedUser } from '../types';

interface MenuHeaderProps {
  user: AuthenticatedUser | null;
  cartCount: number;
  onOpenOrders: () => void;
  onOpenCart: () => void;
  onLogout: () => void;
  onLogin: () => void;
  onHome: () => void;
}

export function MenuHeader({
  user,
  cartCount,
  onOpenOrders,
  onOpenCart,
  onLogout,
  onLogin,
  onHome,
}: MenuHeaderProps) {
  return (
    <header className="border-b border-[#e7e2d7] bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <div>
          <p className="text-sm font-semibold tracking-wide text-[#59775e]">
            BREWLITE
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Thực đơn hôm nay
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenOrders}
            className="rounded-full border border-[#dce2da] px-4 py-2 text-sm font-semibold text-[#405d47] hover:bg-[#f4f7f2]"
          >
            Đơn hàng
          </button>
          <button
            type="button"
            onClick={onOpenCart}
            className="rounded-full bg-[#edf2e9] px-4 py-2 text-sm font-semibold text-[#405d47] hover:bg-[#e2ecdf]"
            aria-label={`Mở giỏ hàng, ${cartCount} sản phẩm`}
          >
            Giỏ hàng · {cartCount}
          </button>
          {user ? (
            <>
              <span className="hidden text-sm font-medium text-[#46544a] sm:inline">
                {user.fullName}
              </span>
              <button
                type="button"
                onClick={onLogout}
                className="text-sm font-medium text-[#647268] hover:text-[#304b39]"
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onLogin}
              className="text-sm font-medium text-[#405d47] hover:text-[#243b2c]"
            >
              Đăng nhập
            </button>
          )}
          <button
            type="button"
            onClick={onHome}
            className="hidden text-sm font-medium text-[#647268] hover:text-[#304b39] sm:block"
          >
            Trang chủ
          </button>
        </div>
      </div>
    </header>
  );
}
