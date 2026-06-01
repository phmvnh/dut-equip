import type { PageResponse } from './notification';

export type MessageType = 'TEXT' | 'IMAGE' | 'FILE';
export type ChatSenderRole = 'USER' | 'ADMIN';

export interface ChatMessage {
  id: number;
  conversationId: number;
  senderId: number;
  senderName: string;
  senderRole: ChatSenderRole;
  type: MessageType;
  content?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: number;
  read: boolean;
  readAt?: string;
  createdAt: string;
}

export interface ChatConversation {
  id: number;
  userId: number;
  userFullName: string;
  userEmail: string;
  userAvatarUrl?: string;
  userFaculty?: string;
  lastMessageAt?: string;
  lastMessageContent?: string;
  lastMessageType?: MessageType;
  unreadCount: number;
}

export interface SendChatMessagePayload {
  targetUserId?: number;
  type: MessageType;
  content?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: number;
}

export interface ChatTypingEvent {
  conversationId: number;
  senderId: number;
  senderName: string;
  senderRole: ChatSenderRole;
  typing: boolean;
  // Chỉ dùng khi client gửi (admin → user); server bỏ qua khi nhận từ USER.
  targetUserId?: number;
}

export interface ChatReadEvent {
  conversationId: number;
  readerRole: ChatSenderRole;
  readAt: string;
}

export type ChatMessagePage = PageResponse<ChatMessage>;
