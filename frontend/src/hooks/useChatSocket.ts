import { useEffect } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { useToastStore } from '../store/toastStore';
import type { ChatMessage, ChatReadEvent, ChatTypingEvent } from '../types/chat';

// Mở 1 STOMP client cho chat. Lưu client vào singleton để sendTypingEvent dùng được.
export function useChatSocket() {
  const token = useAuthStore((s) => s.accessToken);
  const userId = useAuthStore((s) => s.user?.id);
  const role = useAuthStore((s) => s.user?.role);
  const appendMessage = useChatStore((s) => s.appendMessage);
  const markMyOutgoingRead = useChatStore((s) => s.markMyOutgoingRead);
  const setTyping = useChatStore((s) => s.setTyping);
  const showToast = useToastStore((s) => s.show);

  useEffect(() => {
    if (!token || !userId || !role) return;

    const wsBaseUrl = import.meta.env.VITE_WS_BASE_URL ?? 'http://localhost:8080';

    const client = new Client({
      webSocketFactory: () => new SockJS(`${wsBaseUrl}/ws`),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: () => { /* im lặng */ },
    });

    bindTypingClient(client);

    client.onConnect = () => {

      client.subscribe('/user/queue/chat.message', (frame) => {
        try {
          const msg = JSON.parse(frame.body) as ChatMessage;
          appendMessage(msg, { currentRole: role });
          // Toast nhẹ khi conversation đang đóng và tin từ phía bên kia
          const activeId = useChatStore.getState().activeConversationId;
          if (msg.senderRole !== role && activeId !== msg.conversationId) {
            showToast(`${msg.senderName}: ${msg.content ?? '[đính kèm]'}`, 'info');
          }
        } catch (err) {
          console.error('Không parse được chat message', err);
        }
      });

      client.subscribe('/user/queue/chat.read', (frame) => {
        try {
          const evt = JSON.parse(frame.body) as ChatReadEvent;
          markMyOutgoingRead(evt.conversationId, evt.readAt);
        } catch (err) {
          console.error('Không parse được read event', err);
        }
      });

      client.subscribe('/user/queue/chat.typing', (frame) => {
        try {
          const evt = JSON.parse(frame.body) as ChatTypingEvent;
          setTyping(evt.conversationId, evt.typing ? evt.senderName : null);
        } catch (err) {
          console.error('Không parse được typing event', err);
        }
      });
    };

    client.onStompError = (frame) => {
      console.warn('Chat STOMP error:', frame.headers['message'], frame.body);
    };

    client.activate();

    return () => {
      bindTypingClient(null);
      client.deactivate();
    };
  }, [token, userId, role, appendMessage, markMyOutgoingRead, setTyping, showToast]);
}

// Helper gọi từ component bất kỳ — gửi typing event qua STOMP nếu socket sẵn sàng.
// Vì hook useChatSocket lưu client trong ref nội bộ, ta expose qua một singleton riêng.
let typingClient: Client | null = null;
export function bindTypingClient(c: Client | null) {
  typingClient = c;
}
export function sendTypingEvent(targetUserId: number | undefined, typing: boolean) {
  if (!typingClient || !typingClient.connected) return;
  typingClient.publish({
    destination: '/app/chat.typing',
    body: JSON.stringify({ targetUserId, typing }),
  });
}
