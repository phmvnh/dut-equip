import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { useChatStore } from '../store/chatStore';
import { useNotificationSocket } from '../hooks/useNotificationSocket';
import { useChatSocket } from '../hooks/useChatSocket';
import { notificationApi } from '../api/notificationApi';
import { chatApi } from '../api/chatApi';

// Component "đầu não" — mở socket + fetch initial data ngay khi đã login.
// Không render gì cả.
export default function NotificationBootstrap() {
  const userId = useAuthStore((s) => s.user?.id);
  const role = useAuthStore((s) => s.user?.role);
  const setItems = useNotificationStore((s) => s.setItems);
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);
  const reset = useNotificationStore((s) => s.reset);

  const setChatUnread = useChatStore((s) => s.setUnreadCount);
  const setChatConversations = useChatStore((s) => s.setConversations);
  const resetChat = useChatStore((s) => s.reset);

  useNotificationSocket();
  useChatSocket();

  useEffect(() => {
    if (!userId) {
      reset();
      resetChat();
      return;
    }
    let cancelled = false;

    Promise.all([notificationApi.list(0, 20), notificationApi.unreadCount()])
      .then(([page, count]) => {
        if (cancelled) return;
        setItems(page.content);
        setUnreadCount(count);
      })
      .catch((err) => {
        console.warn('Không tải được notifications ban đầu', err);
      });

    chatApi
      .unreadCount()
      .then((count) => {
        if (!cancelled) setChatUnread(count);
      })
      .catch((err) => console.warn('Không tải được chat unread', err));

    if (role === 'ADMIN') {
      chatApi
        .listConversations()
        .then((list) => {
          if (!cancelled) setChatConversations(list);
        })
        .catch((err) => console.warn('Không tải được danh sách hội thoại', err));
    } else if (role === 'USER') {
      chatApi
        .myConversation()
        .then((conv) => {
          if (!cancelled) setChatConversations([conv]);
        })
        .catch((err) => console.warn('Không tải được cuộc trò chuyện của tôi', err));
    }

    return () => {
      cancelled = true;
    };
  }, [userId, role, setItems, setUnreadCount, reset, setChatUnread, setChatConversations, resetChat]);

  return null;
}
