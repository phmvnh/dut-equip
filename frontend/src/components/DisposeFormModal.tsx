import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Equipment } from '../types/equipment';
import { disposalApi } from '../api/disposalApi';
import type { DisposalCreatePayload, DisposalMethod } from '../types/disposal';
import { DISPOSAL_METHOD_LABELS } from '../types/disposal';
import { useToastStore } from '../store/toastStore';
import MoneyInput from './MoneyInput';

interface Props {
  equipment: Equipment;
  onClose: () => void;
}

const METHODS: DisposalMethod[] = ['DESTROY', 'SELL', 'TRANSFER', 'OTHER'];

function getErrorMessage(err: unknown): string | undefined {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
}

const inputCls = 'w-full h-9 px-3 text-sm rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400';

// Tạo ĐỀ NGHỊ thanh lý (PENDING). Thiết bị chỉ thực sự thanh lý sau khi duyệt + thực hiện ở trang Thanh lý.
export default function DisposeFormModal({ equipment, onClose }: Props) {
  const qc = useQueryClient();
  const toast = useToastStore((s) => s.show);

  const [reason, setReason] = useState('');
  const [proposedMethod, setProposedMethod] = useState<DisposalMethod>('DESTROY');
  const [estimatedRaw, setEstimatedRaw] = useState(
    equipment.currentBookValue != null ? String(Math.round(equipment.currentBookValue)) : '',
  );
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
  }, [onClose]);

  const mut = useMutation({
    mutationFn: (payload: DisposalCreatePayload) => disposalApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['equips'] });
      qc.invalidateQueries({ queryKey: ['disposals'] });
      toast('Đã tạo đề nghị thanh lý, chờ phê duyệt', 'success');
      onClose();
    },
    onError: (err) => setError(getErrorMessage(err) || 'Không thể tạo đề nghị thanh lý'),
  });

  function handleSubmit() {
    setError('');
    if (!reason.trim()) { setError('Vui lòng nhập lý do thanh lý'); return; }
    mut.mutate({
      equipmentId: equipment.id,
      reason: reason.trim(),
      proposedMethod,
      estimatedValue: estimatedRaw ? Number(estimatedRaw) : undefined,
      note: note.trim() || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-gray-900">Đề nghị thanh lý thiết bị</h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate"><span className="font-medium">{equipment.code}</span> — {equipment.name}</p>
          </div>
          <button type="button" onClick={onClose} disabled={mut.isPending} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-50">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-700">
            Tạo đề nghị sẽ <strong>chặn cho mượn</strong> thiết bị này. Thiết bị chỉ chuyển <strong>Đã thanh lý</strong> sau khi đề nghị được duyệt và thực hiện tại mục <strong>Thanh lý</strong>.
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Lý do thanh lý <span className="text-red-500">*</span></label>
            <textarea value={reason} onChange={(e) => { setReason(e.target.value); setError(''); }} rows={4} placeholder="VD: Thiết bị quá cũ, hỏng nặng không sửa được, không còn nhu cầu sử dụng..." className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Hình thức đề xuất <span className="text-red-500">*</span></label>
              <select value={proposedMethod} onChange={(e) => setProposedMethod(e.target.value as DisposalMethod)} className={inputCls}>
                {METHODS.map((m) => <option key={m} value={m}>{DISPOSAL_METHOD_LABELS[m]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Giá trị còn lại ước tính (đ)</label>
              <MoneyInput value={estimatedRaw} onChange={setEstimatedRaw} placeholder="Tự tính từ khấu hao" className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Ghi chú</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Tùy chọn" className={inputCls} />
          </div>

          {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 whitespace-pre-line">{error}</div>}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={mut.isPending} className="h-9 px-4 rounded-lg bg-gray-100 text-gray-700 border border-gray-300 text-sm hover:bg-gray-200 disabled:opacity-60">Hủy</button>
          <button type="button" onClick={handleSubmit} disabled={mut.isPending || !reason.trim()} className="h-9 px-4 rounded-lg bg-slate-700 text-white border border-slate-800 text-sm font-semibold hover:bg-slate-800 disabled:opacity-60 inline-flex items-center gap-2">
            {mut.isPending && <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
            Tạo đề nghị thanh lý
          </button>
        </div>
      </div>
    </div>
  );
}
