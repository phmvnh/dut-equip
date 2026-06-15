import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { notificationApi } from '../../api/notificationApi';

interface TabDef {
  to: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
  badge?: number;
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.1 : 1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  );
}

function BoxIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.1 : 1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
    </svg>
  );
}

function ChatIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.1 : 1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function BellIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.1 : 1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function UserIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.1 : 1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export default function MobileBottomNav() {
  const user = useAuthStore((s) => s.user);
  const isUser = !!user && user.role !== 'ADMIN';

  const { data: unread = 0 } = useQuery({
    queryKey: ['unread-count'],
    queryFn: notificationApi.unreadCount,
    enabled: isUser,
    refetchInterval: 60_000,
  });

  // Số tin chat chưa đọc — store được NotificationBootstrap nạp + cập nhật realtime
  const chatUnread = useChatStore((s) => s.unreadCount);

  const tabs: TabDef[] = [
    { to: '/', label: 'Trang chủ', icon: (a) => <HomeIcon active={a} /> },
    { to: '/account/my-devices', label: 'Của tôi', icon: (a) => <BoxIcon active={a} /> },
    { to: '/chat', label: 'Chat', icon: (a) => <ChatIcon active={a} />, badge: chatUnread },
    { to: '/notifications', label: 'Thông báo', icon: (a) => <BellIcon active={a} />, badge: unread },
    { to: '/account/profile', label: 'Tài khoản', icon: (a) => <UserIcon active={a} /> },
  ];

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-white/80 backdrop-blur-xl border-t border-black/[0.06]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-5 h-16">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center gap-1 transition-colors ${
                isActive ? 'text-action' : 'text-gray-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className="relative">
                  {tab.icon(isActive)}
                  {!!tab.badge && tab.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {tab.badge > 99 ? '99+' : tab.badge}
                    </span>
                  )}
                </span>
                <span className="text-[11px] font-medium leading-none">{tab.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
