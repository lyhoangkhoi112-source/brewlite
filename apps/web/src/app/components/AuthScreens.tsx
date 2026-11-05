'use client';

import type { FormEvent } from 'react';
import type { Screen } from '../types';

interface AuthScreensProps {
  screen: Screen;
  email: string;
  password: string;
  loginError: string | null;
  loginNotice: string | null;
  isSubmitting: boolean;
  registerFullName: string;
  registerEmail: string;
  registerPassword: string;
  registerPhone: string;
  registerError: string | null;
  isRegistering: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onRegisterFullNameChange: (value: string) => void;
  onRegisterEmailChange: (value: string) => void;
  onRegisterPasswordChange: (value: string) => void;
  onRegisterPhoneChange: (value: string) => void;
  onLogin: (event: FormEvent<HTMLFormElement>) => void;
  onRegister: (event: FormEvent<HTMLFormElement>) => void;
  onReturn: () => void;
  onOpenMenu: () => void;
  onOpenLogin: () => void;
  onOpenRegister: () => void;
}

export function AuthScreens(props: AuthScreensProps) {
  const {
    screen,
    email,
    password,
    loginError,
    loginNotice,
    isSubmitting,
    registerFullName,
    registerEmail,
    registerPassword,
    registerPhone,
    registerError,
    isRegistering,
    onEmailChange,
    onPasswordChange,
    onRegisterFullNameChange,
    onRegisterEmailChange,
    onRegisterPasswordChange,
    onRegisterPhoneChange,
    onLogin,
    onRegister,
    onReturn,
    onOpenMenu,
    onOpenLogin,
    onOpenRegister,
  } = props;

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
              onClick={onOpenLogin}
              className="rounded-xl bg-[#304b39] px-6 py-3.5 font-semibold text-white transition hover:bg-[#243b2c]"
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={onOpenMenu}
              className="rounded-xl border border-[#d8dfd6] px-6 py-3.5 font-semibold text-[#304b39] transition hover:bg-[#f4f7f2]"
            >
              Xem thực đơn
            </button>
            <button
              type="button"
              onClick={onOpenRegister}
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
            onClick={onReturn}
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
          <form onSubmit={onLogin} className="mt-8 space-y-5">
            <label className="block text-sm font-medium text-[#46544a]">
              Email
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => onEmailChange(event.target.value)}
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
                onChange={(event) => onPasswordChange(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[#dce2da] bg-white px-4 py-3 text-base outline-none transition placeholder:text-[#a1aaa2] focus:border-[#59775e] focus:ring-4 focus:ring-[#59775e]/10"
                placeholder="Nhập mật khẩu"
              />
            </label>
            {loginError && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
              >
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
            onClick={onOpenMenu}
            className="mt-5 w-full text-center text-sm font-medium text-[#647268] hover:text-[#304b39]"
          >
            Tiếp tục xem thực đơn
          </button>
          <button
            type="button"
            onClick={onOpenRegister}
            className="mt-3 w-full text-center text-sm font-semibold text-[#405d47] hover:text-[#243b2c]"
          >
            Chưa có tài khoản? Đăng ký
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f4ed] px-5 py-12 text-[#26352c]">
      <section className="w-full max-w-md rounded-[2rem] border border-[#e8e1d3] bg-white p-7 shadow-[0_24px_80px_rgba(47,57,45,0.10)] sm:p-10">
        <button
          type="button"
          onClick={onReturn}
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
        <form onSubmit={onRegister} className="mt-7 space-y-4">
          <label className="block text-sm font-medium text-[#46544a]">
            Họ và tên
            <input
              type="text"
              autoComplete="name"
              minLength={2}
              required
              value={registerFullName}
              onChange={(event) => onRegisterFullNameChange(event.target.value)}
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
              onChange={(event) => onRegisterEmailChange(event.target.value)}
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
              onChange={(event) => onRegisterPasswordChange(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#dce2da] px-4 py-3 outline-none transition focus:border-[#59775e] focus:ring-4 focus:ring-[#59775e]/10"
              placeholder="Tạo mật khẩu"
            />
          </label>
          <label className="block text-sm font-medium text-[#46544a]">
            Số điện thoại{' '}
            <span className="font-normal text-[#818a81]">(không bắt buộc)</span>
            <input
              type="tel"
              autoComplete="tel"
              value={registerPhone}
              onChange={(event) => onRegisterPhoneChange(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#dce2da] px-4 py-3 outline-none transition focus:border-[#59775e] focus:ring-4 focus:ring-[#59775e]/10"
              placeholder="0901234567"
            />
          </label>
          {registerError && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
            >
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
          onClick={onOpenLogin}
          className="mt-5 w-full text-center text-sm font-medium text-[#647268] hover:text-[#304b39]"
        >
          Đã có tài khoản? Đăng nhập
        </button>
      </section>
    </main>
  );
}
