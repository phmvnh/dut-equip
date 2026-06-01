import { create } from 'zustand';
import type { NotificationItem } from '../types/notification';

interface NotificationState {
  items: NotificationItem[];
  unreadCount: number;
  setItems: (items: NotificationItem[]) => void;
  setUnreadCount: (count: number) => void;
  addNotification: (n: NotificationItem) => void;
  markRead: (id: number) => void;
  markAllRead: () => void;
  reset: () => void;
}

// KHÔNG dùng persist — server là source of truth, tránh leak giữa các session
export const useNotificationStore = create<NotificationState>((set) => ({
  items: [],
  unreadCount: 0,

  setItems: (items) => set({ items }),
  setUnreadCount: (count) => set({ unreadCount: count }),

  addNotification: (n) =>
    set((s) => ({
      items: [n, ...s.items],
      unreadCount: n.read ? s.unreadCount : s.unreadCount + 1,
    })),

  markRead: (id) =>
    set((s) => {
      const target = s.items.find((it) => it.id === id);
      if (!target || target.read) return s;
      return {
        items: s.items.map((it) => (it.id === id ? { ...it, read: true } : it)),
        unreadCount: Math.max(0, s.unreadCount - 1),
      };
    }),

  markAllRead: () =>
    set((s) => ({
      items: s.items.map((it) => ({ ...it, read: true })),
      unreadCount: 0,
    })),

  reset: () => set({ items: [], unreadCount: 0 }),
}));
