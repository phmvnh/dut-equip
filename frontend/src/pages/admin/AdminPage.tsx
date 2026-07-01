import { useState, useRef, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useChatStore } from '../../store/chatStore';
import NotificationDropdown from '../../components/notifications/NotificationDropdown';
import Toast from '../../components/Toast';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface TopbarMeta {
  title: string;
  action?: { label: string; onClick: () => void };
}

const ICON_CLASS = 'w-5 h-5 shrink-0';

const ICONS = {
  grid: (
    <svg className={ICON_CLASS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  monitor: (
    <svg className={ICON_CLASS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  clipboard: (
    <svg className={ICON_CLASS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 2h6a1 1 0 0 1 1 1v2H8V3a1 1 0 0 1 1-1z" /><rect x="5" y="5" width="14" height="16" rx="2" />
    </svg>
  ),
  wrench: (
    <svg className={ICON_CLASS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-2.5 2.5-2.5z" />
    </svg>
  ),
  users: (
    <svg className={ICON_CLASS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  list: (
    <svg className={ICON_CLASS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
      <circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" />
    </svg>
  ),
  building: (
    <svg className={ICON_CLASS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <line x1="9" y1="7"  x2="9"  y2="7"  /><line x1="15" y1="7"  x2="15" y2="7"  />
      <line x1="9" y1="11" x2="9"  y2="11" /><line x1="15" y1="11" x2="15" y2="11" />
      <line x1="9" y1="15" x2="9"  y2="15" /><line x1="15" y1="15" x2="15" y2="15" />
      <path d="M10 21v-3h4v3" />
    </svg>
  ),
  settings: (
    <svg className={ICON_CLASS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  ),
  profile: (
    <svg className={ICON_CLASS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  ),
  logout: (
    <svg className={ICON_CLASS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  menu: (
    <svg className={ICON_CLASS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
  bell: (
    <svg className={ICON_CLASS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  ),
  chat: (
    <svg className={ICON_CLASS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  wallet: (
    <svg className={ICON_CLASS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7h18v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
      <path d="M3 7l3-3h12l3 3" />
      <circle cx="17" cy="14" r="1.5" />
    </svg>
  ),
  inventory: (
    <svg className={ICON_CLASS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  search: (
    <svg className="w-4 h-4 text-gray-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  history: (
    <svg className={ICON_CLASS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><polyline points="3 3 3 8 8 8" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  report: (
    <svg className={ICON_CLASS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="8" y2="17" /><line x1="12" y1="11" x2="12" y2="17" /><line x1="16" y1="15" x2="16" y2="17" />
    </svg>
  ),
  cart: (
    <svg className={ICON_CLASS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  ),
  trash: (
    <svg className={ICON_CLASS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  ),
};

const NAV_ITEMS: NavItem[] = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: ICONS.grid },
  { path: '/admin/equipments', label: 'Thiết bị', icon: ICONS.monitor },
  { path: '/admin/procurements', label: 'Mua sắm', icon: ICONS.cart },
  { path: '/admin/borrow', label: 'Đơn mượn', icon: ICONS.clipboard },
  { path: '/admin/maintenance', label: 'Bảo trì', icon: ICONS.wrench },
  { path: '/admin/inventory', label: 'Kiểm kê', icon: ICONS.inventory },
  { path: '/admin/disposals', label: 'Thanh lý', icon: ICONS.trash },
  { path: '/admin/compensations', label: 'Bồi thường', icon: ICONS.wallet },
  { path: '/admin/users', label: 'Người dùng', icon: ICONS.users },
  { path: '/admin/equip-types', label: 'Loại thiết bị', icon: ICONS.list },
  { path: '/admin/buildings', label: 'Khu/Tòa nhà', icon: ICONS.building },
  { path: '/admin/chat', label: 'Tin nhắn', icon: ICONS.chat },
  { path: '/admin/activity-logs', label: 'Lịch sử hoạt động', icon: ICONS.history },
  { path: '/admin/reports', label: 'Báo cáo', icon: ICONS.report },
];

function getSearchPlaceholder(pathname: string): string {
  if (pathname.startsWith('/admin/equipments'))    return 'Tìm theo tên hoặc mã thiết bị...';
  if (pathname.startsWith('/admin/procurements'))  return 'Tìm theo mã, tiêu đề hoặc người lập...';
  if (pathname.startsWith('/admin/disposals'))     return 'Tìm theo mã đề nghị hoặc thiết bị...';
  if (pathname.startsWith('/admin/borrow'))        return 'Tìm theo người mượn hoặc thiết bị...';
  if (pathname.startsWith('/admin/maintenance'))   return 'Tìm theo thiết bị hoặc người bảo trì...';
  if (pathname.startsWith('/admin/compensations')) return 'Tìm theo mã phiếu, giảng viên hoặc thiết bị...';
  if (pathname.startsWith('/admin/users'))         return 'Tìm theo tên hoặc email...';
  if (pathname.startsWith('/admin/equip-types'))   return 'Tìm theo tên loại thiết bị...';
  if (pathname.startsWith('/admin/buildings'))     return 'Tìm theo tên khu/tòa nhà...';
  if (pathname.startsWith('/admin/activity-logs')) return 'Tìm theo tên người dùng hoặc mã thiết bị...';
  return 'Tìm kiếm...';
}

function getTopbarMeta(pathname: string, navigate: (p: string) => void): TopbarMeta {
  if (pathname.startsWith('/admin/dashboard'))
    return { title: 'Tổng quan' };
  if (pathname.startsWith('/admin/equipments'))
    return { title: 'Quản lý thiết bị', action: { label: '+ Thêm thiết bị', onClick: () => navigate('/admin/equipments?action=add') } };
  if (pathname.startsWith('/admin/procurements'))
    return { title: 'Quản lý mua sắm', action: { label: '+ Tạo đề nghị mua sắm', onClick: () => navigate('/admin/procurements?action=add') } };
  if (pathname.startsWith('/admin/disposals'))
    return { title: 'Quản lý thanh lý' };
  if (pathname.startsWith('/admin/borrow'))
    return { title: 'Quản lý đơn mượn' };
  if (pathname.startsWith('/admin/maintenance'))
    return { title: 'Quản lý bảo trì', action: { label: '+ Thêm lịch bảo trì', onClick: () => navigate('/admin/maintenance?action=add') } };
  if (pathname.startsWith('/admin/compensations'))
    return { title: 'Quản lý bồi thường' };
  if (pathname.startsWith('/admin/users'))
    return { title: 'Quản lý người dùng', action: { label: '+ Thêm người dùng', onClick: () => navigate('/admin/users?action=add') } };
  if (pathname.startsWith('/admin/equip-types'))
    return { title: 'Loại thiết bị', action: { label: '+ Thêm loại', onClick: () => navigate('/admin/equip-types?action=add') } };
  if (pathname.startsWith('/admin/buildings'))
    return { title: 'Quản lý khu/tòa nhà', action: { label: '+ Thêm khu/tòa nhà', onClick: () => navigate('/admin/buildings?action=add') } };
  if (pathname.startsWith('/admin/settings'))
    return { title: 'Cài đặt hệ thống' };
  if (pathname.startsWith('/admin/profile'))
    return { title: 'Thông tin cá nhân' };
  if (pathname.startsWith('/admin/chat'))
    return { title: 'Hỗ trợ chat' };
  if (pathname.startsWith('/admin/activity-logs'))
    return { title: 'Lịch sử hoạt động' };
  if (pathname.startsWith('/admin/reports'))
    return { title: 'Báo cáo thống kê' };
  if (pathname.startsWith('/admin/inventory'))
    return { title: 'Kiểm kê tài sản' };
  void navigate;
  return { title: 'Quản trị' };
}

export default function AdminPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore((s) => s.logout);
  const adminUser = useAuthStore((s) => s.user);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const resetNotifications = useNotificationStore((s) => s.reset);
  const chatUnread = useChatStore((s) => s.unreadCount);
  const resetChat = useChatStore((s) => s.reset);
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const [bellOpen, setBellOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // Reset ô tìm kiếm khi chuyển tab — search được dùng chung nhưng không stick giữa các tab
  useEffect(() => {
    setSearch('');
  }, [location.pathname]);

  const topbar = getTopbarMeta(location.pathname, navigate);
  const searchPlaceholder = getSearchPlaceholder(location.pathname);

  const handleLogout = () => {
    logout();
    resetNotifications();
    resetChat();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-white text-gray-900">
      <aside
        style={{ backgroundColor: '#002559', width: collapsed ? 72 : 240, transition: 'width 200ms' }}
        className="flex flex-col text-white"
      >
        <div className="flex items-center gap-2 px-4 h-16 border-b border-white/10">
          {/* <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#2563eb' }} /> */}
          {!collapsed && (
            <button
              type="button"
              onClick={() => navigate('/')}
              className="font-semibold tracking-tight hover:text-blue-300 transition-colors"
              title="Về trang chủ"
            >
              DUT Equip
            </button>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="ml-auto p-1.5 rounded-md hover:bg-white/10"
            aria-label="Thu gọn"
          >
            {ICONS.menu}
          </button>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname.startsWith(item.path);
            const badge = item.path === '/admin/chat' && chatUnread > 0 ? chatUnread : item.badge;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
                style={{
                  backgroundColor: active ? '#2563eb' : 'transparent',
                  color: active ? 'white' : 'rgba(255, 255, 255, 0.9)',
                }}
                title={collapsed ? item.label : undefined}
              >
                {item.icon}
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    {badge !== undefined && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-red-500 text-white font-semibold">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>

      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-gray-200 px-6 flex items-center gap-4 bg-white">
          <h1 className="text-lg font-semibold tracking-tight whitespace-nowrap">{topbar.title}</h1>

          <div
            className="flex-1 max-w-md flex items-center gap-2 px-3 h-9 rounded-lg bg-gray-50"
            style={{ border: '1px solid #e5e7eb' }}
          >
            {ICONS.search}
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-gray-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-gray-400 hover:text-gray-600 text-sm"
                aria-label="Xóa tìm kiếm"
              >
                ×
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {topbar.action && (
              <button
                onClick={topbar.action.onClick}
                className="text-sm px-3.5 py-2 rounded-lg bg-blue-100 text-blue-800 border border-blue-300 font-medium hover:bg-blue-200"
              >
                {topbar.action.label}
              </button>
            )}
            <div className="relative" ref={bellRef}>
              <button
                type="button"
                onClick={() => setBellOpen((v) => !v)}
                className="relative w-9 h-9 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100"
                style={{ border: '1px solid #e5e7eb' }}
                title="Thông báo"
                aria-label="Thông báo"
              >
                {ICONS.bell}
                {unreadCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-[10px] font-semibold text-white"
                    style={{ backgroundColor: '#dc2626' }}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              {bellOpen && (
                <NotificationDropdown
                  notificationsHref="/admin/notifications"
                  onClose={() => setBellOpen(false)}
                />
              )}
            </div>
            <div className="relative" ref={avatarRef}>
              <button
                type="button"
                onClick={() => setAvatarOpen((v) => !v)}
                className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-sm font-semibold text-white hover:opacity-80 transition-opacity ring-2 ring-transparent hover:ring-blue-300"
                style={{ backgroundColor: '#2563eb' }}
                title="Tài khoản"
              >
                {adminUser?.avatarUrl ? (
                  <img src={adminUser.avatarUrl} alt={adminUser.fullName} className="w-full h-full object-cover" />
                ) : adminUser?.fullName ? (
                  (() => {
                    const parts = adminUser.fullName.trim().split(/\s+/);
                    return parts.length === 1
                      ? parts[0].slice(0, 2).toUpperCase()
                      : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                  })()
                ) : 'QV'}
              </button>

              {avatarOpen && (
                <div
                  className="absolute right-0 top-11 z-50 w-60 rounded-xl bg-white py-1.5 shadow-xl"
                  style={{ border: '1px solid #e5e7eb' }}
                >
                  {/* Header thông tin user */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 overflow-hidden"
                        style={{ backgroundColor: '#2563eb' }}
                      >
                        {adminUser?.avatarUrl ? (
                          <img src={adminUser.avatarUrl} alt={adminUser.fullName} className="w-full h-full object-cover" />
                        ) : adminUser?.fullName ? (
                          (() => {
                            const parts = adminUser.fullName.trim().split(/\s+/);
                            return parts.length === 1
                              ? parts[0].slice(0, 2).toUpperCase()
                              : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                          })()
                        ) : 'QV'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{adminUser?.fullName ?? 'Quản trị viên'}</p>
                        <p className="text-xs text-gray-500 truncate">{adminUser?.email ?? ''}</p>
                      </div>
                    </div>
                  </div>

                  {/* Menu items */}
                  <div className="py-1">
                    <button
                      onClick={() => { setAvatarOpen(false); navigate('/admin/profile'); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      {ICONS.profile}
                      <span>Thông tin cá nhân</span>
                    </button>
                    <button
                      onClick={() => { setAvatarOpen(false); navigate('/admin/settings'); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      {ICONS.settings}
                      <span>Cài đặt hệ thống</span>
                    </button>
                  </div>

                  <div className="border-t border-gray-100 py-1">
                    <button
                      onClick={() => { setAvatarOpen(false); handleLogout(); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      {ICONS.logout}
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <Outlet context={{ search }} />
        </main>
      </div>
      <Toast />
    </div>
  );
}
