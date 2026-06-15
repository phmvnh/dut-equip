import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

// Nhắc giảng viên chưa thiết lập Gmail cá nhân — không bắt buộc, chỉ gợi ý cập nhật trong hồ sơ.
export default function PersonalEmailBanner() {
  const user = useAuthStore((s) => s.user);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !user || user.role !== 'USER' || user.personalEmail) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200">
      <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center gap-3">
        <svg className="w-5 h-5 shrink-0 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M22 6.75v10.5A2.25 2.25 0 0 1 19.75 19.5H4.25A2.25 2.25 0 0 1 2 17.25V6.75m20 0A2.25 2.25 0 0 0 19.75 4.5H4.25A2.25 2.25 0 0 0 2 6.75m20 0-10 6.25L2 6.75" />
        </svg>
        <p className="flex-1 text-sm text-amber-800">
          Bạn chưa thiết lập <span className="font-semibold">Gmail cá nhân</span> để nhận thông báo qua email
          (nhắc trả thiết bị, duyệt đơn, bồi thường…). Hãy cập nhật trong hồ sơ cá nhân.
        </p>
        <Link
          to="/account/profile"
          className="shrink-0 h-8 px-3 rounded-lg bg-amber-100 text-amber-800 border border-amber-300 text-sm font-semibold hover:bg-amber-200 transition-colors"
        >
          Cập nhật ngay
        </Link>
        <button
          onClick={() => setDismissed(true)}
          title="Đóng"
          className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-amber-500 hover:bg-amber-100 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
