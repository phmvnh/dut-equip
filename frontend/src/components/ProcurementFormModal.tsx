import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { procurementApi } from '../api/procurementApi';
import { equipTypeApi } from '../api/equipTypeApi';
import { buildingApi } from '../api/buildingApi';
import { useToastStore } from '../store/toastStore';
import MoneyInput from './MoneyInput';
import type { ProcurementCreatePayload } from '../types/procurement';

interface Props {
  onClose: () => void;
}

interface ItemRow {
  equipTypeId: string;
  name: string;
  specifications: string;
  quantity: string;
  unitPrice: string;       // raw digits
  warrantyMonths: string;
  usefulLifeYears: string;
  targetBuildingId: string;
}

function emptyRow(): ItemRow {
  return { equipTypeId: '', name: '', specifications: '', quantity: '1', unitPrice: '', warrantyMonths: '', usefulLifeYears: '', targetBuildingId: '' };
}

function getErrorMessage(err: unknown): string | undefined {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
}

const inputCls = 'w-full h-9 px-3 text-sm rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400';

export default function ProcurementFormModal({ onClose }: Props) {
  const qc = useQueryClient();
  const toast = useToastStore((s) => s.show);

  const [title, setTitle] = useState('');
  const [reason, setReason] = useState('');
  const [supplier, setSupplier] = useState('');
  const [note, setNote] = useState('');
  const [items, setItems] = useState<ItemRow[]>([emptyRow()]);
  const [error, setError] = useState('');

  const { data: equipTypes = [] } = useQuery({ queryKey: ['equip-types'], queryFn: equipTypeApi.getAll });
  const { data: buildings = [] } = useQuery({ queryKey: ['buildings'], queryFn: buildingApi.getAll });

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
  }, [onClose]);

  const updateItem = (idx: number, patch: Partial<ItemRow>) =>
    setItems((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const addItem = () => setItems((rows) => [...rows, emptyRow()]);
  const removeItem = (idx: number) => setItems((rows) => rows.filter((_, i) => i !== idx));

  const mut = useMutation({
    mutationFn: (payload: ProcurementCreatePayload) => procurementApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['procurements'] });
      toast('Đã tạo đề nghị mua sắm', 'success');
      onClose();
    },
    onError: (err) => setError(getErrorMessage(err) || 'Không thể tạo đề nghị'),
  });

  function handleSubmit() {
    setError('');
    if (!title.trim()) { setError('Vui lòng nhập tiêu đề đề nghị'); return; }
    if (items.length === 0) { setError('Đề nghị phải có ít nhất một dòng hàng'); return; }
    for (const [i, r] of items.entries()) {
      if (!r.name.trim()) { setError(`Dòng ${i + 1}: thiếu tên thiết bị`); return; }
      if (!r.equipTypeId) { setError(`Dòng ${i + 1}: chưa chọn loại thiết bị`); return; }
      if (!r.targetBuildingId) { setError(`Dòng ${i + 1}: chưa chọn khu/tòa`); return; }
      const qty = Number(r.quantity);
      if (!Number.isInteger(qty) || qty < 1) { setError(`Dòng ${i + 1}: số lượng không hợp lệ`); return; }
    }
    mut.mutate({
      title: title.trim(),
      reason: reason.trim() || undefined,
      supplier: supplier.trim() || undefined,
      note: note.trim() || undefined,
      items: items.map((r) => ({
        equipTypeId: Number(r.equipTypeId),
        name: r.name.trim(),
        specifications: r.specifications.trim() || undefined,
        quantity: Number(r.quantity),
        unitPrice: r.unitPrice ? Number(r.unitPrice) : undefined,
        warrantyMonths: r.warrantyMonths ? Number(r.warrantyMonths) : undefined,
        usefulLifeYears: r.usefulLifeYears ? Number(r.usefulLifeYears) : undefined,
        targetBuildingId: Number(r.targetBuildingId),
      })),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Tạo đề nghị mua sắm thiết bị</h3>
          <button type="button" onClick={onClose} disabled={mut.isPending} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-50">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Tiêu đề đề nghị <span className="text-red-500">*</span></label>
              <input value={title} onChange={(e) => { setTitle(e.target.value); setError(''); }} placeholder="VD: Trang bị máy chiếu cho khu D" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Nhà cung cấp dự kiến</label>
              <input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Tùy chọn" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Ghi chú</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Tùy chọn" className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Lý do/Mục đích trang bị</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="VD: Bổ sung thiết bị phục vụ giảng dạy học kỳ mới" className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-800">Danh mục thiết bị</h4>
              <button type="button" onClick={addItem} className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-100 text-blue-800 border border-blue-300 font-medium hover:bg-blue-200">+ Thêm dòng</button>
            </div>

            <div className="space-y-3">
              {items.map((row, idx) => (
                <div key={idx} className="rounded-xl border border-gray-200 p-3 bg-gray-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-gray-500">Dòng {idx + 1}</span>
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(idx)} className="text-xs text-red-600 hover:underline">Xóa dòng</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-[11px] text-gray-600 mb-1">Tên thiết bị *</label>
                      <input value={row.name} onChange={(e) => updateItem(idx, { name: e.target.value })} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-600 mb-1">Loại *</label>
                      <select value={row.equipTypeId} onChange={(e) => updateItem(idx, { equipTypeId: e.target.value })} className={inputCls}>
                        <option value="">— Chọn —</option>
                        {equipTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-600 mb-1">Khu/Tòa đặt *</label>
                      <select value={row.targetBuildingId} onChange={(e) => updateItem(idx, { targetBuildingId: e.target.value })} className={inputCls}>
                        <option value="">— Chọn —</option>
                        {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-600 mb-1">Số lượng *</label>
                      <input type="number" min={1} value={row.quantity} onChange={(e) => updateItem(idx, { quantity: e.target.value })} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-600 mb-1">Đơn giá DK (đ)</label>
                      <MoneyInput value={row.unitPrice} onChange={(raw) => updateItem(idx, { unitPrice: raw })} placeholder="Tùy chọn" className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-600 mb-1">Bảo hành (tháng)</label>
                      <input type="number" min={0} value={row.warrantyMonths} onChange={(e) => updateItem(idx, { warrantyMonths: e.target.value })} placeholder="Tùy chọn" className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-600 mb-1">Tuổi thọ (năm)</label>
                      <input type="number" min={0} value={row.usefulLifeYears} onChange={(e) => updateItem(idx, { usefulLifeYears: e.target.value })} placeholder="Tùy chọn" className={inputCls} />
                    </div>
                    <div className="col-span-2 md:col-span-3">
                      <label className="block text-[11px] text-gray-600 mb-1">Thông số kỹ thuật</label>
                      <input value={row.specifications} onChange={(e) => updateItem(idx, { specifications: e.target.value })} placeholder="Tùy chọn" className={inputCls} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 whitespace-pre-line">{error}</div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={mut.isPending} className="h-9 px-4 rounded-lg bg-gray-100 text-gray-700 border border-gray-300 text-sm hover:bg-gray-200 disabled:opacity-60">Hủy</button>
          <button type="button" onClick={handleSubmit} disabled={mut.isPending} className="h-9 px-4 rounded-lg bg-blue-600 text-white border border-blue-700 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 inline-flex items-center gap-2">
            {mut.isPending && <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
            Tạo đề nghị
          </button>
        </div>
      </div>
    </div>
  );
}
