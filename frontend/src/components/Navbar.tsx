import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import NotificationDropdown from './notifications/NotificationDropdown';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const MENU_ITEMS = [
  { label: 'Thông tin cá nhân', href: '/account/profile' },
  { label: 'Thiết bị đang mượn', href: '/account/my-devices' },
  { label: 'Lịch sử mượn/trả', href: '/account/history' },
  { label: 'Đổi mật khẩu', href: '/account/change-password' },
] as const;

export default function Navbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const resetNotifications = useNotificationStore((s) => s.reset);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  const notificationsHref = user?.role === 'ADMIN' ? '/admin/notifications' : '/notifications';

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    resetNotifications();
    setOpen(false);
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          {/* <img src="/logo_dut_equip_no_bg.png" alt="DUT Equip" className="h-9 w-auto" /> */}
          <span className="text-lg font-semibold tracking-tight text-gray-900">DUT Equip - Hệ thống quản lý thiết bị công trường ĐH Bách Khoa Đà Nẵng</span>
        </Link>

        <div className="flex items-center gap-3 flex-shrink-0">
          {!user ? (
            <Link
              to="/login"
              className="px-4 py-2 rounded-lg border border-blue-600 text-blue-600 text-sm font-medium bg-white hover:bg-blue-50 transition-colors duration-150"
            >
              Đăng nhập
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              {user.role === 'ADMIN' && (
                <Link
                  to="/admin"
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors duration-150"
                >
                  Trang quản trị
                </Link>
              )}

              {/* Bell */}
              <div className="relative" ref={bellRef}>
                <button
                  onClick={() => { setBellOpen((v) => !v); setOpen(false); }}
                  className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors duration-150 text-gray-500"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-semibold ring-2 ring-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {bellOpen && (
                  <NotificationDropdown
                    notificationsHref={notificationsHref}
                    onClose={() => setBellOpen(false)}
                  />
                )}
              </div>

              <div className="relative" ref={ref}>
                <button
                  onClick={() => setOpen((v) => !v)}
                  className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors duration-150"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-blue-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                    ) : (
                      getInitials(user.fullName)
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-700 max-w-32 truncate">{user.fullName}</span>
                  <svg
                    className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
                    viewBox="0 0 20 20" fill="currentColor"
                  >
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </button>

                {open && (
                  <div className="absolute right-0 mt-1.5 w-56 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                    
                    <div className="py-1">
                      {MENU_ITEMS.map((item) => (
                        <Link
                          key={item.href}
                          to={item.href}
                          onClick={() => setOpen(false)}
                          className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                    <div className="border-t border-gray-100 py-1">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150"
                      >
                        Đăng xuất
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
