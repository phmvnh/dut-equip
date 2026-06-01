import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi, type UserResponse, type CreateUserPayload, type UpdateUserPayload } from '../../api/userApi';
import { settingApi } from '../../api/settingApi';
import { useToastStore } from '../../store/toastStore';

type FormMode = 'create' | 'edit';

interface FormState {
  fullName: string;
  email: string;
  faculty: string;
  phone: string;
  role: 'USER' | 'ADMIN';
}

const EMPTY_FORM: FormState = {
  fullName: '',
  email: '',
  faculty: '',
  phone: '',
  role: 'USER',
};

export default function UsersPage() {
  const qc = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const [searchParams, setSearchParams] = useSearchParams();
  const { search } = useOutletContext<{ search: string }>();

  const [mode, setMode] = useState<FormMode>('create');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [resetId, setResetId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: userApi.getAll,
  });

  // Lọc theo search từ header — match họ tên / email / khoa / sđt
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      (u.fullName ?? '').toLowerCase().includes(q) ||
      (u.email ?? '').toLowerCase().includes(q) ||
      (u.faculty ?? '').toLowerCase().includes(q) ||
      (u.phone ?? '').toLowerCase().includes(q)
    );
  }, [users, search]);

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: settingApi.get,
  });
  const defaultPassword = settings?.defaultPassword ?? 'Dut@12345';

  const createMut = useMutation({
    mutationFn: (data: CreateUserPayload) => userApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      closeForm();
      toast(`Thêm giảng viên thành công. Mật khẩu mặc định: ${defaultPassword}`);
    },
    onError: (e: any) => {
      const msg = e.response?.data?.message ?? 'Có lỗi xảy ra';
      setFormError(msg);
      toast(msg, 'error');
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUserPayload }) => userApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      closeForm();
      toast('Cập nhật thông tin thành công');
    },
    onError: (e: any) => {
      const msg = e.response?.data?.message ?? 'Có lỗi xảy ra';
      setFormError(msg);
      toast(msg, 'error');
    },
  });

  const toggleMut = useMutation({
    mutationFn: userApi.toggleActive,
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast(updated.active ? 'Đã mở khóa tài khoản' : 'Đã khóa tài khoản');
    },
    onError: () => toast('Có lỗi xảy ra', 'error'),
  });

  const deleteMut = useMutation({
    mutationFn: userApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setDeleteId(null);
      toast('Xóa người dùng thành công');
    },
    onError: () => toast('Có lỗi xảy ra', 'error'),
  });

  const resetMut = useMutation({
    mutationFn: userApi.resetPassword,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setResetId(null);
      toast(`Đã đặt lại mật khẩu về ${defaultPassword}`);
    },
    onError: (e: any) => {
      toast(e.response?.data?.message ?? 'Có lỗi xảy ra', 'error');
    },
  });

  const openCreate = () => {
    setMode('create');
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (u: UserResponse) => {
    setMode('edit');
    setEditingId(u.id);
    setForm({
      fullName: u.fullName,
      email: u.email,
      faculty: u.faculty ?? '',
      phone: u.phone ?? '',
      role: u.role,
    });
    setFormError('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
  };

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      openCreate();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  // Esc đóng form modal
  useEffect(() => {
    if (!showForm) return;
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') closeForm(); };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [showForm]);

  // Esc hủy / Enter xác nhận xóa
  useEffect(() => {
    if (deleteId === null) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDeleteId(null);
      if (e.key === 'Enter' && !deleteMut.isPending) deleteMut.mutate(deleteId);
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [deleteId, deleteMut.isPending]);

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setFormError('');
  };

  const handleSubmit = (e: React.BaseSyntheticEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) { setFormError('Họ tên không được để trống'); return; }
    if (!form.email.trim()) { setFormError('Email không được để trống'); return; }
    if (mode === 'create' && !form.faculty.trim()) { setFormError('Khoa không được để trống'); return; }

    if (mode === 'create') {
      createMut.mutate({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        faculty: form.faculty.trim(),
        phone: form.phone.trim() || undefined,
      });
    } else if (editingId !== null) {
      updateMut.mutate({
        id: editingId,
        data: {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          faculty: form.faculty.trim() || undefined,
          phone: form.phone.trim() || undefined,
          role: form.role,
        },
      });
    }
  };

  const pending = createMut.isPending || updateMut.isPending;

  return (
    <div>
      <div className="bg-white" style={{ border: '1px solid #e5e7eb', borderRadius: 10 }}>
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500 bg-gray-50">
            <tr>
              <th className="px-5 py-2.5 font-medium">STT</th>
              <th className="px-5 py-2.5 font-medium">Họ tên</th>
              <th className="px-5 py-2.5 font-medium">Email</th>
              <th className="px-5 py-2.5 font-medium">Khoa</th>
              <th className="px-5 py-2.5 font-medium">SĐT</th>
              <th className="px-5 py-2.5 font-medium">Vai trò</th>
              <th className="px-5 py-2.5 font-medium">Trạng thái</th>
              <th className="px-5 py-2.5 font-medium text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="px-5 py-8 text-center text-gray-400">Đang tải...</td></tr>
            ) : filteredUsers.length === 0 ? (
              <tr><td colSpan={8} className="px-5 py-8 text-center text-gray-400">
                {search.trim() ? 'Không tìm thấy người dùng phù hợp' : 'Chưa có người dùng nào'}
              </td></tr>
            ) : (
              filteredUsers.map((u, i) => (
                <tr key={u.id} className="border-t border-gray-100">
                  <td className="px-5 py-3 text-gray-500">{i + 1}</td>
                  <td className="px-5 py-3 font-medium">{u.fullName}</td>
                  <td className="px-5 py-3 text-gray-500">{u.email}</td>
                  <td className="px-5 py-3 text-gray-500">{u.faculty ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-500">{u.phone ?? '—'}</td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <span
                      className="inline-block text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                      style={{
                        backgroundColor: u.role === 'ADMIN' ? '#eff6ff' : '#fce7f3',
                        color: u.role === 'ADMIN' ? '#1d4ed8' : '#be185d',
                      }}
                    >
                      {u.role === 'ADMIN' ? 'Quản trị' : 'Giảng viên'}
                    </span>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <span
                      className="inline-block text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                      style={{
                        backgroundColor: u.active ? '#dcfce7' : '#fee2e2',
                        color: u.active ? '#15803d' : '#b91c1c',
                      }}
                    >
                      {u.active ? 'Hoạt động' : 'Bị khóa'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      onClick={() => openEdit(u)}
                      title="Sửa"
                      aria-label="Sửa"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => toggleMut.mutate(u.id)}
                      disabled={toggleMut.isPending}
                      title={u.active ? 'Khóa' : 'Mở khóa'}
                      aria-label={u.active ? 'Khóa' : 'Mở khóa'}
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-md border disabled:opacity-60 ${
                        u.active
                          ? 'bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-200'
                          : 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200'
                      }`}
                    >
                      {u.active ? (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" />
                          <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => setDeleteId(u.id)}
                      title="Xóa"
                      aria-label="Xóa"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-red-100 text-red-800 border border-red-300 hover:bg-red-200"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6" /><path d="M14 11v6" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Thêm / Sửa */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-base font-semibold mb-4">
              {mode === 'create' ? 'Thêm người dùng' : 'Cập nhật thông tin người dùng'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Họ tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    autoFocus
                    value={form.fullName}
                    onChange={set('fullName')}
                    placeholder="Nguyễn Văn A"
                    className="w-full px-3 py-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ border: '1px solid #e5e7eb' }}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={set('email')}
                    placeholder="gv@dut.udn.vn"
                    className="w-full px-3 py-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ border: '1px solid #e5e7eb' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Khoa {mode === 'create' && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    value={form.faculty}
                    onChange={set('faculty')}
                    placeholder="Khoa CNTT"
                    className="w-full px-3 py-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ border: '1px solid #e5e7eb' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Số điện thoại</label>
                  <input
                    value={form.phone}
                    onChange={set('phone')}
                    placeholder="0901234567"
                    className="w-full px-3 py-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ border: '1px solid #e5e7eb' }}
                  />
                </div>
                {mode === 'edit' && (
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Vai trò</label>
                    <select
                      value={form.role}
                      onChange={set('role')}
                      className="w-full px-3 py-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      style={{ border: '1px solid #e5e7eb' }}
                    >
                      <option value="USER">Giảng viên</option>
                      <option value="ADMIN">Quản trị</option>
                    </select>
                  </div>
                )}
              </div>

              {mode === 'create' && (
                <p className="text-xs text-gray-400">
                  Mật khẩu mặc định: <span className="font-mono font-medium text-gray-600">{defaultPassword}</span>
                </p>
              )}

              {mode === 'edit' && editingId !== null && (
                <div
                  className="flex items-center justify-between gap-3 p-3 rounded-lg bg-gray-50"
                  style={{ border: '1px solid #e5e7eb' }}
                >
                  <div className="text-xs text-gray-600">
                    <p className="font-medium text-gray-700">Mật khẩu</p>
                    <p className="text-gray-500 mt-0.5">
                      Đặt lại về mặc định: <span className="font-mono text-gray-700">{defaultPassword}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setResetId(editingId)}
                    className="text-xs px-3 py-1.5 rounded-md font-medium bg-orange-100 text-orange-800 border border-orange-300 hover:bg-orange-200 whitespace-nowrap"
                  >
                    Đặt lại mật khẩu
                  </button>
                </div>
              )}

              {formError && <p className="text-xs text-red-500">{formError}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeForm}
                  className="text-sm px-4 py-2 rounded-lg bg-gray-100 text-gray-800 border border-gray-300 hover:bg-gray-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="text-sm px-4 py-2 rounded-lg bg-blue-100 text-blue-800 border border-blue-300 font-medium hover:bg-blue-200 disabled:opacity-60"
                >
                  {pending ? 'Đang lưu...' : mode === 'create' ? 'Thêm' : 'Cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xác nhận xóa */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold mb-2">Xác nhận xóa</h2>
            <p className="text-sm text-gray-600 mb-6">
              Bạn có chắc chắn muốn xóa người dùng này không? Hành động này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteId(null)}
                className="text-sm px-4 py-2 rounded-lg bg-gray-100 text-gray-800 border border-gray-300 hover:bg-gray-200"
              >
                Hủy
              </button>
              <button
                onClick={() => deleteMut.mutate(deleteId)}
                disabled={deleteMut.isPending}
                className="text-sm px-4 py-2 rounded-lg bg-red-100 text-red-800 border border-red-300 font-medium hover:bg-red-200 disabled:opacity-60"
              >
                {deleteMut.isPending ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác nhận đặt lại mật khẩu */}
      {resetId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold mb-2">Đặt lại mật khẩu</h2>
            <p className="text-sm text-gray-600 mb-6">
              Mật khẩu của người dùng sẽ được đặt về mặc định:{' '}
              <span className="font-mono font-medium text-gray-900">{defaultPassword}</span>.
              Bạn có chắc chắn không?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setResetId(null)}
                className="text-sm px-4 py-2 rounded-lg bg-gray-100 text-gray-800 border border-gray-300 hover:bg-gray-200"
              >
                Hủy
              </button>
              <button
                onClick={() => resetMut.mutate(resetId)}
                disabled={resetMut.isPending}
                className="text-sm px-4 py-2 rounded-lg bg-orange-100 text-orange-800 border border-orange-300 font-medium hover:bg-orange-200 disabled:opacity-60"
              >
                {resetMut.isPending ? 'Đang đặt lại...' : 'Đặt lại'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
