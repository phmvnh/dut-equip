import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '../../api/notificationApi';
import { useNotificationStore } from '../../store/notificationStore';
import { formatRelative, formatDateTime } from '../../utils/formatRelative';
import { getNotificationLink } from '../../utils/notificationLink';
import {
  NOTIFICATION_TYPE_LABELS,
  type NotificationItem,
  type NotificationType,
} from '../../types/notification';

const TYPE_BADGE_CLASS: Record<NotificationType, string> = {
  BORROW_APPROVED:                 'bg-green-100 text-green-700',
  BORROW_REJECTED:                 'bg-red-100 text-red-700',
  BORROW_CANCELLED:                'bg-slate-100 text-slate-600',
  RETURN_REMINDER:                 'bg-amber-100 text-amber-700',
  OVERDUE_ALERT:                   'bg-red-100 text-red-700',
  RETURN_CONFIRMED:                'bg-emerald-100 text-emerald-700',
  NEW_BORROW_REQUEST:              'bg-blue-100 text-blue-700',
  BORROW_APPROVAL_REMINDER:        'bg-amber-100 text-amber-700',
  BORROW_RETURNED:                 'bg-emerald-100 text-emerald-700',
  MAINTENANCE_REMINDER:            'bg-amber-100 text-amber-700',
  MAINTENANCE_DONE:                'bg-emerald-100 text-emerald-700',
  EQUIPMENT_BROKEN:                'bg-red-100 text-red-700',
  WARRANTY_EXPIRING:               'bg-orange-100 text-orange-700',
  COMPENSATION_REQUIRED:           'bg-red-100 text-red-700',
  COMPENSATION_CONFIRMED:          'bg-emerald-100 text-emerald-700',
  COMPENSATION_PROOF_SUBMITTED:    'bg-blue-100 text-blue-700',
  COMPENSATION_COMPLAINT_RECEIVED: 'bg-orange-100 text-orange-700',
  COMPENSATION_COMPLAINT_RESOLVED: 'bg-emerald-100 text-emerald-700',
};

interface Props {
  title?: string;
  // Ẩn khối tiêu đề + nút "đánh dấu tất cả đã đọc" — dùng cho mobile (đã có header riêng ở trên)
  hideHeader?: boolean;
  // Xếp dọc từng item (tag ở trên, nội dung full-width bên dưới) — tối ưu cho màn hẹp (mobile)
  stacked?: boolean;
}

const PAGE_SIZE = 20;

export default function NotificationListView({ title = 'Thông báo', hideHeader = false, stacked = false }: Props) {
  const [page, setPage] = useState(0);
  const queryClient = useQueryClient();
  const markReadInStore = useNotificationStore((s) => s.markRead);
  const markAllReadInStore = useNotificationStore((s) => s.markAllRead);
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['notifications', page],
    queryFn: () => notificationApi.list(page, PAGE_SIZE),
  });

  const items: NotificationItem[] = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });

  const handleItemClick = async (n: NotificationItem) => {
    if (!n.read) {
      markReadInStore(n.id);
      try {
        await notificationApi.markRead(n.id);
        refresh();
      } catch (err) {
        console.warn('markRead lỗi', err);
      }
    }
    const link = getNotificationLink(n.type);
    if (link) navigate(link);
  };

  const handleMarkAllRead = async () => {
    markAllReadInStore();
    try {
      await notificationApi.markAllRead();
      refresh();
    } catch (err) {
      console.warn('markAllRead lỗi', err);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {!hideHeader && (
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            <p className="text-xs text-gray-500 mt-0.5">Tất cả thông báo của bạn</p>
          </div>
          <button
            onClick={handleMarkAllRead}
            className="text-sm px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100"
          >
            Đánh dấu tất cả đã đọc
          </button>
        </div>
      )}

      {isLoading && (
        <div className="px-6 py-12 flex justify-center">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {isError && !isLoading && (
        <div className="px-6 py-12 text-center text-sm text-red-500">
          Không thể tải thông báo
        </div>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <div className="px-6 py-16 flex flex-col items-center gap-2 text-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12 text-gray-300">
            <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
          <p className="text-sm text-gray-500">Chưa có thông báo nào</p>
        </div>
      )}

      {!isLoading && !isError && items.length > 0 && (
        <div className="divide-y divide-gray-100">
          {items.map((n) => {
            const badge = (
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${TYPE_BADGE_CLASS[n.type] ?? 'bg-gray-100 text-gray-700'}`}
              >
                {NOTIFICATION_TYPE_LABELS[n.type] ?? n.type}
              </span>
            );

            // Mobile: xếp dọc — tag ở hàng trên (kèm chấm chưa đọc), nội dung full-width bên dưới
            if (stacked) {
              return (
                <button
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={`w-full text-left px-4 py-3.5 hover:bg-gray-50 transition-colors duration-150 ${n.read ? '' : 'bg-blue-50/40'}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    {badge}
                    {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />}
                  </div>
                  <p className={`text-sm leading-snug ${n.read ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                    {n.title}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5 leading-snug">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1.5">
                    {formatRelative(n.createdAt)} · {formatDateTime(n.createdAt)}
                  </p>
                </button>
              );
            }

            // Desktop: tag bên trái, nội dung bên phải
            return (
              <button
                key={n.id}
                onClick={() => handleItemClick(n)}
                className={`w-full text-left px-6 py-4 hover:bg-gray-50 transition-colors duration-150 flex items-start gap-4 ${n.read ? '' : 'bg-blue-50/40'}`}
              >
                {badge}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${n.read ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                    {n.title}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatRelative(n.createdAt)} · {formatDateTime(n.createdAt)}
                  </p>
                </div>
                {!n.read && (
                  <span className="w-2 h-2 mt-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Trang {page + 1} / {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Trước
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sau →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
