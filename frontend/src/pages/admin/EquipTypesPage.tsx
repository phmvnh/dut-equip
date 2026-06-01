import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { equipTypeApi, type EquipTypeResponse } from '../../api/equipTypeApi';
import { useToastStore } from '../../store/toastStore';

function formatDateTime(iso: string) {
  if (!iso) return '';
  const [datePart, timePart] = iso.split('T');
  const [y, m, d] = datePart.split('-');
  const [h, min] = (timePart ?? '').split(':');
  return `${d}/${m}/${y} ${h}:${min}`;
}

export default function EquipTypesPage() {
  const qc = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const [searchParams, setSearchParams] = useSearchParams();
  const { search } = useOutletContext<{ search: string }>();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EquipTypeResponse | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [formError, setFormError] = useState('');

  const { data: types = [], isLoading } = useQuery({
    queryKey: ['equip-types'],
    queryFn: equipTypeApi.getAll,
  });

  const filteredTypes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return types;
    return types.filter((t) => (t.name ?? '').toLowerCase().includes(q));
  }, [types, search]);

  const createMut = useMutation({
    mutationFn: equipTypeApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equip-types'] });
      closeForm();
      toast('Thêm loại thiết bị thành công');
    },
    onError: (e: any) => {
      const msg = e.response?.data?.message ?? 'Có lỗi xảy ra';
      setFormError(msg);
      toast(msg, 'error');
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, name: n }: { id: number; name: string }) =>
      equipTypeApi.update(id, { name: n }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equip-types'] });
      closeForm();
      toast('Cập nhật loại thiết bị thành công');
    },
    onError: (e: any) => {
      const msg = e.response?.data?.message ?? 'Có lỗi xảy ra';
      setFormError(msg);
      toast(msg, 'error');
    },
  });

  const deleteMut = useMutation({
    mutationFn: equipTypeApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equip-types'] });
      setDeleteId(null);
      toast('Xóa loại thiết bị thành công');
    },
    onError: (e: any) => toast(e.response?.data?.message ?? 'Có lỗi xảy ra', 'error'),
  });

  const openCreate = () => { setEditing(null); setName(''); setFormError(''); setShowForm(true); };
  const openEdit = (t: EquipTypeResponse) => { setEditing(t); setName(t.name); setFormError(''); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditing(null); setName(''); setFormError(''); };

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      openCreate();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  const handleSubmit = (e: React.BaseSyntheticEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setFormError('Tên loại thiết bị không được để trống'); return; }
    if (editing) updateMut.mutate({ id: editing.id, name: trimmed });
    else createMut.mutate({ name: trimmed });
  };

  const pending = createMut.isPending || updateMut.isPending;

  return (
    <div>
      <div className="bg-white" style={{ border: '1px solid #e5e7eb', borderRadius: 10 }}>
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500 bg-gray-50">
            <tr>
              <th className="px-5 py-2.5 font-medium">STT</th>
              <th className="px-5 py-2.5 font-medium">Tên loại</th>
              <th className="px-5 py-2.5 font-medium">Ngày tạo</th>
              <th className="px-5 py-2.5 font-medium">Cập nhật lần cuối</th>
              <th className="px-5 py-2.5 font-medium text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-gray-400">Đang tải...</td>
              </tr>
            ) : filteredTypes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-gray-400">
                  {search.trim() ? 'Không tìm thấy loại thiết bị phù hợp' : 'Chưa có loại thiết bị nào'}
                </td>
              </tr>
            ) : (
              filteredTypes.map((t, i) => (
                <tr key={t.id} className="border-t border-gray-100">
                  <td className="px-5 py-3 text-gray-500">{i + 1}</td>
                  <td className="px-5 py-3 font-medium">{t.name}</td>
                  <td className="px-5 py-3 text-gray-500">{formatDateTime(t.createdAt)}</td>
                  <td className="px-5 py-3 text-gray-500">{t.updatedAt ? formatDateTime(t.updatedAt) : '—'}</td>
                  <td className="px-5 py-3 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      onClick={() => openEdit(t)}
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
                      onClick={() => setDeleteId(t.id)}
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold mb-4">
              {editing ? 'Sửa loại thiết bị' : 'Thêm loại thiết bị'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên loại <span className="text-red-500">*</span>
                </label>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => { setName(e.target.value); setFormError(''); }}
                  placeholder="VD: Máy chiếu, Laptop..."
                  className="w-full px-3 py-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ border: '1px solid #e5e7eb' }}
                />
                {formError && <p className="text-xs text-red-500 mt-1">{formError}</p>}
              </div>
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
                  {pending ? 'Đang lưu...' : editing ? 'Cập nhật' : 'Thêm'}
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
              Bạn có chắc chắn muốn xóa loại thiết bị này không?
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
    </div>
  );
}
