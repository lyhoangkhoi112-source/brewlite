'use client';

interface GuestCheckoutDialogProps {
  open: boolean;
  onLogin: () => void;
  onContinueAsGuest: () => void;
  onCancel: () => void;
}

export function GuestCheckoutDialog({
  open,
  onLogin,
  onContinueAsGuest,
  onCancel,
}: GuestCheckoutDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-choice-heading"
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
      >
        <h2 id="login-choice-heading" className="text-xl font-semibold">
          Bạn muốn đăng nhập không?
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#69746b]">
          Đăng nhập để gắn đơn hàng với tài khoản, hoặc tiếp tục đặt hàng không
          cần tạo tài khoản.
        </p>
        <div className="mt-6 grid gap-3">
          <button
            type="button"
            onClick={onLogin}
            className="rounded-xl border border-[#dce2da] px-4 py-3 font-semibold text-[#405d47] hover:bg-[#f4f7f2]"
          >
            Đăng nhập
          </button>
          <button
            type="button"
            onClick={onContinueAsGuest}
            className="rounded-xl bg-[#304b39] px-4 py-3 font-semibold text-white hover:bg-[#243b2c]"
          >
            Tiếp tục không đăng nhập
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl px-4 py-2 text-sm text-[#69746b] hover:bg-[#f7f4ed]"
          >
            Hủy
          </button>
        </div>
      </section>
    </div>
  );
}
