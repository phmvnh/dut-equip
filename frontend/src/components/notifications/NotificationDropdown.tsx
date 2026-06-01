import { Link, useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../../store/notificationStore';
import { notificationApi } from '../../api/notificationApi';
import { formatRelative, formatClock, formatDateTime } from '../../utils/formatRelative';
import { getNotificationLink } from '../../utils/notificationLink';
import type { NotificationItem } from '../../types/notification';

interface Props {
  notificationsHref: string;   // /notifications hoặc /admin/notifications
  onClose: () => void;
}

export default function NotificationDropdown({ notificationsHref, onClose }: Props) {
  const items = useNotificationStore((s) => s.items);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const markReadInStore = useNotificationStore((s) => s.markRead);
  const markAllReadInStore = useNotificationStore((s) => s.markAllRead);
  const navigate = useNavigate();

  const recentItems = items.slice(0, 5);

  const handleItemClick = (n: NotificationItem) => {
    if (!n.read) {
      markReadInStore(n.id);
      notificationApi.markRead(n.id).catch((err) => console.warn('markRead lỗi', err));
    }
    onClose();
    navigate(getNotificationLink(n.type) ?? notificationsHref);
  };

  const handleMarkAllRead = () => {
    if (unreadCount === 0) return;
    markAllReadInStore();
    notificationApi.markAllRead().catch((err) => console.warn('markAllRead lỗi', err));
  };

  return (
    <div className="absolute right-0 mt-1.5 w-80 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">Thông báo</p>
        <button
          onClick={handleMarkAllRead}
          disabled={unreadCount === 0}
          className="text-xs text-blue-600 hover:underline disabled:text-gray-300 disabled:no-underline disabled:cursor-not-allowed"
        >
          Đánh dấu đã đọc
        </button>
      </div>

      <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
        {recentItems.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-gray-400">
            Chưa có thông báo nào
          </div>
        ) : (
          recentItems.map((n) => (
            <button
              key={n.id}
              onClick={() => handleItemClick(n)}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors duration-150 ${n.read ? '' : 'bg-blue-50/40'}`}
            >
              <p className={`text-sm leading-snug ${n.read ? 'text-gray-500' : 'text-gray-900 font-medium'}`}>
                {n.title}
              </p>
              <p
                className="text-xs text-gray-400 mt-0.5"
                title={formatDateTime(n.createdAt)}
              >
                {formatRelative(n.createdAt)} · {formatClock(n.createdAt)}
              </p>
            </button>
          ))
        )}
      </div>

      <div className="px-4 py-2.5 border-t border-gray-100 text-center">
        <Link
          to={notificationsHref}
          onClick={onClose}
          className="text-xs text-blue-600 hover:underline"
        >
          Xem tất cả thông báo
        </Link>
      </div>
    </div>
  );
}
