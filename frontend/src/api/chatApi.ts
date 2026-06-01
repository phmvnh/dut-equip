import axiosClient from './axiosClient';
import type {
  ChatConversation,
  ChatMessage,
  ChatMessagePage,
  SendChatMessagePayload,
} from '../types/chat';

export const chatApi = {
  // USER: bỏ otherUserId. ADMIN: truyền userId giảng viên đang chat.
  listMessages: (otherUserId?: number, page = 0, size = 30) =>
    axiosClient
      .get<ChatMessagePage>('/chat/messages', {
        params: { page, size, ...(otherUserId ? { otherUserId } : {}) },
      })
      .then((r) => r.data),

  send: (payload: SendChatMessagePayload) =>
    axiosClient.post<ChatMessage>('/chat/messages', payload).then((r) => r.data),

  markRead: (otherUserId?: number) =>
    axiosClient
      .patch<{ updated: number }>('/chat/read', null, {
        params: otherUserId ? { otherUserId } : undefined,
      })
      .then((r) => r.data.updated),

  unreadCount: () =>
    axiosClient.get<{ count: number }>('/chat/unread-count').then((r) => r.data.count),

  listConversations: () =>
    axiosClient.get<ChatConversation[]>('/chat/conversations').then((r) => r.data),

  myConversation: () =>
    axiosClient.get<ChatConversation>('/chat/my-conversation').then((r) => r.data),

  uploadImage: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return axiosClient
      .post<{ url: string }>('/uploads/chat-image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data.url);
  },

  uploadFile: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return axiosClient
      .post<{ url: string; name: string; size: number }>('/uploads/chat-file', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
};
