import { useEffect } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { useToastStore } from '../store/toastStore';
import type { NotificationItem } from '../types/notification';

// Mở STOMP connection khi đã login, subscribe /user/queue/notifications, push vào store
export function useNotificationSocket() {
  const token = useAuthStore((s) => s.accessToken);
  const userId = useAuthStore((s) => s.user?.id);
  const addNotification = useNotificationStore((s) => s.addNotification);
  const showToast = useToastStore((s) => s.show);

  useEffect(() => {
    if (!token || !userId) return;

    const wsBaseUrl = import.meta.env.VITE_WS_BASE_URL ?? 'http://localhost:8080';

    const client = new Client({
      webSocketFactory: () => new SockJS(`${wsBaseUrl}/ws`),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: () => { /* im lặng */ },
    });

    client.onConnect = () => {
      client.subscribe('/user/queue/notifications', (frame) => {
        try {
          const notif = JSON.parse(frame.body) as NotificationItem;
          addNotification(notif);
          showToast(notif.title, 'info');
        } catch (err) {
          console.error('Không parse được notification frame', err);
        }
      });
    };

    client.onStompError = (frame) => {
      console.warn('STOMP error:', frame.headers['message'], frame.body);
    };

    client.activate();

    return () => {
      client.deactivate();
    };
  }, [token, userId, addNotification, showToast]);
}
