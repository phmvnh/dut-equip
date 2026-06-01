import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { useAuthStore } from '../../store/authStore';

const IC = 'w-4 h-4 shrink-0';

const ICONS = {
  user: (
    <svg className={IC} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  ),
  device: (
    <svg className={IC} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  history: (
    <svg className={IC} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 15" />
    </svg>
  ),
  lock: (
    <svg className={IC} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  ),
  wallet: (
    <svg className={IC} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7h18v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
      <path d="M3 7l3-3h12l3 3" />
      <circle cx="17" cy="14" r="1.5" />
    </svg>
  ),
};

const NAV_ITEMS = [
  { label: 'Thông tin cá nhân', to: '/account/profile', icon: ICONS.user },
  { label: 'Thiết bị đang mượn', to: '/account/my-devices', icon: ICONS.device },
  { label: 'Lịch sử mượn/trả', to: '/account/history', icon: ICONS.history },
  { label: 'Bồi thường', to: '/account/compensations', icon: ICONS.wallet },
  { label: 'Đổi mật khẩu', to: '/account/change-password', icon: ICONS.lock },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AccountPage() {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (location.pathname === '/account' || location.pathname === '/account/') {
    return <Navigate to="/account/profile" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        <div className="flex gap-6 items-start">
          {/* Sidebar */}
          <aside className="w-56 flex-shrink-0 sticky top-24">
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {/* User card */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
                    ) : user ? (
                      getInitials(user.fullName)
                    ) : '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{user?.fullName}</p>
                    <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                  </div>
                </div>
              </div>

              {/* Nav items */}
              <nav className="py-1.5">
                {NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm transition-colors duration-150 ${
                        isActive
                          ? 'bg-blue-50 text-blue-600 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`
                    }
                  >
                    {item.icon}
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </div>
          </aside>

          {/* Content */}
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
      <Footer />
    </div>
  );
}
