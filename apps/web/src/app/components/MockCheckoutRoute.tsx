'use client';

import { useSearchParams } from 'next/navigation';
import { MockCheckoutPage } from './MockCheckoutPage';

export function MockCheckoutRoute() {
  const searchParams = useSearchParams();
  return (
    <MockCheckoutPage
      paymentId={searchParams.get('paymentId') ?? ''}
      paymentMethod={searchParams.get('paymentMethod') ?? undefined}
    />
  );
}
