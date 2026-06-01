import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Equipment } from '../types/equipment';
import { equipApi, type DisposePayload } from '../api/equipApi';
import { useToastStore } from '../store/toastStore';
import { printDisposalPDF } from '../utils/disposalPdf';
import MoneyInput from './MoneyInput';

interface Props {
  equipment: Equipment;
  onClose: () => void;
}

function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export default function DisposeFormModal({ equipment, onClose }: Props) {
  const qc = useQueryClient();
  const toast = useToastStore((s) => s.show);

  const [reason, setReason] = useState('');
  const [disposalDate, setDisposalDate] = useState(todayISO());
  const [valueRaw, setValueRaw] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const mut = useMutation({
    mutationFn: (payload: DisposePayload) => equipApi.dispose(equipment.id, payload),
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['equips'] });
      toast('Đã thanh lý thiết bị', 'success');
      // In biên bản ngay sau khi lưu thành công — Admin có thể đóng dialog Print nếu chưa muốn
      printDisposalPDF(saved);
      onClose();
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Không thể thanh lý thiết bị';
      setError(msg);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!reason.trim()) {
      setError('Vui lòng nhập lý do thanh lý');
      return;
    }
    if (!disposalDate) {
      setError('Vui lòng chọn ngày thanh lý');
      return;
    }
    mut.mutate({
      reason: reason.trim(),
      disposalDate,
      value: valueRaw ? Number(valueRaw) : undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-gray-900">Thanh lý thiết bị</h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              <span className="font-medium">{equipment.code}</span> — {equipment.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={mut.isPending}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-700">
            Sau khi thanh lý, thiết bị sẽ chuyển sang trạng thái <strong>Đã thanh lý</strong> và không thể mượn nữa.
            Biên bản PDF sẽ được mở để in ngay sau khi lưu.
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Lý do thanh lý <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => { setReason(e.target.value); setError(''); }}
              rows={4}
              placeholder="VD: Thiết bị quá cũ, hỏng nặng không sửa được, không còn nhu cầu sử dụng..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Ngày thanh lý <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={disposalDate}
                onChange={(e) => { setDisposalDate(e.target.value); setError(''); }}
                max={todayISO()}
                className="w-full h-9 px-3 text-sm rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Giá trị thu hồi (VNĐ)
              </label>
              <MoneyInput
                value={valueRaw}
                onChange={setValueRaw}
                placeholder="VD: 500.000"
                className="w-full h-9 px-3 text-sm rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
            </div>
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 whitespace-pre-line">
              {error}
            </div>
          )}
        </form>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={mut.isPending}
            className="h-9 px-4 rounded-lg bg-gray-100 text-gray-700 border border-gray-300 text-sm hover:bg-gray-200 disabled:opacity-60"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={mut.isPending || !reason.trim() || !disposalDate}
            className="h-9 px-4 rounded-lg bg-slate-700 text-white border border-slate-800 text-sm font-semibold hover:bg-slate-800 disabled:opacity-60 inline-flex items-center gap-2"
          >
            {mut.isPending && (
              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
            Thanh lý & Xuất PDF
          </button>
        </div>
      </div>
    </div>
  );
}
