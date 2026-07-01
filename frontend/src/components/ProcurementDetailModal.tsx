import { useEffect } from 'react';
import type { Procurement, ProcurementStatus } from '../types/procurement';

interface Props {
  procurement: Procurement;   // full (có items)
  loading?: boolean;
  onClose: () => void;
  onPrintProposal: () => void;
  onPrintReceipt: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
  onReceive?: () => void;
}

const STATUS_PILL: Record<ProcurementStatus, { label: string; bg: string; color: string }> = {
  PENDING:   { label: 'Chờ duyệt',  bg: '#fef9c3', color: '#a16207' },
  APPROVED:  { label: 'Đã duyệt',   bg: '#dbeafe', color: '#1d4ed8' },
  REJECTED:  { label: 'Từ chối',    bg: '#fee2e2', color: '#b91c1c' },
  COMPLETED: { label: 'Hoàn thành', bg: '#dcfce7', color: '#15803d' },
  CANCELLED: { label: 'Đã hủy',     bg: '#f1f5f9', color: '#475569' },
};

function fmtDate(iso?: string) { return iso ? new Date(iso).toLocaleDateString('vi-VN') : '—'; }
function fmtMoney(v?: number) { return v != null ? Number(v).toLocaleString('vi-VN') + ' ₫' : '—'; }

export default function ProcurementDetailModal({ procurement: p, loading, onClose, onPrintProposal, onPrintReceipt, onApprove, onReject, onCancel, onReceive }: Props) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
  }, [onClose]);

  const pill = STATUS_PILL[p.status];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="min-w-0 flex items-center gap-3">
            <h3 className="text-base font-semibold text-gray-900">Đề nghị mua sắm <span className="font-mono">{p.code}</span></h3>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: pill.bg, color: pill.color }}>{pill.label}</span>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            <div><span className="text-gray-500">Tiêu đề:</span> <span className="font-medium text-gray-900">{p.title}</span></div>
            <div><span className="text-gray-500">Người lập:</span> <span className="font-medium text-gray-900">{p.requestedByName}</span></div>
            <div><span className="text-gray-500">Ngày tạo:</span> {fmtDate(p.createdAt)}</div>
            {p.supplier && <div><span className="text-gray-500">Nhà cung cấp:</span> {p.supplier}</div>}
            {p.reason && <div className="col-span-2"><span className="text-gray-500">Lý do:</span> {p.reason}</div>}
            {p.note && <div className="col-span-2"><span className="text-gray-500">Ghi chú:</span> {p.note}</div>}
          </div>

          {(p.decisionNo || p.status === 'APPROVED' || p.status === 'COMPLETED') && (
            <div className="rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2 grid grid-cols-2 gap-x-6 gap-y-1">
              <div><span className="text-gray-500">Số quyết định:</span> <span className="font-medium">{p.decisionNo ?? '—'}</span></div>
              <div><span className="text-gray-500">Ngày QĐ:</span> {fmtDate(p.decisionDate)}</div>
              <div><span className="text-gray-500">Người duyệt:</span> {p.approverName ?? '—'}</div>
              <div><span className="text-gray-500">Ghi nhận bởi:</span> {p.approvedByName ?? '—'}</div>
              {p.decisionFileUrl && (
                <div className="col-span-2"><a href={p.decisionFileUrl} target="_blank" rel="noreferrer" className="text-blue-700 underline">Xem ảnh quyết định đã ký</a></div>
              )}
            </div>
          )}

          {p.status === 'REJECTED' && p.rejectReason && (
            <div className="rounded-lg border border-red-100 bg-red-50/50 px-3 py-2 text-red-700"><span className="font-medium">Lý do từ chối:</span> {p.rejectReason}</div>
          )}

          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-2">Danh mục thiết bị {loading && <span className="text-xs text-gray-400">(đang tải...)</span>}</h4>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-left">
                  <tr>
                    <th className="px-3 py-2 font-medium">Tên</th>
                    <th className="px-3 py-2 font-medium">Loại</th>
                    <th className="px-3 py-2 font-medium text-center">SL</th>
                    <th className="px-3 py-2 font-medium text-right">Đơn giá</th>
                    <th className="px-3 py-2 font-medium">Nơi đặt</th>
                    <th className="px-3 py-2 font-medium">Mã đã tạo</th>
                  </tr>
                </thead>
                <tbody>
                  {(p.items ?? []).map((it) => (
                    <tr key={it.id} className="border-t border-gray-100">
                      <td className="px-3 py-2">{it.name}</td>
                      <td className="px-3 py-2">{it.equipTypeName}</td>
                      <td className="px-3 py-2 text-center">{it.quantity}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(it.unitPrice)}</td>
                      <td className="px-3 py-2">{it.targetBuildingName}</td>
                      <td className="px-3 py-2 font-mono text-xs">{(it.receivedCodes ?? []).join(', ') || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-right text-sm mt-2 text-gray-600">Tổng số lượng: <b>{p.totalQuantity}</b> · Dự toán: <b className="text-gray-900">{fmtMoney(p.estimatedTotal)}</b></div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onPrintProposal} className="h-9 px-3.5 rounded-lg bg-white text-blue-700 border border-blue-300 text-sm font-medium hover:bg-blue-50">In phiếu đề nghị</button>
          {p.status === 'COMPLETED' && (
            <button type="button" onClick={onPrintReceipt} className="h-9 px-3.5 rounded-lg bg-white text-blue-700 border border-blue-300 text-sm font-medium hover:bg-blue-50">In biên bản nghiệm thu</button>
          )}
          {onReject && <button type="button" onClick={onReject} className="h-9 px-3.5 rounded-lg bg-red-100 text-red-800 border border-red-300 text-sm font-medium hover:bg-red-200">Từ chối</button>}
          {onCancel && <button type="button" onClick={onCancel} className="h-9 px-3.5 rounded-lg bg-gray-100 text-gray-700 border border-gray-300 text-sm font-medium hover:bg-gray-200">Hủy đề nghị</button>}
          {onApprove && <button type="button" onClick={onApprove} className="h-9 px-3.5 rounded-lg bg-green-600 text-white border border-green-700 text-sm font-semibold hover:bg-green-700">Ghi nhận phê duyệt</button>}
          {onReceive && <button type="button" onClick={onReceive} className="h-9 px-3.5 rounded-lg bg-blue-600 text-white border border-blue-700 text-sm font-semibold hover:bg-blue-700">Nghiệm thu</button>}
        </div>
      </div>
    </div>
  );
}
