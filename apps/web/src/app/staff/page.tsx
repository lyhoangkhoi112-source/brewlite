import type { Metadata } from 'next';
import StaffDashboard from './staff-dashboard';

export const metadata: Metadata = {
  title: 'Nhân viên | BrewLite',
  description: 'Quản lý và cập nhật đơn hàng BrewLite.',
};

export default function StaffPage() {
  return <StaffDashboard />;
}
