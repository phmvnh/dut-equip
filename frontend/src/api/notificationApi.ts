import axiosClient from './axiosClient';
import type { NotificationItem, NotificationType, PageResponse } from '../types/notification';

export const notificationApi = {
  list: (page = 0, size = 20, type?: NotificationType) =>
    axiosClient
      .get<PageResponse<NotificationItem>>('/notifications', {
        params: { page, size, ...(type ? { type } : {}) },
      })
      .then((r) => r.data),

  unreadCount: () =>
    axiosClient
      .get<{ count: number }>('/notifications/unread-count')
      .then((r) => r.data.count),

  markRead: (id: number) =>
    axiosClient.patch(`/notifications/${id}/read`).then((r) => r.data),

  markAllRead: () =>
    axiosClient.patch('/notifications/read-all').then((r) => r.data),
};
