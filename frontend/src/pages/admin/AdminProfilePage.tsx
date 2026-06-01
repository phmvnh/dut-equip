import { useEffect, useRef, useState } from 'react';
import { authApi } from '../../api/authApi';
import { useAuthStore } from '../../store/authStore';
import type { User } from '../../types/auth';

const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Quản trị viên',
  USER: 'Giảng viên',
};

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center py-3 border-b border-gray-100 last:border-0 gap-4">
      <span className="w-32 shrink-0 text-sm text-gray-500">{label}</span>
      <span className="text-sm text-gray-900 font-medium">
        {value ?? <span className="text-gray-400 font-normal">Chưa cập nhật</span>}
      </span>
    </div>
  );
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface ProfileForm {
  fullName: string;
  faculty: string;
  phone: string;
}

const INPUT_STYLE = { border: '1px solid #d1d5db' };
const INPUT_CLASS = 'w-full px-3 py-2 text-sm rounded-lg outline-none transition-shadow';

function focusInput(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.border = '1px solid #2563eb';
  e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)';
}
function blurInput(e: React.FocusEvent<HTMLInputElement>) {
  e.target.style.border = '1px solid #d1d5db';
  e.target.style.boxShadow = 'none';
}

export default function AdminProfilePage() {
  const storeUser = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [user, setLocalUser] = useState<User | null>(storeUser);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileForm>({ fullName: '', faculty: '', phone: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState('');
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  const [form, setForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState('');

  useEffect(() => {
    authApi.me()
      .then((data) => { setLocalUser(data); setUser(data); })
      .catch(() => setProfileError('Không thể tải thông tin tài khoản.'))
      .finally(() => setProfileLoading(false));
  }, [setUser]);

  const handleStartEdit = () => {
    if (!user) return;
    setProfileForm({
      fullName: user.fullName,
      faculty: user.faculty ?? '',
      phone: user.phone ?? '',
    });
    setProfileSaveError('');
    setProfileSaveSuccess(false);
    setIsEditing(true);
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setProfileSaveError('');
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSaveError('');
    try {
      const updated = await authApi.updateProfile({
        fullName: profileForm.fullName.trim(),
        faculty: profileForm.faculty.trim() || undefined,
        phone: profileForm.phone.trim() || undefined,
      });
      setLocalUser(updated);
      setUser(updated);
      setIsEditing(false);
      setProfileSaveSuccess(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setProfileSaveError(msg || 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleAvatarPick = () => avatarInputRef.current?.click();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setAvatarError('Chỉ chấp nhận file JPG, PNG hoặc WEBP');
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setAvatarError('Kích thước ảnh tối đa 5MB');
      return;
    }

    setAvatarError('');
    setAvatarUploading(true);
    try {
      const updated = await authApi.uploadAvatar(file);
      setLocalUser(updated);
      setUser(updated);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setAvatarError(msg || 'Tải ảnh thất bại, vui lòng thử lại.');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setPwError('');
    setPwSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      setPwError('Mật khẩu xác nhận không khớp.');
      return;
    }
    setPwLoading(true);
    setPwError('');
    try {
      await authApi.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setPwSuccess(true);
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setPwError(msg || 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

      {/* Profile info */}
      <div className="lg:col-span-3 bg-white" style={{ border: '1px solid #e5e7eb', borderRadius: 10 }}>
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold">Thông tin cá nhân</h2>
          {!profileLoading && !profileError && user && !isEditing && (
            <button
              onClick={handleStartEdit}
              className="text-sm px-3 py-1.5 rounded-lg font-medium"
              style={{ border: '1px solid #2563eb', color: '#2563eb' }}
            >
              Chỉnh sửa
            </button>
          )}
        </div>

        {profileLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : profileError ? (
          <div className="px-5 py-8 text-center text-sm text-red-500">{profileError}</div>
        ) : user && (
          <>
            <div className="px-5 py-5 flex items-center gap-4 border-b border-gray-100">
              <div className="relative w-14 h-14 shrink-0">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.fullName}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold"
                    style={{ backgroundColor: '#2563eb' }}
                  >
                    {getInitials(user.fullName)}
                  </div>
                )}

                {isEditing && (
                  <button
                    type="button"
                    onClick={handleAvatarPick}
                    disabled={avatarUploading}
                    title="Đổi ảnh đại diện"
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white shadow flex items-center justify-center hover:bg-gray-50 disabled:opacity-60"
                    style={{ border: '1px solid #e5e7eb' }}
                  >
                    {avatarUploading ? (
                      <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                      </svg>
                    )}
                  </button>
                )}

                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">{user.fullName}</p>
                <span
                  className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: '#dbeafe', color: '#1d4ed8' }}
                >
                  {ROLE_LABEL[user.role] ?? user.role}
                </span>
                {avatarError && (
                  <p className="mt-1.5 text-xs" style={{ color: '#dc2626' }}>{avatarError}</p>
                )}
              </div>
            </div>

            {!isEditing ? (
              <div className="px-5 py-1">
                {profileSaveSuccess && (
                  <div
                    className="mt-4 mb-2 flex items-center gap-2 text-sm px-4 py-3 rounded-lg"
                    style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d' }}
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                    </svg>
                    Cập nhật thông tin thành công!
                  </div>
                )}
                <InfoRow label="Email" value={user.email} />
                <InfoRow label="Khoa / Bộ môn" value={user.faculty} />
                <InfoRow label="Số điện thoại" value={user.phone} />
              </div>
            ) : (
              <form onSubmit={handleProfileSubmit} className="px-5 py-5 space-y-4">
                {profileSaveError && (
                  <div
                    className="flex items-center gap-2 text-sm px-4 py-3 rounded-lg"
                    style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    {profileSaveError}
                  </div>
                )}

                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">Họ và tên</label>
                  <input
                    type="text"
                    name="fullName"
                    value={profileForm.fullName}
                    onChange={handleProfileChange}
                    required
                    placeholder="Nhập họ và tên"
                    className={INPUT_CLASS}
                    style={INPUT_STYLE}
                    onFocus={focusInput}
                    onBlur={blurInput}
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={user.email}
                    disabled
                    className={INPUT_CLASS + ' bg-gray-50 cursor-not-allowed text-gray-500'}
                    style={INPUT_STYLE}
                  />
                  <p className="text-xs text-gray-400 mt-1">Email đăng nhập không thể thay đổi</p>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">Khoa / Bộ môn</label>
                  <input
                    type="text"
                    name="faculty"
                    value={profileForm.faculty}
                    onChange={handleProfileChange}
                    placeholder="VD: Cơ khí"
                    className={INPUT_CLASS}
                    style={INPUT_STYLE}
                    onFocus={focusInput}
                    onBlur={blurInput}
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1.5">Số điện thoại</label>
                  <input
                    type="tel"
                    name="phone"
                    value={profileForm.phone}
                    onChange={handleProfileChange}
                    placeholder="VD: 0236.3842.414"
                    className={INPUT_CLASS}
                    style={INPUT_STYLE}
                    onFocus={focusInput}
                    onBlur={blurInput}
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="px-4 py-2 text-sm font-medium bg-blue-100 text-blue-800 border border-blue-300 rounded-lg flex items-center gap-2 hover:bg-blue-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {profileSaving && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                    {profileSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    disabled={profileSaving}
                    className="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-60"
                  >
                    Hủy
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>

      {/* Change password */}
      <div className="lg:col-span-2 bg-white" style={{ border: '1px solid #e5e7eb', borderRadius: 10 }}>
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="font-semibold">Đổi mật khẩu</h2>
        </div>
        <div className="px-5 py-5">
          {pwSuccess && (
            <div
              className="mb-4 flex items-center gap-2 text-sm px-4 py-3 rounded-lg"
              style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d' }}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              Đổi mật khẩu thành công!
            </div>
          )}
          {pwError && (
            <div
              className="mb-4 flex items-center gap-2 text-sm px-4 py-3 rounded-lg"
              style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              {pwError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { name: 'currentPassword', label: 'Mật khẩu hiện tại', placeholder: 'Nhập mật khẩu hiện tại' },
              { name: 'newPassword', label: 'Mật khẩu mới', placeholder: 'Tối thiểu 8 ký tự' },
              { name: 'confirmPassword', label: 'Xác nhận mật khẩu mới', placeholder: 'Nhập lại mật khẩu mới' },
            ].map((field) => (
              <div key={field.name}>
                <label className="block text-sm text-gray-700 mb-1.5">{field.label}</label>
                <input
                  type="password"
                  name={field.name}
                  value={form[field.name as keyof PasswordForm]}
                  onChange={handleFormChange}
                  required
                  minLength={field.name === 'newPassword' ? 8 : undefined}
                  placeholder={field.placeholder}
                  className={INPUT_CLASS}
                  style={INPUT_STYLE}
                  onFocus={(e) => { e.target.style.border = '1px solid #2563eb'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)'; }}
                  onBlur={(e) => { e.target.style.border = '1px solid #d1d5db'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            ))}

            <button
              type="submit"
              disabled={pwLoading}
              className="w-full py-2 text-sm font-medium bg-blue-100 text-blue-800 border border-blue-300 rounded-lg flex items-center justify-center gap-2 hover:bg-blue-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {pwLoading && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
              {pwLoading ? 'Đang lưu...' : 'Lưu mật khẩu mới'}
            </button>
          </form>
        </div>
      </div>

    </div>
  );
}
