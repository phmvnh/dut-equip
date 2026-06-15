import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '../../store/chatStore';
import ChatThread from '../../components/chat/ChatThread';

/**
 * Trang chat riêng cho mobile (tab Chat ở bottom nav).
 * USER chỉ có 1 hội thoại với quản trị viên — mở full-screen, tái dùng ChatThread.
 * Bottom nav được ẩn ở trang này để nhường chỗ cho ô nhập tin.
 */
export default function MobileChatPage() {
  const navigate = useNavigate();
  const conversations = useChatStore((s) => s.conversations);
  const setActive = useChatStore((s) => s.setActiveConversation);
  const myConv = conversations[0]; // USER chỉ có 1

  const rootRef = useRef<HTMLDivElement>(null);

  // Đánh dấu hội thoại đang mở khi ở trang này — để tin đến không cộng badge nữa
  useEffect(() => {
    if (myConv) setActive(myConv.id);
    return () => setActive(null);
  }, [myConv, setActive]);

  // Ghim khung chat đúng vùng nhìn thấy (visual viewport) và khoá cuộn document.
  // Root là position:fixed nên không trôi theo document; height + translateY bám theo
  // visualViewport để khi bàn phím bật, cả khung trượt lên (ô nhập nằm ngay trên bàn
  // phím kiểu Messenger) — KHÔNG kéo lên/xuống được. dvh không trừ chiều cao bàn phím.
  useEffect(() => {
    // Khoá cuộn body để khối chat không bị kéo trượt khi bàn phím mở
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const vv = window.visualViewport;
    const el = rootRef.current;
    let detach = () => {};
    if (vv && el) {
      const sync = () => {
        el.style.height = `${vv.height}px`;
        el.style.transform = `translateY(${vv.offsetTop}px)`;
      };
      sync();
      vv.addEventListener('resize', sync);
      vv.addEventListener('scroll', sync);
      detach = () => {
        vv.removeEventListener('resize', sync);
        vv.removeEventListener('scroll', sync);
      };
    }
    return () => {
      document.body.style.overflow = prevOverflow;
      detach();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="fixed top-0 left-0 w-full h-[100dvh] flex flex-col bg-white font-sf overflow-hidden"
    >
      {/* Header */}
      <header
        className="shrink-0 flex items-center gap-2.5 px-3 h-14 border-b border-black/[0.06] bg-white/80 backdrop-blur-xl"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <button
          onClick={() => navigate('/')}
          className="w-9 h-9 -ml-1 flex items-center justify-center rounded-lg text-gray-600 active:bg-gray-100"
          aria-label="Quay lại"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-action text-white flex items-center justify-center text-xs font-semibold">QT</div>
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 ring-2 ring-white" />
        </div>
        <div className="leading-tight">
          <p className="text-[15px] font-semibold text-ink tracking-[-0.01em]">Quản trị viên</p>
          <p className="text-[11px] text-gray-400">Đang trực tuyến</p>
        </div>
      </header>

      {/* Khung chat — ChatThread tự lo cuộn, gửi, realtime */}
      <div
        className="flex-1 min-h-0"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {myConv ? (
          <ChatThread conversationId={myConv.id} />
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-gray-400">
            Đang khởi tạo cuộc trò chuyện...
          </div>
        )}
      </div>
    </div>
  );
}
