import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { compensationApi } from '../api/compensationApi';
import { useToastStore } from '../store/toastStore';
import MoneyInput from './MoneyInput';
import type { Compensation, ComplaintResolveAction } from '../types/compensation';

interface Props {
  compensation: Compensation;
  onClose: () => void;
}

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white';
const borderStyle = { border: '1px solid #e5e7eb' };

const ACTION_OPTIONS: { value: ComplaintResolveAction; label: string; description: string; cls: string }[] = [
  { value: 'ACCEPT', label: 'Chấp nhận khiếu nại', description: 'Hủy phiếu — giảng viên không phải bồi thường',     cls: 'bg-green-50 border-green-200 text-green-800' },
  { value: 'REJECT', label: 'Từ chối khiếu nại',   description: 'Giữ phiếu — giảng viên vẫn phải nộp tiền',         cls: 'bg-red-50 border-red-200 text-red-800' },
  { value: 'ADJUST', label: 'Điều chỉnh số tiền',  description: 'Cập nhật số tiền mới — phiếu vẫn ở trạng thái chờ', cls: 'bg-blue-50 border-blue-200 text-blue-800' },
];

function getErrorMessage(err: unknown): string | undefined {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
}

export default function ResolveComplaintModal({ compensation, onClose }: Props) {
  const qc = useQueryClient();
  const toast = useToastStore((s) => s.show);

  const [action, setAction] = useState<ComplaintResolveAction>('ACCEPT');
  const [newAmountStr, setNewAmountStr] = useState(String(compensation.amount ?? ''));
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');

  const mut = useMutation({
    mutationFn: () => {
      const payload: { action: ComplaintResolveAction; newAmount?: number; note?: string } = {
        action,
        note: note.trim() || undefined,
      };
      if (action === 'ADJUST') {
        payload.newAmount = Number(newAmountStr);
      }
      return compensationApi.resolveComplaint(compensation.id, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compensations'] });
      qc.invalidateQueries({ queryKey: ['my-compensations'] });
      toast('Đã xử lý khiếu nại', 'success');
      onClose();
    },
    onError: (e: unknown) => {
      const msg = getErrorMessage(e) ?? 'Không thể xử lý khiếu nại';
      setErr(msg);
      toast(msg, 'error');
    },
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !mut.isPending) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, mut.isPending]);

  const handleSubmit = () => {
    setErr('');
    if (action === 'ADJUST') {
      const n = Number(newAmountStr);
      if (Number.isNaN(n) || n <= 0) {
        setErr('Số tiền điều chỉnh phải lớn hơn 0');
        return;
      }
    }
    mut.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !mut.isPending && onClose()}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-gray-900">Xử lý khiếu nại</h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              Phiếu <span className="font-mono font-semibold">{compensation.code}</span> — {compensation.userName}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={mut.isPending}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Action chooser */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Hành động xử lý <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {ACTION_OPTIONS.map((opt) => {
                const active = action === opt.value;
                return (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                      active ? opt.cls + ' ring-1 ring-current/30' : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="action"
                      value={opt.value}
                      checked={active}
                      onChange={() => { setAction(opt.value); setErr(''); }}
                      disabled={mut.isPending}
                      className="mt-0.5 accent-blue-600"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{opt.label}</div>
                      <div className="text-[11px] opacity-80 leading-snug">{opt.description}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Adjust amount field */}
          {action === 'ADJUST' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Số tiền mới (VNĐ) <span className="text-red-500">*</span>
              </label>
              <MoneyInput
                value={newAmountStr}
                onChange={(raw) => { setNewAmountStr(raw); setErr(''); }}
                placeholder="VD: 2.000.000"
                className={inputCls}
                style={borderStyle}
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Số tiền hiện tại: {Number(compensation.amount).toLocaleString('vi-VN')} đ
              </p>
            </div>
          )}

          {/* Note */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Ghi chú <span className="text-gray-400 font-normal">(tùy chọn)</span>
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi chú giải thích quyết định cho giảng viên..."
              className={`${inputCls} resize-none`}
              style={borderStyle}
            />
          </div>

          {err && (
            <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg" style={{ border: '1px solid #fecaca' }}>{err}</p>
          )}
        </div>

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
            disabled={mut.isPending}
            className="h-9 px-4 rounded-lg bg-orange-100 text-orange-800 border border-orange-300 text-sm font-semibold hover:bg-orange-200 disabled:opacity-60 inline-flex items-center gap-2"
          >
            {mut.isPending && (
              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
            Xác nhận xử lý
          </button>
        </div>
      </div>
    </div>
  );
}
