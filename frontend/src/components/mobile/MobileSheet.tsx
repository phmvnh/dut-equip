import { useEffect } from 'react';

interface Props {
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Nội dung cố định dưới đáy (nút hành động) */
  footer?: React.ReactNode;
}

/**
 * Bottom-sheet full-width cho mobile: trượt lên từ đáy, khoá scroll nền,
 * có handle kéo và nút đóng. Vùng nội dung tự cuộn.
 */
export default function MobileSheet({ title, onClose, children, footer }: Props) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 animate-fade-in" />

      <div
        className="relative bg-white rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-sheet-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-2.5 pb-1 shrink-0">
          <span className="w-10 h-1.5 rounded-full bg-gray-300" />
        </div>

        {title && (
          <div className="flex items-center justify-between px-5 pb-3 pt-1 border-b border-gray-100 shrink-0">
            <h2 className="text-base font-semibold text-ink tracking-[-0.01em]">{title}</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 -mr-1 rounded-lg flex items-center justify-center text-gray-400 active:bg-gray-100"
              aria-label="Đóng"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>

        {footer && (
          <div
            className="shrink-0 px-5 pt-3 border-t border-gray-100 bg-white"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
