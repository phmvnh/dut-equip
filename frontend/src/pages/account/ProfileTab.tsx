import { useEffect, useRef, useState } from 'react';
import { authApi } from '../../api/authApi';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import type { User } from '../../types/auth';

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Quản trị viên',
  USER: 'Giảng viên',
};

const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="py-3.5 flex items-center gap-4 border-b border-gray-100 last:border-0">
      <span className="w-36 flex-shrink-0 text-sm text-gray-500">{label}</span>
      <span className="text-sm text-gray-900 font-medium">
        {value ?? <span className="text-gray-400 font-normal">Chưa cập nhật</span>}
      </span>
    </div>
  );
}

function EditRow({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  error?: string;
}) {
  return (
    <div className="py-3 flex items-start gap-4 border-b border-gray-100 last:border-0">
      <label className="w-36 flex-shrink-0 text-sm text-gray-500 pt-2">{label}</label>
      <div className="flex-1 min-w-0">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full h-9 px-3 rounded-lg border text-sm text-gray-900 outline-none transition-colors ${
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-1 focus:ring-red-200'
              : 'border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-200'
          }`}
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}

export default function ProfileTab() {
  const storeUser = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const showToast = useToastStore((s) => s.show);

  const [user, setLocalUser] = useState<User | null>(storeUser);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', faculty: '', phone: '' });
  const [formErrors, setFormErrors] = useState<{ fullName?: string; email?: string; faculty?: string; phone?: string }>({});
  const [saving, setSaving] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  useEffect(() => {
    authApi.me()
      .then((data) => { setLocalUser(data); setUser(data); })
      .catch(() => setError('Không thể tải thông tin tài khoản.'))
      .finally(() => setLoading(false));
  }, [setUser]);

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

  const startEdit = () => {
    if (!user) return;
    setForm({
      fullName: user.fullName,
      email: user.email,
      faculty: user.faculty ?? '',
      phone: user.phone ?? '',
    });
    setFormErrors({});
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setFormErrors({});
  };

  const validate = (): boolean => {
    const errs: typeof formErrors = {};
    if (!form.fullName.trim()) errs.fullName = 'Họ tên không được để trống';
    if (!form.email.trim()) errs.email = 'Email không được để trống';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = 'Email không hợp lệ';
    if (!form.faculty.trim()) errs.faculty = 'Khoa không được để trống';
    if (form.phone && form.phone.length > 20) errs.phone = 'Số điện thoại tối đa 20 ký tự';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!user) return;
    if (!validate()) return;

    setSaving(true);
    try {
      const updated = await authApi.updateProfile({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        faculty: form.faculty.trim(),
        phone: form.phone.trim() || undefined,
      });
      setLocalUser(updated);
      setUser(updated);
      setEditing(false);
      showToast('Cập nhật thông tin thành công', 'success');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(msg || 'Cập nhật thất bại, vui lòng thử lại', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-10 flex justify-center">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-red-200 px-6 py-8 text-center text-sm text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Thông tin cá nhân</h2>
          <p className="text-xs text-gray-500 mt-0.5">Thông tin tài khoản của bạn tại hệ thống DUT Equip</p>
        </div>
        {!editing && user && (
          <button
            type="button"
            onClick={startEdit}
            className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
            </svg>
            Chỉnh sửa
          </button>
        )}
      </div>

      {user && (
        <>
          <div className="px-6 py-5 flex items-center gap-4 border-b border-gray-100">
            <div className="relative w-16 h-16 shrink-0">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.fullName}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-white text-lg font-bold"
                  style={{ backgroundColor: '#2563eb' }}
                >
                  {getInitials(user.fullName)}
                </div>
              )}

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

              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{user.fullName}</p>
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

          {editing ? (
            <>
              <div className="px-6 py-1">
                <EditRow
                  label="Họ và tên"
                  value={form.fullName}
                  onChange={(v) => setForm((f) => ({ ...f, fullName: v }))}
                  placeholder="Nhập họ và tên"
                  error={formErrors.fullName}
                />
                <EditRow
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(v) => setForm((f) => ({ ...f, email: v }))}
                  placeholder="example@dut.udn.vn"
                  error={formErrors.email}
                />
                <InfoRow label="Vai trò" value={ROLE_LABEL[user.role] ?? user.role} />
                <EditRow
                  label="Khoa"
                  value={form.faculty}
                  onChange={(v) => setForm((f) => ({ ...f, faculty: v }))}
                  placeholder="VD: Khoa CNTT"
                  error={formErrors.faculty}
                />
                <EditRow
                  label="Số điện thoại"
                  value={form.phone}
                  onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                  placeholder="Nhập số điện thoại"
                  error={formErrors.phone}
                />
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={saving}
                  className="h-9 px-4 rounded-lg bg-gray-100 text-gray-800 border border-gray-300 text-sm hover:bg-gray-200 transition-colors disabled:opacity-60"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="h-9 px-4 rounded-lg bg-blue-100 text-blue-800 border border-blue-300 text-sm font-medium hover:bg-blue-200 transition-colors disabled:opacity-60 inline-flex items-center gap-2"
                >
                  {saving && (
                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  )}
                  Lưu thay đổi
                </button>
              </div>
            </>
          ) : (
            <div className="px-6 py-1">
              <InfoRow label="Họ và tên" value={user.fullName} />
              <InfoRow label="Email" value={user.email} />
              <InfoRow label="Vai trò" value={ROLE_LABEL[user.role] ?? user.role} />
              <InfoRow label="Khoa" value={user.faculty} />
              <InfoRow label="Số điện thoại" value={user.phone} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
