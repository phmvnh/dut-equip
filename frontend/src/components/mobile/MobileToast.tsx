import { useEffect, useState } from 'react';
import { useToastStore } from '../../store/toastStore';

// Toast riêng cho mobile — banner frosted-glass kiểu thông báo iOS: trượt xuống từ
// mép trên (tránh bottom nav), nền trắng mờ + backdrop blur, chữ ink, một accent màu
// duy nhất ở icon trạng thái. Tôn trọng safe-area. Dùng chung useToastStore.
const CONFIG = {
  success: {
    tint: 'bg-green-500/12 text-green-600',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-[18px] h-[18px]">
        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
      </svg>
    ),
  },
  error: {
    tint: 'bg-red-500/12 text-red-600',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-[18px] h-[18px]">
        <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
      </svg>
    ),
  },
  info: {
    tint: 'bg-action/12 text-action',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-[18px] h-[18px]">
        <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
      </svg>
    ),
  },
};

export default function MobileToast() {
  const { visible, message, type, hide } = useToastStore();
  const [shown, setShown] = useState(false);

  // Bật animation trượt vào ở frame kế tiếp sau khi mount để có hiệu ứng
  useEffect(() => {
    if (!visible) {
      setShown(false);
      return;
    }
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [visible]);

  if (!visible) return null;

  const { tint, icon } = CONFIG[type];

  return (
    <div
      className="fixed inset-x-0 top-0 z-[200] flex justify-center px-4 font-sf pointer-events-none"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 10px)' }}
    >
      <div
        className="pointer-events-auto flex items-center gap-3 w-full max-w-sm pl-3 pr-2.5 py-2.5 rounded-[22px] bg-white/80 backdrop-blur-xl backdrop-saturate-150 border border-black/[0.06] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.25)] transition-all duration-300 ease-out"
        style={{ transform: shown ? 'translateY(0)' : 'translateY(-140%)', opacity: shown ? 1 : 0 }}
      >
        <span className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${tint}`}>
          {icon}
        </span>
        <span className="flex-1 text-[15px] font-medium text-ink leading-snug tracking-[-0.01em]">
          {message}
        </span>
        <button
          onClick={hide}
          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 active:bg-black/[0.05] active:scale-95 transition shrink-0"
          aria-label="Đóng"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
