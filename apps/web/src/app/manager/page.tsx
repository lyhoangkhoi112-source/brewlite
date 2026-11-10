import type { Metadata } from 'next';
import ManagerDashboard from './manager-dashboard';

export const metadata: Metadata = {
  title: 'Quản lý | BrewLite',
  description: 'Quản lý doanh thu, sản phẩm và tài khoản BrewLite.',
};

export default function ManagerPage() {
  return <ManagerDashboard />;
}
