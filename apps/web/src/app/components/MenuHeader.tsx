'use client';

import type { AuthenticatedUser } from '../types';

interface MenuHeaderProps {
  user: AuthenticatedUser | null;
  cartCount: number;
  selectedCategoryLabel: string;
  categoryMenuOpen: boolean;
  onOpenOrders: () => void;
  onChangePassword: () => void;
  onOpenCart: () => void;
  onOpenCategories: () => void;
  onLogout: () => void;
  onLogin: () => void;
  onHome: () => void;
}

export function MenuHeader({
  user,
  cartCount,
  selectedCategoryLabel,
  categoryMenuOpen,
  onOpenOrders,
  onChangePassword,
  onOpenCart,
  onOpenCategories,
  onLogout,
  onLogin,
  onHome,
}: MenuHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#e7e2d7] bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-8 sm:py-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenCategories}
            aria-expanded={categoryMenuOpen}
            aria-label={`Chọn danh mục, hiện tại: ${selectedCategoryLabel}`}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#dce2da] bg-white text-lg text-[#405d47] hover:bg-[#f4f7f2]"
          >
            ☰
          </button>
          <div>
            <p className="text-xs font-semibold tracking-wide text-[#59775e] sm:text-sm">
              BREWLITE
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
              Thực đơn hôm nay
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onOpenOrders}
            className="min-h-11 rounded-full border border-[#dce2da] px-3 py-2 text-xs font-semibold text-[#405d47] hover:bg-[#f4f7f2] sm:px-4 sm:text-sm"
          >
            Đơn hàng
          </button>
          <button
            type="button"
            onClick={onOpenCart}
            className="min-h-11 rounded-full bg-[#edf2e9] px-3 py-2 text-xs font-semibold text-[#405d47] hover:bg-[#e2ecdf] sm:px-4 sm:text-sm"
            aria-label={`Mở giỏ hàng, ${cartCount} sản phẩm`}
          >
            Giỏ hàng · {cartCount}
          </button>
          {user ? (
            <>
              {user.role === 'CUSTOMER' && (
                <button
                  type="button"
                  onClick={onChangePassword}
                  className="min-h-11 px-2 text-sm font-medium text-[#647268] hover:text-[#304b39]"
                >
                  Đổi mật khẩu
                </button>
              )}
              <span className="hidden text-sm font-medium text-[#46544a] sm:inline">
                {user.fullName}
              </span>
              <button
                type="button"
                onClick={onLogout}
                className="min-h-11 px-2 text-sm font-medium text-[#647268] hover:text-[#304b39]"
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onLogin}
              className="min-h-11 px-2 text-sm font-medium text-[#405d47] hover:text-[#243b2c]"
            >
              Đăng nhập
            </button>
          )}
          <button
            type="button"
            onClick={onHome}
            className="hidden min-h-11 px-2 text-sm font-medium text-[#647268] hover:text-[#304b39] sm:block"
          >
            Trang chủ
          </button>
        </div>
      </div>
    </header>
  );
}
