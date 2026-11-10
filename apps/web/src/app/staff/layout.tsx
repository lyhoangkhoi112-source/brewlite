import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Nhân viên | BrewLite',
  description: 'Quản lý và cập nhật đơn hàng BrewLite.',
};

export default function StaffLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
