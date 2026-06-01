import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import ChatThread from './ChatThread';

// Floating chat widget — chỉ hiển thị khi user đã đăng nhập với role USER.
// Admin có trang chat riêng, không dùng widget này.
export default function ChatWidget() {
  const role = useAuthStore((s) => s.user?.role);
  if (role !== 'USER') return null;
  return <ChatWidgetInner />;
}

// Tách phần có hooks vào component con — đảm bảo widget không "chạm" vào
// activeConversationId của admin (admin dùng ChatPage để quản lý conversation).
function ChatWidgetInner() {
  const conversations = useChatStore((s) => s.conversations);
  const unreadCount = useChatStore((s) => s.unreadCount);
  const setActive = useChatStore((s) => s.setActiveConversation);
  const [open, setOpen] = useState(false);

  const myConv = conversations[0]; // USER chỉ có 1

  useEffect(() => {
    if (open && myConv) setActive(myConv.id);
    else setActive(null);
  }, [open, myConv, setActive]);

  // ESC đóng popup — chỉ gắn listener khi đang mở để khỏi nuốt phím ở chỗ khác
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-40 w-10 h-10 rounded-full bg-blue-50 text-blue-600 border-2 border-blue-500 shadow-[0_4px_14px_-4px_rgba(37,99,235,0.45)] hover:bg-blue-100 hover:shadow-[0_6px_18px_-4px_rgba(37,99,235,0.6)] flex items-center justify-center transition-all hover:scale-105"
        title={open ? 'Đóng' : 'Trò chuyện với quản trị viên'}
        aria-label="Trò chuyện"
      >
        {open ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-4 h-4">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center ring-2 ring-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </>
        )}
      </button>

      {open && (
        <div className="fixed bottom-20 right-6 z-40 w-[330px] max-w-[calc(100vw-3rem)] h-[460px] max-h-[calc(100vh-7rem)] bg-blue-50/60 rounded-2xl shadow-[0_20px_50px_-15px_rgba(37,99,235,0.35)] border border-blue-200 flex flex-col overflow-hidden backdrop-blur">
          <div className="h-11 px-3 flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-500 text-white">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-[11px] font-semibold backdrop-blur">QT</div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 ring-2 ring-blue-600" />
              </div>
              <div className="leading-tight">
                <p className="text-xs font-semibold">Quản trị viên</p>
                <p className="text-[10px] opacity-80">Đang trực tuyến</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-lg hover:bg-white/15 flex items-center justify-center transition-colors"
              aria-label="Đóng"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          {myConv ? (
            // min-h-0 cần thiết: trong flex column, default min-height = auto khiến child
            // (ChatThread) có thể tràn parent khi messages dài → input bị overflow-hidden cắt.
            <div className="flex-1 min-h-0 overflow-hidden">
              <ChatThread conversationId={myConv.id} />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-gray-400">
              Đang khởi tạo cuộc trò chuyện...
            </div>
          )}
        </div>
      )}
    </>
  );
}
