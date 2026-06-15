import { useNavigate } from 'react-router-dom';

interface Props {
  title: string;
  /** Đường dẫn quay lại — nếu có sẽ hiện nút back */
  back?: string;
  right?: React.ReactNode;
}

/** Header dính trên cho các trang con mobile (tài khoản, thông báo). */
export default function MobileSubHeader({ title, back, right }: Props) {
  const navigate = useNavigate();
  return (
    <header
      className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-black/[0.06] flex items-center gap-2 px-3 h-14"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {back ? (
        <button onClick={() => navigate(back)} className="w-9 h-9 -ml-1 flex items-center justify-center rounded-lg text-gray-600 active:bg-gray-100" aria-label="Quay lại">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      ) : (
        <span className="w-1" />
      )}
      <h1 className="flex-1 text-[17px] font-bold text-ink truncate tracking-[-0.01em]">{title}</h1>
      {right}
    </header>
  );
}
