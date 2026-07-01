import { useEffect } from 'react';
import type { Disposal, DisposalStatus } from '../types/disposal';
import { DISPOSAL_METHOD_LABELS } from '../types/disposal';

interface Props {
  disposal: Disposal;
  onClose: () => void;
  onPrintProposal: () => void;
  onPrintRecord: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
  onComplete?: () => void;
}

const STATUS_PILL: Record<DisposalStatus, { label: string; bg: string; color: string }> = {
  PENDING:   { label: 'Chờ duyệt',  bg: '#fef9c3', color: '#a16207' },
  APPROVED:  { label: 'Đã duyệt',   bg: '#dbeafe', color: '#1d4ed8' },
  REJECTED:  { label: 'Từ chối',    bg: '#fee2e2', color: '#b91c1c' },
  COMPLETED: { label: 'Đã thanh lý', bg: '#e5e7eb', color: '#4b5563' },
  CANCELLED: { label: 'Đã hủy',     bg: '#f1f5f9', color: '#475569' },
};

function fmtDate(iso?: string) { return iso ? new Date(iso).toLocaleDateString('vi-VN') : '—'; }
function fmtMoney(v?: number) { return v != null ? Number(v).toLocaleString('vi-VN') + ' ₫' : '—'; }
function methodLabel(m?: string) { return m ? DISPOSAL_METHOD_LABELS[m as keyof typeof DISPOSAL_METHOD_LABELS] ?? m : '—'; }

export default function DisposalDetailModal({ disposal: d, onClose, onPrintProposal, onPrintRecord, onApprove, onReject, onCancel, onComplete }: Props) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
  }, [onClose]);

  const pill = STATUS_PILL[d.status];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="min-w-0 flex items-center gap-3">
            <h3 className="text-base font-semibold text-gray-900">Đề nghị thanh lý <span className="font-mono">{d.code}</span></h3>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: pill.bg, color: pill.color }}>{pill.label}</span>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            <div><span className="text-gray-500">Thiết bị:</span> <span className="font-medium text-gray-900">{d.equipmentName}</span></div>
            <div><span className="text-gray-500">Mã thiết bị:</span> <span className="font-mono">{d.equipmentCode}</span></div>
            <div><span className="text-gray-500">Người lập:</span> {d.requestedByName}</div>
            <div><span className="text-gray-500">Ngày tạo:</span> {fmtDate(d.createdAt)}</div>
            <div><span className="text-gray-500">Hình thức đề xuất:</span> {methodLabel(d.proposedMethod)}</div>
            <div><span className="text-gray-500">Giá trị ước tính:</span> {fmtMoney(d.estimatedValue)}</div>
            <div className="col-span-2"><span className="text-gray-500">Lý do:</span> {d.reason}</div>
            {d.note && <div className="col-span-2"><span className="text-gray-500">Ghi chú:</span> {d.note}</div>}
          </div>

          {(d.decisionNo || d.status === 'APPROVED' || d.status === 'COMPLETED') && (
            <div className="rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2 grid grid-cols-2 gap-x-6 gap-y-1">
              <div><span className="text-gray-500">Số quyết định:</span> <span className="font-medium">{d.decisionNo ?? '—'}</span></div>
              <div><span className="text-gray-500">Ngày QĐ:</span> {fmtDate(d.decisionDate)}</div>
              <div><span className="text-gray-500">Người duyệt:</span> {d.approverName ?? '—'}</div>
              <div><span className="text-gray-500">Ghi nhận bởi:</span> {d.approvedByName ?? '—'}</div>
              {d.decisionFileUrl && <div className="col-span-2"><a href={d.decisionFileUrl} target="_blank" rel="noreferrer" className="text-blue-700 underline">Xem ảnh quyết định đã ký</a></div>}
            </div>
          )}

          {d.status === 'COMPLETED' && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 grid grid-cols-2 gap-x-6 gap-y-1">
              <div><span className="text-gray-500">Hình thức thực tế:</span> {methodLabel(d.actualMethod)}</div>
              <div><span className="text-gray-500">Ngày thực hiện:</span> {fmtDate(d.disposalDate)}</div>
              <div><span className="text-gray-500">Tiền thu được:</span> {fmtMoney(d.proceeds)}</div>
            </div>
          )}

          {d.status === 'REJECTED' && d.rejectReason && (
            <div className="rounded-lg border border-red-100 bg-red-50/50 px-3 py-2 text-red-700"><span className="font-medium">Lý do từ chối:</span> {d.rejectReason}</div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onPrintProposal} className="h-9 px-3.5 rounded-lg bg-white text-blue-700 border border-blue-300 text-sm font-medium hover:bg-blue-50">In tờ trình</button>
          {d.status === 'COMPLETED' && (
            <button type="button" onClick={onPrintRecord} className="h-9 px-3.5 rounded-lg bg-white text-blue-700 border border-blue-300 text-sm font-medium hover:bg-blue-50">In biên bản thanh lý</button>
          )}
          {onReject && <button type="button" onClick={onReject} className="h-9 px-3.5 rounded-lg bg-red-100 text-red-800 border border-red-300 text-sm font-medium hover:bg-red-200">Từ chối</button>}
          {onCancel && <button type="button" onClick={onCancel} className="h-9 px-3.5 rounded-lg bg-gray-100 text-gray-700 border border-gray-300 text-sm font-medium hover:bg-gray-200">Hủy đề nghị</button>}
          {onApprove && <button type="button" onClick={onApprove} className="h-9 px-3.5 rounded-lg bg-green-600 text-white border border-green-700 text-sm font-semibold hover:bg-green-700">Ghi nhận phê duyệt</button>}
          {onComplete && <button type="button" onClick={onComplete} className="h-9 px-3.5 rounded-lg bg-red-600 text-white border border-red-700 text-sm font-semibold hover:bg-red-700">Thực hiện thanh lý</button>}
        </div>
      </div>
    </div>
  );
}
