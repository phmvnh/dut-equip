import { create } from 'zustand';
import type { ChatConversation, ChatMessage } from '../types/chat';

interface ChatState {
  // Tổng số tin chưa đọc — USER: tin từ admin chưa đọc của riêng mình.
  // ADMIN: tổng cộng tin USER chưa đọc qua toàn bộ hệ thống.
  unreadCount: number;

  // Admin sees nhiều conversations; User chỉ có 1 (vẫn đẩy vào đây cho đồng nhất).
  conversations: ChatConversation[];

  // Tin nhắn theo conversationId, sắp xếp tăng dần theo createdAt
  messagesByConv: Record<number, ChatMessage[]>;

  // Conversation đang được mở (admin chuyển qua lại, user mặc định = của mình)
  activeConversationId: number | null;

  // Người đang gõ trong từng conversation: { name, until } — until là timestamp hết hiệu lực
  typingByConv: Record<number, { name: string; until: number } | null>;

  setUnreadCount: (n: number) => void;
  setConversations: (list: ChatConversation[]) => void;
  upsertConversation: (conv: ChatConversation) => void;
  setActiveConversation: (id: number | null) => void;

  setMessages: (conversationId: number, messages: ChatMessage[]) => void;
  prependMessages: (conversationId: number, messages: ChatMessage[]) => void;
  appendMessage: (message: ChatMessage, opts?: { currentRole?: 'USER' | 'ADMIN' }) => void;

  markMyOutgoingRead: (conversationId: number, readAt: string) => void;
  markConversationLocallyRead: (conversationId: number) => void;

  setTyping: (conversationId: number, name: string | null) => void;

  reset: () => void;
}

const TYPING_TIMEOUT_MS = 4000;

export const useChatStore = create<ChatState>((set) => ({
  unreadCount: 0,
  conversations: [],
  messagesByConv: {},
  activeConversationId: null,
  typingByConv: {},

  setUnreadCount: (n) => set({ unreadCount: Math.max(0, n) }),

  setConversations: (list) => set({ conversations: list }),

  upsertConversation: (conv) =>
    set((s) => {
      const idx = s.conversations.findIndex((c) => c.id === conv.id);
      if (idx === -1) return { conversations: [conv, ...s.conversations] };
      const next = s.conversations.slice();
      next[idx] = { ...next[idx], ...conv };
      // Đưa lên đầu nếu vừa có hoạt động
      const [moved] = next.splice(idx, 1);
      return { conversations: [moved, ...next] };
    }),

  setActiveConversation: (id) => set({ activeConversationId: id }),

  setMessages: (conversationId, messages) =>
    set((s) => ({
      messagesByConv: { ...s.messagesByConv, [conversationId]: messages },
    })),

  prependMessages: (conversationId, messages) =>
    set((s) => {
      const existing = s.messagesByConv[conversationId] ?? [];
      const existingIds = new Set(existing.map((m) => m.id));
      const merged = [...messages.filter((m) => !existingIds.has(m.id)), ...existing];
      return { messagesByConv: { ...s.messagesByConv, [conversationId]: merged } };
    }),

  appendMessage: (message, opts) =>
    set((s) => {
      const list = s.messagesByConv[message.conversationId] ?? [];
      if (list.some((m) => m.id === message.id)) return s;
      const nextList = [...list, message];

      // Cập nhật conversation summary
      const convIdx = s.conversations.findIndex((c) => c.id === message.conversationId);
      let nextConvs = s.conversations;
      if (convIdx !== -1) {
        const c = s.conversations[convIdx];
        const isFromOpposite =
          opts?.currentRole && message.senderRole !== opts.currentRole;
        const incrementUnread =
          isFromOpposite && s.activeConversationId !== message.conversationId;
        const updated: ChatConversation = {
          ...c,
          lastMessageAt: message.createdAt,
          lastMessageContent: message.content,
          lastMessageType: message.type,
          unreadCount: incrementUnread ? c.unreadCount + 1 : c.unreadCount,
        };
        const others = s.conversations.filter((cc) => cc.id !== c.id);
        nextConvs = [updated, ...others];
      }

      // Tăng badge tổng nếu tin tới mình, không phải mình gửi, và conversation không phải đang mở
      let nextUnread = s.unreadCount;
      if (opts?.currentRole && message.senderRole !== opts.currentRole) {
        if (s.activeConversationId !== message.conversationId) {
          nextUnread = s.unreadCount + 1;
        }
      }

      return {
        messagesByConv: { ...s.messagesByConv, [message.conversationId]: nextList },
        conversations: nextConvs,
        unreadCount: nextUnread,
      };
    }),

  markMyOutgoingRead: (conversationId, readAt) =>
    set((s) => {
      const list = s.messagesByConv[conversationId];
      if (!list) return s;
      const updated = list.map((m) => (m.read ? m : { ...m, read: true, readAt }));
      return { messagesByConv: { ...s.messagesByConv, [conversationId]: updated } };
    }),

  markConversationLocallyRead: (conversationId) =>
    set((s) => {
      const conv = s.conversations.find((c) => c.id === conversationId);
      const drop = conv ? conv.unreadCount : 0;
      const nextConvs = s.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c
      );
      return {
        conversations: nextConvs,
        unreadCount: Math.max(0, s.unreadCount - drop),
      };
    }),

  setTyping: (conversationId, name) =>
    set((s) => {
      const now = Date.now();
      if (!name) {
        const copy = { ...s.typingByConv };
        copy[conversationId] = null;
        return { typingByConv: copy };
      }
      return {
        typingByConv: {
          ...s.typingByConv,
          [conversationId]: { name, until: now + TYPING_TIMEOUT_MS },
        },
      };
    }),

  reset: () =>
    set({
      unreadCount: 0,
      conversations: [],
      messagesByConv: {},
      activeConversationId: null,
      typingByConv: {},
    }),
}));

