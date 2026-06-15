import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../../../api/authApi';
import { useAuthStore } from '../../../store/authStore';
import { useToastStore } from '../../../store/toastStore';
import type { User } from '../../../types/auth';
import MobileSubHeader from '../../../components/mobile/MobileSubHeader';

const ROLE_LABEL: Record<string, string> = { ADMIN: 'Quản trị viên', USER: 'Giảng viên' };
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const editInput =
  'w-full h-11 px-3 rounded-xl border border-gray-200 text-[15px] text-gray-900 outline-none focus:border-action focus:ring-2 focus:ring-action/15';

function MenuLink({ to, label, icon }: { to: string; label: string; icon: React.ReactNode }) {
  return (
    <Link to={to} className="flex items-center gap-3 px-4 h-14 active:bg-gray-50 border-b border-gray-50 last:border-0">
      <span className="text-gray-400">{icon}</span>
      <span className="flex-1 text-[15px] text-gray-800">{label}</span>
      <svg className="w-5 h-5 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </Link>
  );
}

export default function MobileProfile() {
  const storeUser = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);
  const showToast = useToastStore((s) => s.show);
  const navigate = useNavigate();

  const [user, setLocalUser] = useState<User | null>(storeUser);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', faculty: '', phone: '', personalEmail: '' });
  const [errors, setErrors] = useState<{ fullName?: string; email?: string; faculty?: string; personalEmail?: string }>({});
  const [saving, setSaving] = useState(false);

  const avatarRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    authApi.me().then((data) => { setLocalUser(data); setUser(data); }).catch(() => {});
  }, [setUser]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) { showToast('Chỉ chấp nhận JPG, PNG hoặc WEBP', 'error'); return; }
    if (file.size > MAX_AVATAR_SIZE) { showToast('Kích thước ảnh tối đa 5MB', 'error'); return; }
    setAvatarUploading(true);
    try {
      const updated = await authApi.uploadAvatar(file);
      setLocalUser(updated);
      setUser(updated);
    } catch (err: unknown) {
      showToast((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Tải ảnh thất bại', 'error');
    } finally {
      setAvatarUploading(false);
    }
  };

  const startEdit = () => {
    if (!user) return;
    setForm({ fullName: user.fullName, email: user.email, faculty: user.faculty ?? '', phone: user.phone ?? '', personalEmail: user.personalEmail ?? '' });
    setErrors({});
    setEditing(true);
  };

  const handleSave = async () => {
    if (!user) return;
    const errs: typeof errors = {};
    if (!form.fullName.trim()) errs.fullName = 'Họ tên không được để trống';
    if (!form.email.trim()) errs.email = 'Email không được để trống';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = 'Email không hợp lệ';
    if (!form.faculty.trim()) errs.faculty = 'Khoa không được để trống';
    if (form.personalEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.personalEmail.trim()))
      errs.personalEmail = 'Email không hợp lệ';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      let updated = await authApi.updateProfile({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        faculty: form.faculty.trim(),
        phone: form.phone.trim() || undefined,
      });
      const newPersonalEmail = form.personalEmail.trim();
      if (newPersonalEmail && newPersonalEmail !== (user.personalEmail ?? '')) {
        updated = await authApi.updatePersonalEmail({ personalEmail: newPersonalEmail });
      }
      setLocalUser(updated);
      setUser(updated);
      setEditing(false);
      showToast('Cập nhật thông tin thành công', 'success');
    } catch (err: unknown) {
      showToast((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Cập nhật thất bại', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  return (
    <>
      <MobileSubHeader
        title="Tài khoản"
        right={
          !editing && user ? (
            <button onClick={startEdit} className="h-9 px-3 rounded-lg text-sm font-medium text-action active:bg-action/5">
              Sửa
            </button>
          ) : undefined
        }
      />

      {user && (
        <div className="px-4 py-4 space-y-4">
          {/* Thẻ hồ sơ */}
          <div className="card-soft p-4 flex items-center gap-4">
            <div className="relative w-16 h-16 shrink-0">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.fullName} className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-action flex items-center justify-center text-white text-lg font-bold">
                  {getInitials(user.fullName)}
                </div>
              )}
              <button
                onClick={() => avatarRef.current?.click()}
                disabled={avatarUploading}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white border border-gray-200 shadow flex items-center justify-center active:bg-gray-50 disabled:opacity-60"
                aria-label="Đổi ảnh đại diện"
              >
                {avatarUploading ? (
                  <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5 text-action" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                )}
              </button>
              <input ref={avatarRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 truncate">{user.fullName}</p>
              <p className="text-sm text-gray-400 truncate">{user.email}</p>
              <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium bg-action/10 text-action">
                {ROLE_LABEL[user.role] ?? user.role}
              </span>
            </div>
          </div>

          {editing ? (
            <div className="card-soft p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Họ và tên</label>
                <input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} className={editInput} />
                {errors.fullName && <p className="mt-1 text-xs text-red-500">{errors.fullName}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={editInput} />
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Khoa</label>
                <input value={form.faculty} onChange={(e) => setForm((f) => ({ ...f, faculty: e.target.value }))} className={editInput} placeholder="VD: Khoa CNTT" />
                {errors.faculty && <p className="mt-1 text-xs text-red-500">{errors.faculty}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Số điện thoại</label>
                <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} className={editInput} placeholder="Nhập số điện thoại" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Gmail nhận thông báo</label>
                <input type="email" value={form.personalEmail} onChange={(e) => setForm((f) => ({ ...f, personalEmail: e.target.value }))} className={editInput} placeholder="ten@gmail.com" />
                {errors.personalEmail && <p className="mt-1 text-xs text-red-500">{errors.personalEmail}</p>}
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setEditing(false)} disabled={saving} className="flex-1 h-11 rounded-full bg-gray-100 text-gray-700 text-sm font-semibold active:bg-gray-200 disabled:opacity-60">
                  Hủy
                </button>
                <button onClick={handleSave} disabled={saving} className="flex-1 h-11 rounded-full bg-action text-white text-sm font-semibold active:bg-action-press active:scale-[0.98] transition disabled:opacity-60">
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </div>
          ) : (
            <div className="card-soft px-4 py-1">
              <Row label="Khoa" value={user.faculty} />
              <Row label="Số điện thoại" value={user.phone} />
              <Row label="Gmail nhận thông báo" value={user.personalEmail ?? undefined} />
            </div>
          )}

          {/* Menu */}
          <div className="card-soft overflow-hidden">
            <MenuLink to="/account/history" label="Lịch sử mượn/trả" icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 15" /></svg>
            } />
            <MenuLink to="/account/compensations" label="Bồi thường" icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h18v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" /><path d="M3 7l3-3h12l3 3" /></svg>
            } />
            <MenuLink to="/account/change-password" label="Đổi mật khẩu" icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
            } />
          </div>

          <button onClick={handleLogout} className="w-full h-12 card-soft text-red-600 text-[15px] font-semibold active:bg-red-50">
            Đăng xuất
          </button>
        </div>
      )}
    </>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center gap-4 py-3.5 border-b border-gray-50 last:border-0">
      <span className="w-32 shrink-0 text-sm text-gray-400">{label}</span>
      <span className="text-sm text-gray-800 font-medium">{value || <span className="text-gray-300 font-normal">Chưa cập nhật</span>}</span>
    </div>
  );
}
