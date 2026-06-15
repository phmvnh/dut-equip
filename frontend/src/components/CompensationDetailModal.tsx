import { useEffect } from 'react';
import type { Compensation, CompensationStatus, ComplaintStatus } from '../types/compensation';

interface Props {
  compensation: Compensation;
  onClose: () => void;
  onConfirmPaid?: () => void;
  onCancel?: () => void;
  onExportPDF?: () => void;
  onResolveComplaint?: () => void;
  onSubmitProof?: () => void;
}

const STATUS_PILL: Record<CompensationStatus, { label: string; bg: string; color: string }> = {
  PENDING:   { label: 'Chờ bồi thường', bg: '#fef9c3', color: '#a16207' },
  PAID:      { label: 'Đã bồi thường',  bg: '#dcfce7', color: '#15803d' },
  CANCELLED: { label: 'Đã hủy',         bg: '#f1f5f9', color: '#475569' },
};

const COMPLAINT_PILL: Record<ComplaintStatus, { label: string; bg: string; color: string }> = {
  PENDING_REVIEW: { label: 'Chờ xử lý',     bg: '#ffedd5', color: '#c2410c' },
  ACCEPTED:       { label: 'Đã chấp nhận',  bg: '#dcfce7', color: '#15803d' },
  REJECTED:       { label: 'Đã từ chối',    bg: '#fee2e2', color: '#b91c1c' },
  ADJUSTED:       { label: 'Đã điều chỉnh', bg: '#dbeafe', color: '#1d4ed8' },
};

function fmtDateTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

function fmtPrice(v?: number) {
  if (v === undefined || v === null) return '—';
  return Number(v).toLocaleString('vi-VN') + ' ₫';
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <span className="w-36 flex-shrink-0 text-xs text-gray-500 pt-0.5">{label}</span>
      <span className="flex-1 text-sm text-gray-900">{value || <span className="text-gray-400">—</span>}</span>
    </div>
  );
}

export default function CompensationDetailModal({
  compensation,
  onClose,
  onConfirmPaid,
  onCancel,
  onExportPDF,
  onResolveComplaint,
  onSubmitProof,
}: Props) {
  const c = compensation;
  const status = c.status as CompensationStatus;
  const hasProof = status === 'PENDING' && !!c.paymentProofUrl;
  const canSubmitProof = status === 'PENDING' && !c.paymentProofUrl && !!onSubmitProof;
  const pill = hasProof
    ? { label: 'Đã nộp minh chứng', bg: '#dbeafe', color: '#1d4ed8' }
    : STATUS_PILL[status];
  const isPending = status === 'PENDING';
  const complaintPending = c.hasComplaint && c.complaintStatus === 'PENDING_REVIEW';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3 min-w-0">
            <h3 className="text-base font-semibold text-gray-900">Chi tiết phiếu bồi thường</h3>
            <span className="text-xs font-semibold text-gray-700 font-mono tracking-wider">{c.code}</span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: pill.bg, color: pill.color }}
            >
              {pill.label}
            </span>
            {complaintPending && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-700 inline-flex items-center gap-1">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                </svg>
                Khiếu nại chờ xử lý
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Người phải bồi thường */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Người phải bồi thường</p>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-2">
              <Row label="Họ và tên" value={c.userName} />
              <Row label="Khoa / Đơn vị" value={c.userFaculty} />
              <Row label="Email" value={c.userEmail} />
              <Row label="Số điện thoại" value={c.userPhone} />
            </div>
          </div>

          {/* Thiết bị */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-blue-100 flex items-center justify-center">
              {c.equipmentImageUrl ? (
                <img src={c.equipmentImageUrl} alt={c.equipmentName} className="w-full h-full object-cover" />
              ) : (
                <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <path strokeLinecap="round" d="M8 21h8M12 17v4" />
                </svg>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 truncate">{c.equipmentName}</p>
              <p className="text-xs text-gray-500">{c.equipmentCode} · {c.buildingName ?? '—'}</p>
            </div>
          </div>

          {/* So sánh: Tình trạng trước khi mượn vs Báo hỏng khi trả */}
          {(c.preBorrowConditionNote || c.damageDescription) && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">So sánh tình trạng trước &amp; sau</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                  <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider mb-1">Trước khi mượn</p>
                  <p className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {c.preBorrowConditionNote || <span className="text-gray-400 italic">Không có ghi nhận</span>}
                  </p>
                </div>
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
                  <p className="text-[11px] font-semibold text-orange-700 uppercase tracking-wider mb-1">Báo hỏng khi trả</p>
                  <p className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {c.damageDescription || <span className="text-gray-400 italic">User không báo hỏng — admin tự phát hiện</span>}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Chi tiết bồi thường */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Chi tiết bồi thường</p>
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-2">
              <Row label="Số tiền" value={<span className="text-base font-bold text-red-700">{fmtPrice(c.amount)}</span>} />
              <Row label="Lý do" value={<span className="whitespace-pre-wrap">{c.reason}</span>} />
            </div>
          </div>

          {/* Minh chứng đã bồi thường (giảng viên nộp ảnh hóa đơn) */}
          {c.paymentProofUrl && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                </svg>
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Minh chứng đã bồi thường</p>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
                <Row label="Nộp lúc" value={fmtDateTime(c.paymentProofSubmittedAt)} />
                <div className="flex items-start gap-4">
                  <span className="w-36 flex-shrink-0 text-xs text-gray-500 pt-0.5">Ảnh hóa đơn</span>
                  <a
                    href={c.paymentProofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 block rounded-lg overflow-hidden border border-blue-200 hover:opacity-90 max-w-xs"
                  >
                    <img src={c.paymentProofUrl} alt="Minh chứng đã bồi thường" className="w-full max-h-60 object-contain bg-white" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Đơn mượn nguồn */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Đơn mượn nguồn</p>
            <div className="space-y-2">
              <Row label="Mã đơn mượn" value={<span className="font-mono">#{c.borrowId}</span>} />
              <Row label="Ngày mượn" value={fmtDateTime(c.borrowDateTime)} />
              <Row label="Ngày trả" value={fmtDateTime(c.actualReturnDateTime)} />
            </div>
          </div>

          {/* Khiếu nại */}
          {c.hasComplaint && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                </svg>
                <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider">Khiếu nại từ giảng viên</p>
                {c.complaintStatus && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      backgroundColor: COMPLAINT_PILL[c.complaintStatus].bg,
                      color: COMPLAINT_PILL[c.complaintStatus].color,
                    }}
                  >
                    {COMPLAINT_PILL[c.complaintStatus].label}
                  </span>
                )}
              </div>
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 space-y-3">
                <Row label="Gửi lúc" value={fmtDateTime(c.complaintCreatedAt)} />
                <Row label="Lý do" value={<span className="whitespace-pre-wrap">{c.complaintReason}</span>} />
                {c.complaintImageUrls && c.complaintImageUrls.length > 0 && (
                  <div className="flex items-start gap-4">
                    <span className="w-36 flex-shrink-0 text-xs text-gray-500 pt-0.5">Ảnh minh chứng</span>
                    <div className="flex-1 grid grid-cols-3 gap-2">
                      {c.complaintImageUrls.map((url, idx) => (
                        <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-lg overflow-hidden border border-orange-200 hover:opacity-90">
                          <img src={url} alt={`Khiếu nại ${idx + 1}`} className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {c.complaintStatus && c.complaintStatus !== 'PENDING_REVIEW' && (
                  <>
                    <Row label="Xử lý lúc" value={fmtDateTime(c.complaintResolvedAt)} />
                    {c.complaintResolution && (
                      <Row label="Ghi chú admin" value={<span className="whitespace-pre-wrap">{c.complaintResolution}</span>} />
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Timeline</p>
            <div className="space-y-2">
              <Row label="Tạo phiếu" value={fmtDateTime(c.createdAt)} />
              {c.paidAt && <Row label="Đã bồi thường lúc" value={fmtDateTime(c.paidAt)} />}
            </div>
          </div>
        </div>

        {/* Footer */}
        {(onExportPDF || canSubmitProof || (isPending && (onCancel || onConfirmPaid || onResolveComplaint))) && (
          <div className="px-6 py-4 border-t border-gray-100 flex justify-between gap-2">
            <div>
              {onExportPDF && (
                <button
                  onClick={onExportPDF}
                  className="h-9 px-4 rounded-lg text-sm font-semibold bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 inline-flex items-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 2v6h6M9 13h6M9 17h4" />
                  </svg>
                  Xuất PDF
                </button>
              )}
            </div>
            <div className="flex gap-2">
              {canSubmitProof && (
                <button
                  onClick={onSubmitProof}
                  className="h-9 px-4 rounded-lg text-sm font-semibold bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200 inline-flex items-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5V18a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1.5M12 3v12m0-12 4 4m-4-4-4 4" />
                  </svg>
                  Nộp minh chứng
                </button>
              )}
              {isPending && onCancel && (
                <button
                  onClick={onCancel}
                  className="h-9 px-4 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
                >
                  Hủy phiếu
                </button>
              )}
              {isPending && complaintPending && onResolveComplaint && (
                <button
                  onClick={onResolveComplaint}
                  className="h-9 px-4 rounded-lg text-sm font-semibold bg-orange-100 text-orange-800 border border-orange-300 hover:bg-orange-200"
                >
                  Xử lý khiếu nại
                </button>
              )}
              {isPending && !complaintPending && onConfirmPaid && (
                <button
                  onClick={onConfirmPaid}
                  className="h-9 px-4 rounded-lg text-sm font-semibold bg-green-100 text-green-800 border border-green-300 hover:bg-green-200"
                >
                  Xác nhận đã bồi thường
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
