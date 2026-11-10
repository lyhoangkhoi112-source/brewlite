import { Suspense } from 'react';
import { MockCheckoutRoute } from '../components/MockCheckoutRoute';

export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f7f4ed] px-4 text-[#69746b]">
          Đang mở trang thanh toán...
        </main>
      }
    >
      <MockCheckoutRoute />
    </Suspense>
  );
}
