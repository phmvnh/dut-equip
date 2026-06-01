import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useOutletContext } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { buildingApi, type BuildingResponse, type BuildingEnvironmentStability } from '../../api/buildingApi';
import { useToastStore } from '../../store/toastStore';

export default function BuildingsPage() {
  const qc = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const [searchParams, setSearchParams] = useSearchParams();
  const { search } = useOutletContext<{ search: string }>();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BuildingResponse | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [stability, setStability] = useState<BuildingEnvironmentStability>('STABLE');
  const [formError, setFormError] = useState('');

  const { data: buildings = [], isLoading } = useQuery({
    queryKey: ['buildings'],
    queryFn: buildingApi.getAll,
  });

  const filteredBuildings = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return buildings;
    return buildings.filter((b) => (b.name ?? '').toLowerCase().includes(q));
  }, [buildings, search]);

  const createMut = useMutation({
    mutationFn: buildingApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['buildings'] });
      closeForm();
      toast('Thêm khu/tòa nhà thành công');
    },
    onError: (e: any) => {
      const msg = e.response?.data?.message ?? 'Có lỗi xảy ra';
      setFormError(msg);
      toast(msg, 'error');
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, name: n, environmentStability: s }: { id: number; name: string; environmentStability: BuildingEnvironmentStability }) =>
      buildingApi.update(id, { name: n, environmentStability: s }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['buildings'] });
      closeForm();
      toast('Cập nhật khu/tòa nhà thành công');
    },
    onError: (e: any) => {
      const msg = e.response?.data?.message ?? 'Có lỗi xảy ra';
      setFormError(msg);
      toast(msg, 'error');
    },
  });

  const deleteMut = useMutation({
    mutationFn: buildingApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['buildings'] });
      setDeleteId(null);
      toast('Xóa khu/tòa nhà thành công');
    },
    onError: (e: any) => toast(e.response?.data?.message ?? 'Có lỗi xảy ra', 'error'),
  });

  const openCreate = () => { setEditing(null); setName(''); setStability('STABLE'); setFormError(''); setShowForm(true); };
  const openEdit = (b: BuildingResponse) => { setEditing(b); setName(b.name); setStability(b.environmentStability); setFormError(''); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditing(null); setName(''); setStability('STABLE'); setFormError(''); };

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      openCreate();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  const handleSubmit = (e: React.BaseSyntheticEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setFormError('Tên khu/tòa nhà không được để trống'); return; }
    if (editing) updateMut.mutate({ id: editing.id, name: trimmed, environmentStability: stability });
    else createMut.mutate({ name: trimmed, environmentStability: stability });
  };

  const pending = createMut.isPending || updateMut.isPending;

  return (
    <div>
      <div className="bg-white" style={{ border: '1px solid #e5e7eb', borderRadius: 10 }}>
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500 bg-gray-50">
            <tr>
              <th className="px-5 py-2.5 font-medium">STT</th>
              <th className="px-5 py-2.5 font-medium">Tên khu/tòa nhà</th>
              <th className="px-5 py-2.5 font-medium">Môi trường</th>
              <th className="px-5 py-2.5 font-medium text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-gray-400">Đang tải...</td>
              </tr>
            ) : filteredBuildings.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-gray-400">
                  {search.trim() ? 'Không tìm thấy khu/tòa nhà phù hợp' : 'Chưa có khu/tòa nhà nào'}
                </td>
              </tr>
            ) : (
              filteredBuildings.map((b, i) => (
                <tr key={b.id} className="border-t border-gray-100">
                  <td className="px-5 py-3 text-gray-500">{i + 1}</td>
                  <td className="px-5 py-3 font-medium">{b.name}</td>
                  <td className="px-5 py-3">
                    {b.environmentStability === 'STABLE' ? (
                      <span className="text-xs font-medium px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Ổn định
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                        Chịu ảnh hưởng
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      onClick={() => openEdit(b)}
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
                      onClick={() => setDeleteId(b.id)}
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

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold mb-4">
              {editing ? 'Sửa khu/tòa nhà' : 'Thêm khu/tòa nhà'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên khu/tòa nhà <span className="text-red-500">*</span>
                </label>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => { setName(e.target.value); setFormError(''); }}
                  placeholder="VD: Khu A, Hội trường F..."
                  maxLength={50}
                  className="w-full px-3 py-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ border: '1px solid #e5e7eb' }}
                />
                {formError && <p className="text-xs text-red-500 mt-1">{formError}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Mức độ ổn định môi trường <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="stability"
                      value="STABLE"
                      checked={stability === 'STABLE'}
                      onChange={() => setStability('STABLE')}
                      className="mt-0.5"
                    />
                    <span className="text-sm">
                      <span className="font-medium">Ổn định</span>
                      <span className="text-gray-500"> — phòng học, văn phòng, có điều hòa</span>
                    </span>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="stability"
                      value="VOLATILE"
                      checked={stability === 'VOLATILE'}
                      onChange={() => setStability('VOLATILE')}
                      className="mt-0.5"
                    />
                    <span className="text-sm">
                      <span className="font-medium">Chịu ảnh hưởng môi trường</span>
                      <span className="text-gray-500"> — xưởng, ngoài trời, nhiều bụi/ẩm/rung</span>
                    </span>
                  </label>
                </div>
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

      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold mb-2">Xác nhận xóa</h2>
            <p className="text-sm text-gray-600 mb-6">
              Bạn có chắc chắn muốn xóa khu/tòa nhà này không?
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
