import { useToastStore } from '../store/toastStore';

const CONFIG = {
  success: {
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
      </svg>
    ),
    bg: '#16a34a',
  },
  error: {
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
      </svg>
    ),
    bg: '#dc2626',
  },
  info: {
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
      </svg>
    ),
    bg: '#2563eb',
  },
};

export default function Toast() {
  const { visible, message, type, hide } = useToastStore();

  if (!visible) return null;

  const { icon, bg } = CONFIG[type];

  return (
    <div className="fixed bottom-6 right-6 z-[200] pointer-events-none">
      <div
        className="pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white text-sm font-medium"
        style={{ backgroundColor: bg, minWidth: 260, maxWidth: 380 }}
      >
        <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          {icon}
        </span>
        <span className="flex-1 leading-snug">{message}</span>
        <button
          onClick={hide}
          className="ml-1 opacity-60 hover:opacity-100 transition-opacity text-xl leading-none"
          aria-label="Đóng"
        >
          ×
        </button>
      </div>
    </div>
  );
}
