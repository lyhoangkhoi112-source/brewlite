'use client';

import Image from 'next/image';
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
      <main id="top" className="min-h-screen bg-[#f7f5ef] text-[#26352c]">
        <header className="border-b border-[#e8e4da] bg-[#fbfaf7]">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-8">
            <a href="#home" className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#294432] text-lg font-bold text-white">
                B
              </span>
              <span className="text-sm font-bold tracking-[0.2em] text-[#294432]">
                BREWLITE
              </span>
            </a>
            <nav className="flex items-center gap-2 sm:gap-3">
              <a
                href="#contact"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#d8dfd6] bg-white/70 px-4 text-sm font-semibold text-[#304b39] transition hover:bg-[#edf2e9]"
              >
                Liên hệ
              </a>
              <a
                href="#about"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#304b39] px-4 text-sm font-semibold text-white transition hover:bg-[#243b2c]"
              >
                Về cửa hàng
              </a>
            </nav>
          </div>
        </header>

        <div
          id="home"
          className="mx-auto grid max-w-7xl gap-8 px-4 py-7 sm:px-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-12"
        >
          <div className="min-w-0">
            <section className="relative isolate overflow-hidden rounded-[2rem] bg-[#294432] text-white shadow-[0_24px_70px_rgba(41,68,50,0.16)]">
              <div className="absolute inset-y-0 right-0 -z-10 w-full sm:w-[56%]">
                <Image
                  src="/product/5.png"
                  alt=""
                  fill
                  loading="eager"
                  sizes="(max-width: 640px) 100vw, 56vw"
                  className="object-cover object-center opacity-55 sm:opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#294432] via-[#294432]/90 to-[#294432]/20 sm:from-[#294432] sm:via-[#294432]/60 sm:to-transparent" />
              </div>
              <div className="max-w-2xl px-6 py-12 sm:px-10 sm:py-16 lg:px-12 lg:py-20">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#e2bd91] sm:text-sm">
                  Cà phê, theo cách của bạn
                </p>
                <h1 className="mt-4 max-w-xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                  Một ly ngon,
                  <br />
                  bắt đầu ngày mới.
                </h1>
                <p className="mt-5 max-w-lg text-sm leading-7 text-white/75 sm:text-base">
                  Chọn món bạn yêu thích, tùy chỉnh theo khẩu vị và đặt hàng
                  trực tuyến thật thuận tiện.
                </p>
                <button
                  type="button"
                  onClick={onOpenMenu}
                  className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#e6bd8b] px-6 py-3 font-semibold text-[#263b2d] transition hover:bg-[#f0cda1]"
                >
                  Khám phá thực đơn <span aria-hidden="true">→</span>
                </button>
              </div>
              <div className="absolute bottom-5 right-6 hidden rounded-full border border-white/25 bg-black/15 px-4 py-2 text-xs font-medium text-white/90 backdrop-blur sm:block">
                BrewLite · Cà phê mỗi ngày
              </div>
            </section>

            <section
              id="about"
              className="mt-8 space-y-5 sm:mt-10 sm:space-y-7"
            >
              <header className="px-1 py-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a6d3e]">
                  Về cửa hàng
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#26352c] sm:text-4xl">
                  BrewLite – Một ly ngon bắt đầu ngày mới
                </h2>
                <p className="mt-3 text-sm text-[#69746b]">
                  Đồ uống yêu thích, đặt hàng dễ dàng, đồng hành mỗi ngày.
                </p>
              </header>

              <article className="relative isolate min-h-[430px] overflow-hidden rounded-[2rem] bg-[#294432] text-white shadow-[0_24px_70px_rgba(41,68,50,0.16)] sm:min-h-[470px]">
                <div className="absolute inset-0 -z-10">
                  <Image
                    src="/product/1.png"
                    alt="Cà phê sữa BrewLite"
                    fill
                    sizes="(max-width: 768px) 100vw, 80vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#294432] via-[#294432]/90 to-[#294432]/20 sm:from-[#294432] sm:via-[#294432]/75 sm:to-transparent" />
                </div>
                <div className="flex min-h-[430px] max-w-3xl flex-col justify-center px-6 py-10 sm:min-h-[470px] sm:px-10 lg:px-16">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#e2bd91]">
                    Câu chuyện của BrewLite
                  </p>
                  <h3 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                    Một ly ngon,
                    <br />
                    bắt đầu ngày mới.
                  </h3>
                  <p className="mt-5 max-w-2xl text-sm leading-7 text-white/85 sm:text-base">
                    Mỗi ngày có một nhịp sống riêng. BrewLite ra đời để bạn
                    dễ dàng đặt món yêu thích nhanh chóng, tiện lợi và thân
                    thiện — từ ly cà phê đầu ngày đến thức uống mát lạnh giờ
                    nghỉ.
                  </p>
                </div>
                <span className="absolute bottom-5 right-6 hidden rounded-full border border-white/25 bg-black/15 px-4 py-2 text-xs font-medium text-white/90 backdrop-blur sm:block">
                  BrewLite · Cà phê mỗi ngày
                </span>
              </article>

              <article className="relative isolate min-h-[360px] overflow-hidden rounded-[2rem] bg-[#294432] text-white shadow-[0_24px_70px_rgba(41,68,50,0.16)] sm:min-h-[400px]">
                <div className="absolute inset-0 -z-10">
                  <Image
                    src="/product/2.png"
                    alt="Thức uống trong thực đơn BrewLite"
                    fill
                    sizes="(max-width: 768px) 100vw, 80vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#294432] via-[#294432]/90 to-[#294432]/20 sm:from-[#294432] sm:via-[#294432]/75 sm:to-transparent" />
                </div>
                <div className="flex min-h-[360px] max-w-3xl flex-col justify-center px-6 py-10 sm:min-h-[400px] sm:px-10 lg:px-16">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#e2bd91]">
                    Đặt hàng & thanh toán
                  </p>
                  <h3 className="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                    Tiện lợi trong từng bước
                  </h3>
                  <p className="mt-5 max-w-2xl text-sm leading-7 text-white/85 sm:text-base">
                    Khám phá thực đơn, tùy chỉnh món và theo dõi đơn hàng ngay
                    trên ứng dụng — không cần xếp hàng. Các phương thức thanh
                    toán trực tuyến giúp bạn hoàn tất đơn dễ dàng, liền mạch
                    và không cần tiền mặt.
                  </p>
                </div>
              </article>

              <article className="relative isolate min-h-[380px] overflow-hidden rounded-[2rem] bg-[#294432] text-white shadow-[0_24px_70px_rgba(41,68,50,0.16)] sm:min-h-[420px]">
                <div className="absolute inset-0 -z-10">
                  <Image
                    src="/product/3.png"
                    alt="Thức uống yêu thích tại BrewLite"
                    fill
                    sizes="(max-width: 768px) 100vw, 80vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#294432] via-[#294432]/90 to-[#294432]/20 sm:from-[#294432] sm:via-[#294432]/75 sm:to-transparent" />
                </div>
                <div className="flex min-h-[380px] max-w-3xl flex-col justify-center px-6 py-10 sm:min-h-[420px] sm:px-10 lg:px-16">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#e2bd91]">
                    Sứ mệnh BrewLite
                  </p>
                  <h3 className="mt-4 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                    Hơn cả một ứng dụng đặt đồ uống
                  </h3>
                  <p className="mt-5 max-w-2xl text-sm leading-7 text-white/85 sm:text-base">
                    Chúng mình kết hợp công nghệ và sự tiện lợi để bạn dễ tìm
                    món hợp gu, tiết kiệm thời gian và tận hưởng những khoảnh
                    khắc nhỏ trong ngày. BrewLite không ngừng cải thiện trải
                    nghiệm để đồng hành cùng bạn mỗi ngày.
                  </p>
                  <button
                    type="button"
                    onClick={onOpenMenu}
                    className="mt-7 inline-flex min-h-12 self-start items-center justify-center gap-2 rounded-full bg-[#e6bd8b] px-6 py-3 font-semibold text-[#263b2d] transition hover:bg-[#f0cda1]"
                  >
                    Khám phá thực đơn <span aria-hidden="true">→</span>
                  </button>
                </div>
              </article>
            </section>

            <section id="contact" className="mt-8 rounded-2xl border border-[#e8e4da] bg-[#eeefe7] p-5 sm:mt-10 sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#59775e]">
                Ghé BrewLite
              </p>
              <h2 className="mt-2 text-xl font-semibold">Luôn sẵn sàng pha món bạn thích</h2>
              <div className="mt-4 grid gap-4 text-sm text-[#46544a] sm:grid-cols-3">
                <p>
                  <span className="block text-xs text-[#748076]">Giờ mở cửa</span>
                  Hằng ngày · 09:00–21:00
                </p>
                <a href="tel:19001900" className="hover:text-[#294432]">
                  <span className="block text-xs text-[#748076]">Điện thoại</span>
                  19001900
                </a>
                <a href="mailto:brewlite@gmail.com" className="break-all hover:text-[#294432]">
                  <span className="block text-xs text-[#748076]">Email</span>
                  brewlite@gmail.com
                </a>
              </div>
            </section>

            <footer className="py-7 text-xs text-[#879087]">
              © BrewLite · Cà phê mỗi ngày, theo cách của bạn.
            </footer>
          </div>

          <aside
            id="home-login"
            className="h-fit rounded-[1.75rem] border border-[#e8e4da] bg-white p-5 shadow-[0_18px_55px_rgba(47,57,45,0.09)] sm:p-7 lg:sticky lg:top-6"
          >
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9a6d3e]">
                Thành viên BrewLite
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Chào mừng trở lại
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#748076]">
                Đăng nhập để xem đơn hàng và sử dụng điểm thành viên.
              </p>
            </div>
            {loginNotice && (
              <p
                role="status"
                className="mb-4 rounded-xl bg-[#edf2e9] px-4 py-3 text-sm text-[#405d47]"
              >
                {loginNotice}
              </p>
            )}
            {loginError && (
              <p
                role="alert"
                className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {loginError}
              </p>
            )}
            <form onSubmit={onLogin} className="space-y-4">
              <label className="block text-sm font-medium text-[#46544a]">
                Email
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => onEmailChange(event.target.value)}
                  placeholder="ban@example.com"
                  className="mt-2 min-h-12 w-full rounded-xl border border-[#dce2da] bg-white px-4 text-base text-[#26352c] outline-none transition placeholder:text-[#a1aaa2] focus:border-[#59775e] focus:ring-4 focus:ring-[#59775e]/10"
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
                  placeholder="Nhập mật khẩu"
                  className="mt-2 min-h-12 w-full rounded-xl border border-[#dce2da] bg-white px-4 text-base text-[#26352c] outline-none transition placeholder:text-[#a1aaa2] focus:border-[#59775e] focus:ring-4 focus:ring-[#59775e]/10"
                />
              </label>
              <button
                type="submit"
                disabled={isSubmitting}
                className="min-h-12 w-full rounded-xl bg-[#304b39] px-5 py-3 font-semibold text-white transition hover:bg-[#243b2c] disabled:cursor-wait disabled:opacity-60"
              >
                {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>
            </form>
            <div className="my-5 flex items-center gap-3 text-xs text-[#9aa29a]">
              <span className="h-px flex-1 bg-[#edf0eb]" />
              hoặc
              <span className="h-px flex-1 bg-[#edf0eb]" />
            </div>
            <button
              type="button"
              onClick={onOpenRegister}
              className="min-h-11 w-full rounded-xl border border-[#d8dfd6] px-4 py-2.5 text-sm font-semibold text-[#304b39] transition hover:bg-[#f4f7f2]"
            >
              Tạo tài khoản mới
            </button>
            <button
              type="button"
              onClick={onOpenMenu}
              className="mt-3 min-h-11 w-full text-sm font-medium text-[#647268] transition hover:text-[#304b39]"
            >
              Tiếp tục với tư cách khách
            </button>
          </aside>
        </div>
        <a
          href="#top"
          aria-label="Trở về đầu trang"
          className="fixed bottom-5 right-5 z-20 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#304b39] text-xl font-semibold text-white shadow-lg transition hover:-translate-y-1 hover:bg-[#243b2c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#304b39]"
        >
          <span aria-hidden="true">↑</span>
        </a>
      </main>
    );
  }

  if (screen === 'login') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f4ed] px-3 py-6 text-[#26352c] sm:px-5 sm:py-12">
        <section className="w-full max-w-md rounded-[1.5rem] border border-[#e8e1d3] bg-white p-5 shadow-[0_24px_80px_rgba(47,57,45,0.10)] sm:rounded-[2rem] sm:p-10">
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
    <main className="flex min-h-screen items-center justify-center bg-[#f7f4ed] px-3 py-6 text-[#26352c] sm:px-5 sm:py-12">
      <section className="w-full max-w-md rounded-[1.5rem] border border-[#e8e1d3] bg-white p-5 shadow-[0_24px_80px_rgba(47,57,45,0.10)] sm:rounded-[2rem] sm:p-10">
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
