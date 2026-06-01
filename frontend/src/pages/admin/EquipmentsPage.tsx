import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useOutletContext } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { equipApi, type EquipCreatePayload } from '../../api/equipApi';
import { equipTypeApi } from '../../api/equipTypeApi';
import { buildingApi } from '../../api/buildingApi';
import { useToastStore } from '../../store/toastStore';
import EquipmentDetailModal from '../../components/EquipmentDetailModal';
import MaintenanceFormModal from '../../components/MaintenanceFormModal';
import DisposeFormModal from '../../components/DisposeFormModal';
import QrDownloadModal from '../../components/QrDownloadModal';
import MoneyInput from '../../components/MoneyInput';
import type { Equipment, EquipmentImage, EquipmentStatus } from '../../types/equipment';

const MAX_EXTRA_IMAGES = 8;

const STATUS_LABEL: Record<EquipmentStatus, { label: string; bg: string; color: string }> = {
  AVAILABLE:   { label: 'Sẵn sàng',     bg: '#dcfce7', color: '#15803d' },
  BORROWED:    { label: 'Đang mượn',    bg: '#dbeafe', color: '#1d4ed8' },
  MAINTENANCE: { label: 'Bảo trì',      bg: '#fef9c3', color: '#a16207' },
  BROKEN:      { label: 'Hỏng',         bg: '#fee2e2', color: '#b91c1c' },
  DISPOSED:    { label: 'Đã thanh lý',  bg: '#e5e7eb', color: '#4b5563' },
};

type TabKey = 'ALL' | EquipmentStatus | 'HIDDEN';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'ALL',         label: 'Tất cả' },
  { key: 'AVAILABLE',   label: 'Sẵn sàng' },
  { key: 'BORROWED',    label: 'Đang mượn' },
  { key: 'MAINTENANCE', label: 'Bảo trì' },
  { key: 'BROKEN',      label: 'Hỏng' },
  { key: 'DISPOSED',    label: 'Đã thanh lý' },
  { key: 'HIDDEN',      label: 'Đã ẩn' },
];

const EMPTY_FORM: EquipCreatePayload = {
  code: '',
  name: '',
  equipTypeId: 0,
  buildingId: 0,
  specifications: '',
  description: '',
  purchasePrice: undefined,
  warrantyUntil: '',
};

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white';
const borderStyle = { border: '1px solid #e5e7eb' };

export default function EquipmentsPage() {
  const qc = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const [searchParams, setSearchParams] = useSearchParams();

  // Search dùng chung từ ô tìm kiếm trên header (AdminPage)
  const { search } = useOutletContext<{ search: string }>();
  const [filterTypeId, setFilterTypeId] = useState(0);
  const [tab, setTab] = useState<TabKey>('ALL');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<EquipCreatePayload>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ảnh phụ: tách "đã tồn tại trên server" (có id, xóa qua API ngay)
  // với "mới chọn local" (chưa upload, xóa chỉ cần bỏ khỏi mảng)
  const [extraExistingImages, setExtraExistingImages] = useState<EquipmentImage[]>([]);
  const [extraNewFiles, setExtraNewFiles] = useState<File[]>([]);
  const [extraNewPreviews, setExtraNewPreviews] = useState<string[]>([]);
  // True khi đang fetch ảnh phụ hiện có (edit mode) — chặn thêm ảnh mới để tránh đếm sai
  const [loadingExtras, setLoadingExtras] = useState(false);
  const extraInputRef = useRef<HTMLInputElement>(null);

  const [detailEquip, setDetailEquip] = useState<Equipment | null>(null);
  const [deleteEquip, setDeleteEquip] = useState<Equipment | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [maintenanceTarget, setMaintenanceTarget] = useState<Equipment | null>(null);
  const [disposeTarget, setDisposeTarget] = useState<Equipment | null>(null);
  const [qrTarget, setQrTarget] = useState<Equipment | null>(null);

  const isEditMode = editingId !== null;

  const { data: equipTypes = [] } = useQuery({
    queryKey: ['equip-types'],
    queryFn: equipTypeApi.getAll,
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: buildingApi.getAll,
  });

  // Lọc status + HIDDEN ở FE để tính được count cho mỗi tab; loại + keyword vẫn lọc ở BE
  const { data: equipsRaw = [], isLoading: equipsLoading } = useQuery({
    queryKey: ['equips', filterTypeId, search],
    queryFn: () => equipApi.getAll({
      equipTypeId: filterTypeId || undefined,
      keyword: search.trim() || undefined,
    }),
  });

  const counts = useMemo(() => {
    const c = { ALL: equipsRaw.length, HIDDEN: 0 } as Record<TabKey, number>;
    (['AVAILABLE', 'BORROWED', 'MAINTENANCE', 'BROKEN', 'DISPOSED'] as EquipmentStatus[])
      .forEach((s) => { c[s] = 0; });
    for (const e of equipsRaw) {
      if (e.hidden) c.HIDDEN += 1;
      c[e.status] = (c[e.status] ?? 0) + 1;
    }
    return c;
  }, [equipsRaw]);

  const equips = useMemo(() => {
    if (tab === 'ALL')    return equipsRaw;
    if (tab === 'HIDDEN') return equipsRaw.filter((e) => e.hidden);
    return equipsRaw.filter((e) => e.status === tab);
  }, [equipsRaw, tab]);

  const createMut = useMutation({ mutationFn: equipApi.create });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: EquipCreatePayload }) => equipApi.update(id, data),
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => equipApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equips'] });
      setDeleteEquip(null);
      toast('Xóa thiết bị thành công');
    },
    onError: (e: any) => {
      // BE chặn xóa nếu có lịch sử sử dụng → hiển thị popup chuyên dụng (không dùng toast)
      const msg = e.response?.data?.message ?? 'Không thể xóa thiết bị';
      setDeleteEquip(null);
      setDeleteError(msg);
    },
  });

  const toggleHiddenMut = useMutation({
    mutationFn: (eq: Equipment) => (eq.hidden ? equipApi.show(eq.id) : equipApi.hide(eq.id)),
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['equips'] });
      toast(saved.hidden ? 'Đã ẩn thiết bị khỏi trang chủ' : 'Đã hiển thị lại thiết bị', 'success');
    },
    onError: (e: any) => toast(e.response?.data?.message ?? 'Không thể đổi trạng thái ẩn', 'error'),
  });

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      openModal();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  useEffect(() => {
    if (!showModal) return;
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [showModal]);

  function openModal() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setImageFile(null);
    setImagePreview(null);
    setExtraExistingImages([]);
    setExtraNewFiles([]);
    setExtraNewPreviews([]);
    setLoadingExtras(false);
    setShowModal(true);
  }

  async function openEditModal(eq: Equipment) {
    setEditingId(eq.id);
    setForm({
      code:           eq.code,
      name:           eq.name,
      equipTypeId:    eq.equipTypeId,
      buildingId:     eq.buildingId,
      specifications: eq.specifications ?? '',
      description:    eq.description ?? '',
      purchasePrice:  eq.purchasePrice,
      warrantyUntil:  eq.warrantyUntil ?? '',
    });
    setImageFile(null);
    setImagePreview(eq.mainImageUrl ?? null);
    setExtraExistingImages([]);
    setExtraNewFiles([]);
    setExtraNewPreviews([]);
    setFormError('');
    setLoadingExtras(true);
    setShowModal(true);
    // List view không trả ảnh phụ → fetch detail để load
    try {
      const full = await equipApi.getById(eq.id);
      setExtraExistingImages(full.images ?? []);
    } catch {
      // im lặng — không chặn việc sửa thông tin chính
    } finally {
      setLoadingExtras(false);
    }
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setImageFile(null);
    setImagePreview(null);
    extraNewPreviews.forEach((u) => URL.revokeObjectURL(u));
    setExtraExistingImages([]);
    setExtraNewFiles([]);
    setExtraNewPreviews([]);
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleAddExtraFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const total = extraExistingImages.length + extraNewFiles.length;
    const remaining = MAX_EXTRA_IMAGES - total;
    if (remaining <= 0) {
      toast(`Chỉ cho phép tối đa ${MAX_EXTRA_IMAGES} ảnh phụ`, 'error');
      if (extraInputRef.current) extraInputRef.current.value = '';
      return;
    }
    const accepted = files.slice(0, remaining);
    if (accepted.length < files.length) {
      toast(`Chỉ thêm được ${accepted.length}/${files.length} ảnh (giới hạn ${MAX_EXTRA_IMAGES})`, 'error');
    }
    setExtraNewFiles((p) => [...p, ...accepted]);
    setExtraNewPreviews((p) => [...p, ...accepted.map((f) => URL.createObjectURL(f))]);
    if (extraInputRef.current) extraInputRef.current.value = '';
  }

  function removeNewExtra(idx: number) {
    setExtraNewFiles((p) => p.filter((_, i) => i !== idx));
    setExtraNewPreviews((p) => {
      const removed = p[idx];
      if (removed) URL.revokeObjectURL(removed);
      return p.filter((_, i) => i !== idx);
    });
  }

  async function removeExistingExtra(imgId: number) {
    if (editingId == null) return;
    try {
      await equipApi.deleteExtraImage(editingId, imgId);
      setExtraExistingImages((p) => p.filter((x) => x.id !== imgId));
      qc.invalidateQueries({ queryKey: ['equips'] });
      toast('Đã xóa ảnh phụ');
    } catch (err: any) {
      toast(err.response?.data?.message ?? 'Không thể xóa ảnh phụ', 'error');
    }
  }

  function setField<K extends keyof EquipCreatePayload>(key: K, val: EquipCreatePayload[K]) {
    setForm((f) => ({ ...f, [key]: val }));
    setFormError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim())  { setFormError('Mã thiết bị không được để trống'); return; }
    if (!form.name.trim())  { setFormError('Tên thiết bị không được để trống'); return; }
    if (!form.equipTypeId)  { setFormError('Vui lòng chọn loại thiết bị'); return; }
    if (!form.buildingId)   { setFormError('Vui lòng chọn khu đặt thiết bị'); return; }

    const payload: EquipCreatePayload = {
      code:           form.code.trim(),
      name:           form.name.trim(),
      equipTypeId:    form.equipTypeId,
      buildingId:     form.buildingId,
      specifications: form.specifications?.trim() || undefined,
      description:    form.description?.trim() || undefined,
      purchasePrice:  form.purchasePrice || undefined,
      warrantyUntil:  form.warrantyUntil || undefined,
    };

    try {
      const saved = isEditMode
        ? await updateMut.mutateAsync({ id: editingId!, data: payload })
        : await createMut.mutateAsync(payload);
      if (imageFile) {
        await equipApi.uploadImage(saved.id, imageFile);
      }
      if (extraNewFiles.length > 0) {
        await equipApi.uploadExtraImages(saved.id, extraNewFiles);
      }
      qc.invalidateQueries({ queryKey: ['equips'] });
      closeModal();
      toast(isEditMode ? 'Cập nhật thiết bị thành công' : 'Thêm thiết bị thành công');
    } catch (err: any) {
      const msg = err.response?.data?.message ?? 'Có lỗi xảy ra';
      setFormError(msg);
      toast(msg, 'error');
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter bar — tabs trạng thái + dropdown loại; ô search dùng chung trên header */}
      <div
        className="bg-white px-2 py-1 flex items-center gap-2 overflow-x-auto"
        style={{ ...borderStyle, borderRadius: 10 }}
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          const count = counts[t.key];
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-4 py-2 text-sm rounded-lg font-medium transition-colors whitespace-nowrap"
              style={{
                backgroundColor: active ? '#2563eb' : 'transparent',
                color: active ? 'white' : '#4b5563',
              }}
            >
              {t.label}
              {count > 0 && (
                <span
                  className="ml-2 text-[11px] px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: active ? 'rgba(255,255,255,0.25)' : '#e5e7eb',
                    color: active ? 'white' : '#4b5563',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
        <div className="ml-auto pl-2 shrink-0">
          <select
            value={filterTypeId}
            onChange={(e) => setFilterTypeId(Number(e.target.value))}
            className="px-3 py-2 text-sm rounded-lg outline-none bg-white"
            style={borderStyle}
          >
            <option value={0}>Tất cả loại</option>
            {equipTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white" style={{ ...borderStyle, borderRadius: 10 }}>
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500 bg-gray-50">
            <tr>
              <th className="px-5 py-2.5 font-medium">Mã TB</th>
              <th className="px-5 py-2.5 font-medium">Tên</th>
              <th className="px-5 py-2.5 font-medium">Loại</th>
              <th className="px-5 py-2.5 font-medium">Vị trí TB</th>
              <th className="px-5 py-2.5 font-medium whitespace-nowrap">Trạng thái</th>
              <th className="px-5 py-2.5 font-medium text-center whitespace-nowrap">Lượt sử dụng</th>
              <th className="px-5 py-2.5 font-medium text-right whitespace-nowrap">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {equipsLoading ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-400">Đang tải...</td></tr>
            ) : equips.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-8 text-center text-sm text-gray-400">Không có thiết bị nào</td></tr>
            ) : equips.map((e) => {
              const s = STATUS_LABEL[e.status as EquipmentStatus] ?? STATUS_LABEL.AVAILABLE;
              return (
                <tr key={e.id} className="border-t border-gray-100">
                  <td className="px-5 py-3 text-sm">{e.code}</td>
                  <td className="px-5 py-3 max-w-[260px]">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-gradient-to-br from-blue-50 to-slate-100 ring-1 ring-gray-100 flex items-center justify-center">
                        {e.mainImageUrl ? (
                          <img src={e.mainImageUrl} alt={e.name} className="w-full h-full object-cover" />
                        ) : (
                          <svg className="w-5 h-5 text-blue-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="2" y="3" width="20" height="14" rx="2.5" />
                            <path strokeLinecap="round" d="M8 21h8M12 17v4" />
                          </svg>
                        )}
                      </div>
                      <span className="truncate" title={e.name}>{e.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{e.equipTypeName}</td>
                  <td className="px-5 py-3 text-gray-500">{e.buildingName}</td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    {e.hidden ? (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600 border border-gray-200">
                        Đã ẩn
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: s.bg, color: s.color }}>
                        {s.label}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center tabular-nums text-gray-700">
                    {e.usageCount ?? 0}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => setDetailEquip(e as Equipment)}
                      className="text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200"
                    >
                      Chi tiết
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal thêm thiết bị */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold">{isEditMode ? 'Cập nhật thiết bị' : 'Thêm thiết bị mới'}</h2>
              <button
                type="button"
                onClick={closeModal}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 text-xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="flex-1 overflow-y-auto">
              <div className="px-6 py-5 space-y-4">

                {/* Mã + Tên */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Mã thiết bị <span className="text-red-500">*</span>
                    </label>
                    <input
                      autoFocus
                      spellCheck={false}
                      value={form.code}
                      onChange={(e) => setField('code', e.target.value)}
                      placeholder="VD: TB-006"
                      className={inputCls}
                      style={borderStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Tên thiết bị <span className="text-red-500">*</span>
                    </label>
                    <input
                      spellCheck={false}
                      value={form.name}
                      onChange={(e) => setField('name', e.target.value)}
                      placeholder="VD: Máy chiếu Epson EB-X41"
                      className={inputCls}
                      style={borderStyle}
                    />
                  </div>
                </div>

                {/* Loại + Khu */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Loại thiết bị <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.equipTypeId || ''}
                      onChange={(e) => setField('equipTypeId', Number(e.target.value))}
                      className={`${inputCls} cursor-pointer`}
                      style={borderStyle}
                    >
                      <option value="">-- Chọn loại --</option>
                      {equipTypes.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Khu đặt thiết bị <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.buildingId || ''}
                      onChange={(e) => setField('buildingId', Number(e.target.value))}
                      className={`${inputCls} cursor-pointer`}
                      style={borderStyle}
                    >
                      <option value="">-- Chọn khu --</option>
                      {buildings.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Giá trị + Hạn bảo hành */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Giá trị (VNĐ)
                    </label>
                    <MoneyInput
                      value={form.purchasePrice ?? ''}
                      onChange={(raw) => setField('purchasePrice', raw ? Number(raw) : undefined)}
                      placeholder="VD: 15.000.000"
                      className={inputCls}
                      style={borderStyle}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Hạn bảo hành
                    </label>
                    <input
                      type="date"
                      value={form.warrantyUntil ?? ''}
                      onChange={(e) => setField('warrantyUntil', e.target.value)}
                      className={inputCls}
                      style={borderStyle}
                    />
                  </div>
                </div>

                {/* Mô tả */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Mô tả</label>
                  <textarea
                    rows={2}
                    spellCheck={false}
                    value={form.description ?? ''}
                    onChange={(e) => setField('description', e.target.value)}
                    placeholder="Mô tả ngắn về thiết bị..."
                    className={`${inputCls} resize-none`}
                    style={borderStyle}
                  />
                </div>

                {/* Thông số kỹ thuật */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Thông số kỹ thuật</label>
                  <textarea
                    rows={5}
                    spellCheck={false}
                    value={form.specifications ?? ''}
                    onChange={(e) => setField('specifications', e.target.value)}
                    placeholder="VD: CPU: Intel i5, RAM: 16GB, SSD: 512GB..."
                    className={`${inputCls} resize-none`}
                    style={borderStyle}
                  />
                </div>

                {/* Ảnh chính */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Ảnh chính <span className="text-gray-400 font-normal">(tùy chọn)</span>
                  </label>
                  <div className="flex items-start gap-3">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="relative rounded-lg overflow-hidden cursor-pointer transition-colors flex items-center justify-center hover:bg-gray-100"
                      style={{
                        width: 120, height: 120,
                        border: imagePreview ? '1px solid #e5e7eb' : '2px dashed #d1d5db',
                        backgroundColor: '#f9fafb',
                      }}
                    >
                      {imagePreview ? (
                        <>
                          <img src={imagePreview} alt="preview" className="w-full h-full object-contain" />
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeImage(); }}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold leading-none"
                            style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
                          >
                            ×
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-gray-400 select-none">
                          <svg className="w-6 h-6 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 15l-5-5L5 21" />
                          </svg>
                          <span className="text-[11px]">Thêm ảnh</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed pt-1">
                      Ảnh hiển thị trong danh sách thiết bị.<br />
                      JPG, PNG, WEBP — tối đa 5 MB.
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </div>

                {/* Ảnh phụ */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Ảnh phụ{' '}
                    <span className="text-gray-400 font-normal">
                      ({extraExistingImages.length + extraNewFiles.length}/{MAX_EXTRA_IMAGES})
                    </span>
                    {loadingExtras && (
                      <span className="text-gray-400 font-normal ml-2">— đang tải...</span>
                    )}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {extraExistingImages.map((img) => (
                      <div
                        key={`e-${img.id}`}
                        className="relative rounded-lg overflow-hidden"
                        style={{ width: 96, height: 96, border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}
                      >
                        <img src={img.url} alt="" className="w-full h-full object-contain" />
                        <button
                          type="button"
                          onClick={() => removeExistingExtra(img.id)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold leading-none"
                          style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
                          title="Xóa ảnh"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {extraNewPreviews.map((url, idx) => (
                      <div
                        key={`n-${idx}`}
                        className="relative rounded-lg overflow-hidden"
                        style={{ width: 96, height: 96, border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}
                      >
                        <img src={url} alt="" className="w-full h-full object-contain" />
                        <button
                          type="button"
                          onClick={() => removeNewExtra(idx)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold leading-none"
                          style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
                          title="Bỏ ảnh"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {!loadingExtras && extraExistingImages.length + extraNewFiles.length < MAX_EXTRA_IMAGES && (
                      <div
                        onClick={() => extraInputRef.current?.click()}
                        className="cursor-pointer flex flex-col items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors rounded-lg select-none"
                        style={{
                          width: 96, height: 96,
                          border: '2px dashed #d1d5db',
                          backgroundColor: '#f9fafb',
                        }}
                      >
                        <span className="text-xl leading-none">+</span>
                        <span className="text-[11px] mt-1">Thêm ảnh</span>
                      </div>
                    )}
                  </div>
                  <input
                    ref={extraInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleAddExtraFiles}
                  />
                </div>

                {formError && (
                  <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg" style={{ border: '1px solid #fecaca' }}>
                    {formError}
                  </p>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-sm px-4 py-2 rounded-lg bg-gray-100 text-gray-800 border border-gray-300 hover:bg-gray-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createMut.isPending || updateMut.isPending}
                  className="text-sm px-4 py-2 rounded-lg bg-blue-100 text-blue-800 border border-blue-300 font-medium hover:bg-blue-200 disabled:opacity-60"
                >
                  {(createMut.isPending || updateMut.isPending)
                    ? (imageFile ? 'Đang tải ảnh...' : 'Đang lưu...')
                    : (isEditMode ? 'Lưu thay đổi' : 'Thêm thiết bị')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailEquip && (
        <EquipmentDetailModal
          equipment={detailEquip}
          onClose={() => setDetailEquip(null)}
          onEdit={(eq) => {
            setDetailEquip(null);
            openEditModal(eq);
          }}
          onDelete={(eq) => {
            setDetailEquip(null);
            setDeleteEquip(eq);
          }}
          onCreateMaintenance={(eq) => {
            setDetailEquip(null);
            setMaintenanceTarget(eq);
          }}
          onToggleHidden={(eq) => toggleHiddenMut.mutate(eq)}
          onDispose={(eq) => {
            setDetailEquip(null);
            setDisposeTarget(eq);
          }}
          onShowQr={(eq) => setQrTarget(eq)}
        />
      )}

      {disposeTarget && (
        <DisposeFormModal
          equipment={disposeTarget}
          onClose={() => setDisposeTarget(null)}
        />
      )}

      {qrTarget && (
        <QrDownloadModal
          equipment={qrTarget}
          onClose={() => setQrTarget(null)}
        />
      )}

      {deleteError && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setDeleteError(null)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">Không thể xóa thiết bị</h3>
              <p className="text-sm text-gray-600 whitespace-pre-line">{deleteError}</p>
            </div>
     
          </div>
        </div>
      )}

      {maintenanceTarget && (
        <MaintenanceFormModal
          preset={{
            equipmentId: maintenanceTarget.id,
            equipmentCode: maintenanceTarget.code,
            equipmentName: maintenanceTarget.name,
          }}
          onClose={() => setMaintenanceTarget(null)}
        />
      )}

      {deleteEquip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-semibold mb-2">Xác nhận xóa thiết bị</h2>
            <p className="text-sm text-gray-600 mb-6">
              Bạn có chắc chắn muốn xóa thiết bị{' '}
              <span className="font-semibold text-gray-900">{deleteEquip.name}</span>{' '}
              <span className="text-gray-500">({deleteEquip.code})</span>?
              Hành động này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteEquip(null)}
                disabled={deleteMut.isPending}
                className="text-sm px-4 py-2 rounded-lg bg-gray-100 text-gray-800 border border-gray-300 hover:bg-gray-200 disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                onClick={() => deleteMut.mutate(deleteEquip.id)}
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
