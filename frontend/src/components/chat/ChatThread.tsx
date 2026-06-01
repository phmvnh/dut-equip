import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { chatApi } from '../../api/chatApi';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { sendTypingEvent } from '../../hooks/useChatSocket';
import type { ChatMessage } from '../../types/chat';

const EMPTY_MESSAGES: ChatMessage[] = [];

interface Props {
  conversationId: number;
  // Người ngồi đối diện trong chat — USER: undefined (server tự biết); ADMIN: id giảng viên đang chat
  targetUserId?: number;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, today)) return 'Hôm nay';
  if (sameDay(d, yesterday)) return 'Hôm qua';
  return d.toLocaleDateString('vi-VN');
}

function formatBytes(n?: number): string {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ChatThread({ conversationId, targetUserId }: Props) {
  const role = useAuthStore((s) => s.user?.role);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const showToast = useToastStore((s) => s.show);

  const messages = useChatStore((s) => s.messagesByConv[conversationId] ?? EMPTY_MESSAGES);
  const setMessages = useChatStore((s) => s.setMessages);
  const appendMessage = useChatStore((s) => s.appendMessage);
  const markLocally = useChatStore((s) => s.markConversationLocallyRead);
  // Select primitive value để tránh new-object mỗi render gây vòng lặp vô hạn
  const typingEntry = useChatStore((s) => s.typingByConv[conversationId]);
  const typingName = typingEntry && Date.now() < typingEntry.until ? typingEntry.name : null;

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState<'image' | 'file' | null>(null);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const fileInputImage = useRef<HTMLInputElement>(null);
  const fileInputFile = useRef<HTMLInputElement>(null);
  const lastTypingSentRef = useRef(0);

  // Tải lịch sử ban đầu (trang đầu, mới nhất)
  const { isLoading } = useQuery({
    queryKey: ['chat-messages', conversationId, targetUserId],
    queryFn: async () => {
      const page = await chatApi.listMessages(targetUserId, 0, 30);
      // BE trả về createdAt giảm dần — đảo ngược cho hiển thị từ cũ → mới
      const asc = [...page.content].reverse();
      setMessages(conversationId, asc);
      return asc;
    },
    staleTime: 30_000,
  });

  // Đánh dấu đã đọc khi mở conversation hoặc khi có tin mới
  useEffect(() => {
    let cancelled = false;
    chatApi
      .markRead(targetUserId)
      .then((n) => {
        if (cancelled) return;
        if (n > 0) markLocally(conversationId);
      })
      .catch(() => { /* im lặng */ });
    return () => {
      cancelled = true;
    };
  }, [conversationId, targetUserId, messages.length, markLocally]);

  // Auto scroll xuống cuối khi có tin mới
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, typingName]);

  // Hết hiệu lực typing sau timeout — buộc re-render bằng tick state
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!typingName) return;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [typingName]);

  const grouped = useMemo(() => groupByDate(messages), [messages]);

  // ID tin nhắn cuối cùng của mình đã được đọc — chỉ tin này hiện "Đã xem" (pattern Messenger)
  const lastReadMineId = useMemo(() => {
    let lastId: number | null = null;
    for (const m of messages) {
      if (m.senderId === currentUserId && m.read) lastId = m.id;
    }
    return lastId;
  }, [messages, currentUserId]);

  function pushTyping() {
    const now = Date.now();
    if (now - lastTypingSentRef.current < 1500) return; // throttle
    lastTypingSentRef.current = now;
    sendTypingEvent(targetUserId, true);
  }

  async function handleSend() {
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    try {
      const saved = await chatApi.send({
        targetUserId,
        type: 'TEXT',
        content: value,
      });
      // Echo ngay vào store — STOMP cũng push, nhưng appendMessage dedupes theo id
      if (role) appendMessage(saved, { currentRole: role });
      setText('');
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Không gửi được tin';
      showToast(msg, 'error');
    } finally {
      setSending(false);
    }
  }

  async function handleUploadImage(file: File) {
    setUploading('image');
    try {
      const url = await chatApi.uploadImage(file);
      const saved = await chatApi.send({
        targetUserId,
        type: 'IMAGE',
        attachmentUrl: url,
        attachmentName: file.name,
        attachmentSize: file.size,
      });
      if (role) appendMessage(saved, { currentRole: role });
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Tải ảnh thất bại';
      showToast(msg, 'error');
    } finally {
      setUploading(null);
    }
  }

  async function handleUploadFile(file: File) {
    setUploading('file');
    try {
      const info = await chatApi.uploadFile(file);
      const saved = await chatApi.send({
        targetUserId,
        type: 'FILE',
        attachmentUrl: info.url,
        attachmentName: info.name,
        attachmentSize: info.size,
      });
      if (role) appendMessage(saved, { currentRole: role });
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Tải file thất bại';
      showToast(msg, 'error');
    } finally {
      setUploading(null);
    }
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-blue-50 via-blue-50/40 to-white">
      <div ref={scrollerRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {isLoading && messages.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">Đang tải tin nhắn...</p>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6 text-blue-600">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">Chưa có tin nhắn</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Gửi tin để bắt đầu cuộc trò chuyện</p>
          </div>
        ) : (
          grouped.map(({ day, items }) => (
            <div key={day}>
              <div className="flex justify-center my-3">
                <span className="text-[11px] text-blue-600/70 bg-white/70 px-2.5 py-0.5 rounded-full border border-blue-100">{day}</span>
              </div>
              {items.map((m, idx) => {
                const prev = items[idx - 1];
                const next = items[idx + 1];
                const isFirstOfGroup = !prev || prev.senderId !== m.senderId;
                const isLastOfGroup = !next || next.senderId !== m.senderId;
                return (
                  <Bubble
                    key={m.id}
                    m={m}
                    mine={m.senderId === currentUserId}
                    isFirstOfGroup={isFirstOfGroup}
                    isLastOfGroup={isLastOfGroup}
                  />
                );
              })}
            </div>
          ))
        )}
        {typingName && (
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-blue-600">
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
            <span>{typingName} đang nhập...</span>
          </div>
        )}
      </div>

      <div className="border-t border-blue-100 bg-white/80 backdrop-blur px-2 py-2 flex items-end gap-1.5">
        <input
          ref={fileInputImage}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUploadImage(f);
            e.target.value = '';
          }}
        />
        <input
          ref={fileInputFile}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.7z,.txt"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUploadFile(f);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          disabled={uploading !== null}
          onClick={() => fileInputImage.current?.click()}
          className="w-9 h-9 rounded-lg text-blue-600 hover:bg-blue-50 disabled:opacity-50 flex items-center justify-center transition-colors"
          title="Đính kèm ảnh"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </button>
        <button
          type="button"
          disabled={uploading !== null}
          onClick={() => fileInputFile.current?.click()}
          className="w-9 h-9 rounded-lg text-blue-600 hover:bg-blue-50 disabled:opacity-50 flex items-center justify-center transition-colors"
          title="Đính kèm file"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </button>
        <textarea
          rows={1}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            pushTyping();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={uploading ? `Đang tải ${uploading === 'image' ? 'ảnh' : 'file'}...` : 'Nhập tin nhắn...'}
          className="flex-1 resize-none rounded-full border border-blue-200 bg-white px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 max-h-32 transition-all"
        />
        <button
          type="button"
          disabled={sending || !text.trim()}
          onClick={handleSend}
          className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:shadow-md disabled:bg-gray-200 disabled:bg-none disabled:cursor-not-allowed disabled:text-gray-400 flex items-center justify-center transition-all"
          title="Gửi"
          aria-label="Gửi"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 -ml-0.5">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );

  function Bubble({
    m,
    mine,
    isFirstOfGroup,
    isLastOfGroup,
  }: {
    m: ChatMessage;
    mine: boolean;
    isFirstOfGroup: boolean;
    isLastOfGroup: boolean;
  }) {
    // Bo góc theo vị trí trong nhóm — kiểu Messenger
    const cornerClass = mine
      ? `${isFirstOfGroup ? 'rounded-tr-2xl' : 'rounded-tr-md'} rounded-tl-2xl rounded-bl-2xl rounded-br-md`
      : `${isFirstOfGroup ? 'rounded-tl-2xl' : 'rounded-tl-md'} rounded-tr-2xl rounded-br-2xl rounded-bl-md`;
    const bubbleClass = mine
      ? `bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm ${cornerClass}`
      : `bg-white text-gray-900 border border-blue-100 shadow-sm ${cornerClass}`;
    return (
      <div className={`flex ${mine ? 'justify-end' : 'justify-start'} ${isLastOfGroup ? 'mb-2.5' : 'mb-0.5'}`}>
        <div className={`flex flex-col max-w-[75%] ${mine ? 'items-end' : 'items-start'}`}>
          {!mine && isFirstOfGroup && (
            <p className="text-[11px] text-blue-600/80 font-medium ml-2 mb-0.5">{m.senderName}</p>
          )}
          <div className={`px-3 py-2 text-sm max-w-full ${bubbleClass}`}>
            {m.type === 'IMAGE' && m.attachmentUrl && (
              <a href={m.attachmentUrl} target="_blank" rel="noreferrer">
                <img
                  src={m.attachmentUrl}
                  alt={m.attachmentName ?? 'ảnh'}
                  className="rounded-lg max-h-60 max-w-full"
                />
              </a>
            )}
            {m.type === 'FILE' && m.attachmentUrl && (
              <a
                href={m.attachmentUrl}
                target="_blank"
                rel="noreferrer"
                className={`flex items-center gap-2 ${mine ? 'text-white' : 'text-blue-700'} underline`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4 shrink-0">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span className="truncate max-w-[200px]">{m.attachmentName ?? 'Tệp đính kèm'}</span>
                {m.attachmentSize && <span className="text-[11px] opacity-80">({formatBytes(m.attachmentSize)})</span>}
              </a>
            )}
            {m.content && (
              <p className={`whitespace-pre-wrap break-words ${m.type !== 'TEXT' ? 'mt-1.5' : ''}`}>{m.content}</p>
            )}
          </div>
          {(isLastOfGroup || m.id === lastReadMineId) && (
            <div className={`flex items-center gap-1 mt-0.5 text-[10px] text-gray-400 ${mine ? 'mr-2' : 'ml-2'}`}>
              <span>{formatTime(m.createdAt)}</span>
              {mine && m.id === lastReadMineId && (
                <span className="flex items-center gap-0.5 text-blue-500">
                  <span>·</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Đã xem</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
}

function groupByDate(messages: ChatMessage[]): { day: string; items: ChatMessage[] }[] {
  const out: { day: string; items: ChatMessage[] }[] = [];
  let lastDay = '';
  for (const m of messages) {
    const day = formatDayLabel(m.createdAt);
    if (day !== lastDay) {
      out.push({ day, items: [m] });
      lastDay = day;
    } else {
      out[out.length - 1].items.push(m);
    }
  }
  return out;
}
