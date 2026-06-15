import { useState } from 'react';
import { authApi } from '../../../api/authApi';
import MobileSubHeader from '../../../components/mobile/MobileSubHeader';

const inputCls =
  'w-full h-12 px-4 rounded-xl border border-gray-200 text-[15px] outline-none focus:border-action focus:ring-2 focus:ring-action/15';

export default function MobileChangePassword() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const change = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError('');
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.newPassword.length < 8) { setError('Mật khẩu mới phải có ít nhất 8 ký tự.'); return; }
    if (form.newPassword !== form.confirmPassword) { setError('Mật khẩu xác nhận không khớp.'); return; }
    setLoading(true);
    try {
      await authApi.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      setSuccess(true);
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <MobileSubHeader title="Đổi mật khẩu" back="/account/profile" />
      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4">
        {success && (
          <div className="flex items-center gap-2.5 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 font-medium">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-green-600 shrink-0">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
            </svg>
            Đổi mật khẩu thành công!
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2.5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-red-500 shrink-0">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Mật khẩu hiện tại</label>
          <input type="password" name="currentPassword" value={form.currentPassword} onChange={change} required className={inputCls} placeholder="Nhập mật khẩu hiện tại" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Mật khẩu mới</label>
          <input type="password" name="newPassword" value={form.newPassword} onChange={change} required minLength={8} className={inputCls} placeholder="Tối thiểu 8 ký tự" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5">Xác nhận mật khẩu mới</label>
          <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={change} required className={inputCls} placeholder="Nhập lại mật khẩu mới" />
        </div>

        <button type="submit" disabled={loading} className="w-full h-12 rounded-full bg-action text-white text-[15px] font-semibold active:bg-action-press active:scale-[0.98] transition disabled:opacity-60">
          {loading ? 'Đang lưu...' : 'Lưu mật khẩu mới'}
        </button>
      </form>
    </>
  );
}
