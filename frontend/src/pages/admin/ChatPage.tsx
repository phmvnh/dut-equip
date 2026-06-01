import { useEffect, useMemo, useState } from 'react';
import { useChatStore } from '../../store/chatStore';
import { chatApi } from '../../api/chatApi';
import ChatThread from '../../components/chat/ChatThread';

function formatRelative(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Vừa xong';
  if (m < 60) return `${m} phút`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ`;
  return d.toLocaleDateString('vi-VN');
}

function previewText(content?: string, type?: string): string {
  if (type === 'IMAGE') return '🖼️ Ảnh';
  if (type === 'FILE') return '📎 Tệp đính kèm';
  return content ?? '';
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ChatPage() {
  const conversations = useChatStore((s) => s.conversations);
  const setConversations = useChatStore((s) => s.setConversations);
  const activeId = useChatStore((s) => s.activeConversationId);
  const setActive = useChatStore((s) => s.setActiveConversation);

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    chatApi
      .listConversations()
      .then((list) => {
        if (!cancelled) setConversations(list);
      })
      .catch(() => { /* im lặng */ })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [setConversations]);

  useEffect(() => {
    return () => setActive(null);
  }, [setActive]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.userFullName.toLowerCase().includes(q) ||
        c.userEmail.toLowerCase().includes(q) ||
        (c.userFaculty ?? '').toLowerCase().includes(q)
    );
  }, [conversations, search]);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  const active = conversations.find((c) => c.id === activeId);

  return (
    <div className="h-[calc(100vh-7rem)] flex bg-white rounded-2xl border border-blue-100 shadow-[0_8px_30px_-12px_rgba(37,99,235,0.18)] overflow-hidden">
      {/* Cột danh sách */}
      <div className="w-80 border-r border-blue-100 flex flex-col bg-gradient-to-b from-blue-50/70 to-white">
        {/* Header danh sách */}
        <div className="px-4 pt-4 pb-3 border-b border-blue-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Hộp tin nhắn</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {conversations.length} cuộc trò chuyện
                {totalUnread > 0 && (
                  <span className="ml-1.5 text-blue-600 font-medium">· {totalUnread} chưa đọc</span>
                )}
              </p>
            </div>
          </div>
          <div className="relative">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-blue-400 absolute left-3 top-1/2 -translate-y-1/2">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm giảng viên..."
              className="w-full h-9 pl-9 pr-3 rounded-full border border-blue-200 bg-white text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
        </div>

        {/* Danh sách */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading && conversations.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">Đang tải...</p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6 text-blue-400">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <p className="text-sm text-gray-500">
                {search ? 'Không tìm thấy giảng viên' : 'Chưa có cuộc trò chuyện'}
              </p>
            </div>
          ) : (
            filtered.map((c) => {
              const selected = c.id === activeId;
              const hasUnread = c.unreadCount > 0;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActive(c.id)}
                  className={`w-full text-left px-3 py-2.5 flex items-start gap-3 rounded-xl mb-1 transition-all border ${
                    selected
                      ? 'bg-blue-50 border-blue-400 shadow-sm'
                      : 'border-transparent hover:bg-white hover:shadow-sm hover:border-blue-100'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                      {c.userAvatarUrl ? (
                        <img src={c.userAvatarUrl} alt={c.userFullName} className="w-full h-full object-cover" />
                      ) : (
                        getInitials(c.userFullName)
                      )}
                    </div>
                    {hasUnread && (
                      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-500 ring-2 ring-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${
                        selected ? 'text-blue-700 font-semibold' : hasUnread ? 'text-gray-900 font-semibold' : 'text-gray-900 font-medium'
                      }`}>
                        {c.userFullName}
                      </p>
                      <span className={`text-[10px] flex-shrink-0 ${
                        selected ? 'text-blue-500' : 'text-gray-400'
                      }`}>
                        {formatRelative(c.lastMessageAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className={`text-xs truncate ${
                        hasUnread ? 'text-gray-800 font-medium' : 'text-gray-500'
                      }`}>
                        {previewText(c.lastMessageContent, c.lastMessageType) || (
                          <span className="italic opacity-70">Chưa có tin nhắn</span>
                        )}
                      </p>
                      {hasUnread && (
                        <span className="min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-semibold flex items-center justify-center flex-shrink-0 bg-red-500 text-white">
                          {c.unreadCount > 99 ? '99+' : c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Cột chat */}
      <div className="flex-1 flex flex-col bg-white min-w-0">
        {active ? (
          <>
            <div className="h-16 px-5 flex items-center gap-3 border-b border-blue-100 bg-white">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-sm font-semibold overflow-hidden flex-shrink-0">
                  {active.userAvatarUrl ? (
                    <img src={active.userAvatarUrl} alt={active.userFullName} className="w-full h-full object-cover" />
                  ) : (
                    getInitials(active.userFullName)
                  )}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 ring-2 ring-white" />
              </div>
              <div className="leading-tight flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{active.userFullName}</p>
                <p className="text-[11px] text-gray-500 truncate">
                  {active.userFaculty ? `${active.userFaculty} · ` : ''}{active.userEmail}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActive(null)}
                className="w-9 h-9 rounded-lg text-gray-400 hover:bg-blue-400 hover:text-blue-600 flex items-center justify-center transition-colors"
                title="Đóng cuộc trò chuyện"
                aria-label="Đóng"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ChatThread conversationId={active.id} targetUserId={active.userId} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6 bg-gradient-to-b from-blue-50/40 to-white">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 border border-blue-100 flex items-center justify-center mb-4 shadow-sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 text-blue-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-base font-semibold text-gray-700">Chọn một cuộc trò chuyện</p>
            <p className="text-sm text-gray-500 mt-1">Chọn giảng viên ở danh sách bên trái để bắt đầu hỗ trợ</p>
          </div>
        )}
      </div>
    </div>
  );
}
