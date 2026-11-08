'use client';

import { useState, useEffect } from 'react';

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY';

interface Order {
  id: string;
  customer: string;
  items: string[];
  total: number;
  status: OrderStatus;
  note?: string;
}

const statusInfo: Record<OrderStatus, { label: string; color: string; background: string }> = {
  PENDING: { label: 'Đơn mới', color: '#9A5B20', background: '#FFF0D9' },
  CONFIRMED: { label: 'Đã nhận', color: '#4169A1', background: '#E6F0FF' },
  PREPARING: { label: 'Đang pha chế', color: '#8A5A9E', background: '#F3E8FA' },
  READY: { label: 'Sẵn sàng', color: '#28764A', background: '#E1F3E7' },
};

export default function StaffPage() {
  // Trạng thái đăng nhập & Đăng ký
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Form đăng nhập/đăng ký
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [staffName, setStaffName] = useState('Nhân viên');

  // Trạng thái đơn hàng & bộ lọc
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState('ALL');

  // ==================== TỰ ĐỒNG BỘ ĐƠN HÀNG TỪ LOCALSTORAGE ====================
  useEffect(() => {
    if (!isLoggedIn) return;

    // Hàm đọc danh sách đơn từ LocalStorage
    const loadOrdersFromStorage = () => {
      const data = localStorage.getItem('brewlite_orders');
      if (data) {
        try {
          const parsedOrders = JSON.parse(data);
          setOrders(parsedOrders);
        } catch (e) {
          console.error('Lỗi đọc đơn hàng từ LocalStorage:', e);
        }
      }
    };

    // Đọc ngay khi đăng nhập thành công
    loadOrdersFromStorage();

    // Tự động kiểm tra đơn hàng mới mỗi 1.5 giây
    const interval = setInterval(loadOrdersFromStorage, 1500);

    // Lắng nghe sự kiện thay đổi bộ nhớ giữa các tab trình duyệt
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'brewlite_orders') {
        loadOrdersFromStorage();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [isLoggedIn]);

  // Hàm cập nhật trạng thái đơn hàng (Nhận đơn -> Pha chế -> Sẵn sàng)
  function updateStatus(id: string, status: OrderStatus) {
    const updatedOrders = orders.map((order) =>
      order.id === id ? { ...order, status } : order
    );
    setOrders(updatedOrders);
    // Lưu lại trạng thái mới vào LocalStorage để khách cũng có thể thấy
    localStorage.setItem('brewlite_orders', JSON.stringify(updatedOrders));
  }

  function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (authMode === 'REGISTER' && password !== confirmPassword) {
      alert('Mật khẩu xác nhận không khớp!');
      return;
    }
    const name = fullName.trim() || (email ? email.split('@')[0] : 'Nhân viên');
    setStaffName(name.charAt(0).toUpperCase() + name.slice(1));
    setIsLoggedIn(true);
  }

  function handleLogout() {
    setIsLoggedIn(false);
    setEmail('');
    setPassword('');
  }

  const filteredOrders = orders.filter(
    (order) => filter === 'ALL' || order.status === filter
  );

  const stats = [
    { label: 'Đơn mới', value: orders.filter((o) => o.status === 'PENDING').length, color: '#C28B55' },
    { label: 'Đang pha chế', value: orders.filter((o) => o.status === 'PREPARING').length, color: '#8A5A9E' },
    { label: 'Sẵn sàng', value: orders.filter((o) => o.status === 'READY').length, color: '#28764A' },
  ];

  // ==================== GIAO DIỆN ĐĂNG NHẬP / ĐĂNG KÝ ====================
  if (!isLoggedIn) {
    return (
      <main style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        background: '#F7F4ED',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}>
        {/* BANNER TRÁI */}
        <div style={{
          background: '#294735',
          color: 'white',
          padding: '60px 8%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 80 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#C28B55', color: 'white', display: 'grid', placeItems: 'center', fontWeight: 800 }}>B</div>
              <span style={{ fontWeight: 800, letterSpacing: 2, fontSize: 18 }}>BREWLITE</span>
            </div>
            <div style={{ color: '#C28B55', fontSize: 12, fontWeight: 700, letterSpacing: 2, marginBottom: 16 }}>KHÔNG GIAN VẬN HÀNH</div>
            <h1 style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.25, marginBottom: 24 }}>Pha chế tỉ mỉ,<br />phục vụ tận tâm.</h1>
            <p style={{ color: '#D2DEC9', fontSize: 16, lineHeight: 1.6, maxWidth: 420 }}>Theo dõi danh sách order, cập nhật trạng thái món ăn & đồ uống tức thì cho khách hàng.</p>
          </div>
          <div style={{ fontSize: 12, color: '#839E8C', marginTop: 40 }}>BrewLite · Trang dành riêng cho nhân viên</div>
        </div>

        {/* FORM PHẢI */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 10%', background: '#F7F4ED' }}>
          <div style={{ maxWidth: 400, width: '100%', margin: '0 auto' }}>
            <div style={{ color: '#A66B3F', fontSize: 12, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>KHU VỰC NHÂN VIÊN</div>
            <h2 style={{ fontSize: 32, fontWeight: 800, color: '#294735', margin: '0 0 8px 0' }}>
              {authMode === 'LOGIN' ? 'Chào mừng trở lại' : 'Tạo tài khoản mới'}
            </h2>
            <p style={{ color: '#777', fontSize: 14, marginBottom: 28 }}>
              {authMode === 'LOGIN' ? 'Đăng nhập bằng tài khoản nhân viên để tiếp tục.' : 'Điền thông tin bên dưới để đăng ký tài khoản nhân viên.'}
            </p>

            <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {authMode === 'REGISTER' && (
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 8 }}>Họ và tên</label>
                  <input type="text" required placeholder="Nguyễn Văn A" value={fullName} onChange={(e) => setFullName(e.target.value)} style={inputStyle} />
                </div>
              )}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 8 }}>Email</label>
                <input type="email" required placeholder="staff@brewlite.vn" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 8 }}>Mật khẩu</label>
                <input type="password" required placeholder="Nhập mật khẩu" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
              </div>
              {authMode === 'REGISTER' && (
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 8 }}>Xác nhận mật khẩu</label>
                  <input type="password" required placeholder="Nhập lại mật khẩu" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={inputStyle} />
                </div>
              )}
              <button type="submit" style={{ width: '100%', background: '#294735', color: 'white', border: 'none', padding: '14px', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: 'pointer', marginTop: 6 }}>
                {authMode === 'LOGIN' ? 'Đăng nhập nhân viên' : 'Đăng ký nhân viên'}
              </button>
            </form>

            <div style={{ marginTop: 24, textAlign: 'center', fontSize: 14, color: '#666' }}>
              {authMode === 'LOGIN' ? (
                <span>Chưa có tài khoản? <button onClick={() => setAuthMode('REGISTER')} style={{ background: 'none', border: 'none', color: '#A66B3F', fontWeight: 700, cursor: 'pointer' }}>Đăng ký ngay</button></span>
              ) : (
                <span>Đã có tài khoản? <button onClick={() => setAuthMode('LOGIN')} style={{ background: 'none', border: 'none', color: '#294735', fontWeight: 700, cursor: 'pointer' }}>Đăng nhập</button></span>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ==================== GIAO DIỆN QUẢN LÝ ĐƠN HÀNG ====================
  return (
    <main style={{ minHeight: '100vh', background: '#F7F4ED', color: '#26382D', fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* HEADER */}
      <header style={{ background: '#294735', color: 'white', padding: '20px 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>BrewLite</div>
          <div style={{ fontSize: 13, opacity: 0.8 }}>STAFF ORDER MANAGEMENT</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>{staffName}</span>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#E8DCC7', color: '#294735', display: 'grid', placeItems: 'center', fontWeight: 700 }}>
              {staffName.substring(0, 2).toUpperCase()}
            </div>
          </div>
          <button onClick={handleLogout} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.3)', color: 'white', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>
            Đăng xuất
          </button>
        </div>
      </header>

      {/* BODY CONTENT */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 20px' }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ color: '#A66B3F', fontSize: 12, fontWeight: 700, letterSpacing: 2 }}>ORDER MANAGEMENT</div>
          <h1 style={{ fontSize: 32, margin: '10px 0' }}>Quản lý đơn hàng</h1>
          <p style={{ color: '#777', margin: 0 }}>Theo dõi và xử lý đơn hàng tự động từ khách hàng.</p>
        </div>

        {/* THỐNG KÊ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
          {stats.map((stat) => (
            <div key={stat.label} style={{ background: 'white', padding: 22, borderRadius: 16, border: '1px solid #E8E1D6' }}>
              <div style={{ fontSize: 14, color: '#777', marginBottom: 12 }}>{stat.label}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* DANH SÁCH ĐƠN HÀNG */}
        <div style={{ background: 'white', border: '1px solid #E8E1D6', borderRadius: 18, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
            <h2 style={{ margin: 0, fontSize: 21 }}>Danh sách đơn hàng</h2>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #D9D9D9', background: 'white', color: '#294735', cursor: 'pointer' }}>
              <option value="ALL">Tất cả đơn hàng</option>
              <option value="PENDING">Đơn mới</option>
              <option value="CONFIRMED">Đã nhận</option>
              <option value="PREPARING">Đang pha chế</option>
              <option value="READY">Sẵn sàng</option>
            </select>
          </div>

          {filteredOrders.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>
              Chưa có đơn hàng nào từ khách.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
              {filteredOrders.map((order) => (
                <div key={order.id} style={{ border: '1px solid #E8E1D6', borderRadius: 14, padding: 18, background: '#FFFEFC', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                      <strong>{order.id}</strong>
                      <span style={{ background: statusInfo[order.status]?.background || '#eee', color: statusInfo[order.status]?.color || '#333', padding: '6px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                        {statusInfo[order.status]?.label || order.status}
                      </span>
                    </div>

                    <div style={{ fontWeight: 700, marginBottom: 8 }}>{order.customer}</div>

                    <div style={{ color: '#555', fontSize: 14, lineHeight: 1.8, minHeight: 56 }}>
                      {order.items.map((item, index) => (
                        <div key={index}>{item}</div>
                      ))}
                    </div>

                    {order.note && (
                      <div style={{ fontSize: 12, color: '#A66B3F', background: '#FFF9F2', padding: 8, borderRadius: 6, marginTop: 8 }}>
                        Ghi chú: {order.note}
                      </div>
                    )}
                  </div>

                  <div>
                    <div style={{ borderTop: '1px solid #EEE7DC', marginTop: 16, paddingTop: 14, fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                      <span>Tổng tiền</span>
                      <span>{order.total.toLocaleString('vi-VN')}đ</span>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
                      {order.status === 'PENDING' && (
                        <button onClick={() => updateStatus(order.id, 'CONFIRMED')} style={buttonStyle}>Nhận đơn</button>
                      )}
                      {order.status === 'CONFIRMED' && (
                        <button onClick={() => updateStatus(order.id, 'PREPARING')} style={buttonStyle}>Bắt đầu pha chế</button>
                      )}
                      {order.status === 'PREPARING' && (
                        <button onClick={() => updateStatus(order.id, 'READY')} style={buttonStyle}>Đánh dấu sẵn sàng</button>
                      )}
                      {order.status === 'READY' && (
                        <div style={{ textAlign: 'center', color: '#28764A', background: '#E1F3E7', padding: 10, borderRadius: 10, fontWeight: 700, fontSize: 13 }}>
                          ✓ Đã sẵn sàng phục vụ
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

const inputStyle = {
  width: '100%',
  padding: '14px 16px',
  borderRadius: 10,
  border: '1px solid #E0D8CC',
  background: 'white',
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box' as const,
};

const buttonStyle = {
  background: '#294735',
  color: 'white',
  border: 'none',
  borderRadius: 10,
  padding: '12px 16px',
  cursor: 'pointer',
  fontWeight: 700,
  fontSize: 13,
};