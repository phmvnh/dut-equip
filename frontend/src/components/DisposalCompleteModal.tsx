import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { disposalApi } from '../api/disposalApi';
import { useToastStore } from '../store/toastStore';
import type { Disposal, DisposalCompletePayload, DisposalMethod } from '../types/disposal';
import { DISPOSAL_METHOD_LABELS } from '../types/disposal';
import MoneyInput from './MoneyInput';

interface Props {
  disposal: Disposal;
  onClose: () => void;
}

const METHODS: DisposalMethod[] = ['DESTROY', 'SELL', 'TRANSFER', 'OTHER'];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function getErrorMessage(err: unknown): string | undefined {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
}

const inputCls = 'w-full h-9 px-3 text-sm rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400';

export default function DisposalCompleteModal({ disposal, onClose }: Props) {
  const qc = useQueryClient();
  const toast = useToastStore((s) => s.show);

  const [actualMethod, setActualMethod] = useState<DisposalMethod>(disposal.proposedMethod ?? 'DESTROY');
  const [proceedsRaw, setProceedsRaw] = useState('');
  const [disposalDate, setDisposalDate] = useState(todayISO());
  const [error, setError] = useState('');

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
  }, [onClose]);

  const mut = useMutation({
    mutationFn: (payload: DisposalCompletePayload) => disposalApi.complete(disposal.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['disposals'] });
      qc.invalidateQueries({ queryKey: ['equips'] });
      toast('Đã thực hiện thanh lý thiết bị', 'success');
      onClose();
    },
    onError: (err) => setError(getErrorMessage(err) || 'Không thể thực hiện thanh lý'),
  });

  function handleSubmit() {
    setError('');
    if (!disposalDate) { setError('Vui lòng chọn ngày thực hiện'); return; }
    mut.mutate({ actualMethod, proceeds: proceedsRaw ? Number(proceedsRaw) : undefined, disposalDate });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-gray-900">Thực hiện thanh lý</h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate"><span className="font-medium">{disposal.code}</span> — {disposal.equipmentName} ({disposal.equipmentCode})</p>
          </div>
          <button type="button" onClick={onClose} disabled={mut.isPending} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-50">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-red-700">
            Sau khi xác nhận, thiết bị sẽ chuyển <strong>Đã thanh lý (DISPOSED)</strong> và ghi giảm khỏi danh mục đang sử dụng. Thao tác này không thể hoàn tác.
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Hình thức thực tế <span className="text-red-500">*</span></label>
              <select value={actualMethod} onChange={(e) => setActualMethod(e.target.value as DisposalMethod)} className={inputCls}>
                {METHODS.map((m) => <option key={m} value={m}>{DISPOSAL_METHOD_LABELS[m]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Ngày thực hiện <span className="text-red-500">*</span></label>
              <input type="date" value={disposalDate} onChange={(e) => setDisposalDate(e.target.value)} max={todayISO()} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Số tiền thu được (nếu bán)</label>
              <MoneyInput value={proceedsRaw} onChange={setProceedsRaw} placeholder="Tùy chọn" className={inputCls} />
            </div>
          </div>
          {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 whitespace-pre-line">{error}</div>}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={mut.isPending} className="h-9 px-4 rounded-lg bg-gray-100 text-gray-700 border border-gray-300 text-sm hover:bg-gray-200 disabled:opacity-60">Hủy</button>
          <button type="button" onClick={handleSubmit} disabled={mut.isPending} className="h-9 px-4 rounded-lg bg-red-600 text-white border border-red-700 text-sm font-semibold hover:bg-red-700 disabled:opacity-60 inline-flex items-center gap-2">
            {mut.isPending && <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
            Xác nhận thanh lý
          </button>
        </div>
      </div>
    </div>
  );
}
