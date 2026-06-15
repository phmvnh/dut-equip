import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { compensationApi } from '../../../api/compensationApi';
import CompensationDetailModal from '../../../components/CompensationDetailModal';
import ComplaintFormModal from '../../../components/ComplaintFormModal';
import PaymentProofModal from '../../../components/PaymentProofModal';
import { printCompensationPDF } from '../../../utils/compensationPdf';
import type { Compensation, CompensationStatus, ComplaintStatus } from '../../../types/compensation';
import MobileSubHeader from '../../../components/mobile/MobileSubHeader';

const STATUS_PILL: Record<CompensationStatus, { label: string; bg: string; color: string }> = {
  PENDING: { label: 'Chờ bồi thường', bg: '#fef9c3', color: '#a16207' },
  PAID: { label: 'Đã bồi thường', bg: '#dcfce7', color: '#15803d' },
  CANCELLED: { label: 'Đã hủy', bg: '#f1f5f9', color: '#475569' },
};

const PROOF_PILL = { label: 'Đã nộp minh chứng', bg: '#dbeafe', color: '#1d4ed8' };

function statusPill(c: Compensation) {
  if (c.status === 'PENDING' && c.paymentProofUrl) return PROOF_PILL;
  return STATUS_PILL[c.status];
}

const COMPLAINT_PILL: Record<ComplaintStatus, { label: string; bg: string; color: string }> = {
  PENDING_REVIEW: { label: 'KN: Chờ xử lý', bg: '#ffedd5', color: '#c2410c' },
  ACCEPTED: { label: 'KN: Chấp nhận', bg: '#dcfce7', color: '#15803d' },
  REJECTED: { label: 'KN: Từ chối', bg: '#fee2e2', color: '#b91c1c' },
  ADJUSTED: { label: 'KN: Điều chỉnh', bg: '#dbeafe', color: '#1d4ed8' },
};

function fmt(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}
function fmtPrice(v?: number) {
  if (v === undefined || v === null) return '—';
  return Number(v).toLocaleString('vi-VN') + ' ₫';
}

export default function MobileCompensations() {
  const [detailTarget, setDetailTarget] = useState<Compensation | null>(null);
  const [complaintTarget, setComplaintTarget] = useState<Compensation | null>(null);
  const [proofTarget, setProofTarget] = useState<Compensation | null>(null);

  const { data: claims = [], isLoading, isError } = useQuery({
    queryKey: ['my-compensations'],
    queryFn: () => compensationApi.getMy(),
  });

  return (
    <>
      <MobileSubHeader title="Bồi thường" back="/account/profile" />
      <div className="px-4 py-4">
        <p className="text-xs text-gray-400 mb-3 leading-relaxed">
          Phiếu bồi thường — tải PDF mang qua Phòng Kế toán Tài chính để nộp tiền và xin chữ ký. Nếu không đồng ý, bạn có thể khiếu nại (1 lần / phiếu).
        </p>

        {isLoading ? (
          <div className="py-16 flex justify-center">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : isError ? (
          <p className="py-16 text-center text-sm text-red-500">Không thể tải danh sách phiếu bồi thường</p>
        ) : claims.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-2 text-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12 text-gray-200">
              <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 8v4l3 2" />
            </svg>
            <p className="text-sm text-gray-400">Bạn không có phiếu bồi thường nào</p>
          </div>
        ) : (
          <div className="space-y-3">
            {claims.map((c) => {
              const pill = statusPill(c);
              const canComplain = c.status === 'PENDING' && !c.hasComplaint;
              // Chỉ cho nộp khi chưa có minh chứng — nộp rồi thì khóa, không sửa lại
              const canSubmitProof = c.status === 'PENDING' && !c.paymentProofUrl;
              return (
                <div key={c.id} className="card-soft p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0" onClick={() => setDetailTarget(c)}>
                      <p className="font-mono text-xs font-semibold text-gray-500 tracking-wider">{c.code}</p>
                      <p className="font-semibold text-gray-900 leading-snug mt-0.5">{c.equipmentName}</p>
                      <p className="text-xs text-gray-400">{c.equipmentCode}</p>
                    </div>
                    <span className="shrink-0 text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: pill.bg, color: pill.color }}>
                      {pill.label}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] text-gray-400">Số tiền</p>
                      <p className="text-base font-bold text-red-700 tabular-nums">{fmtPrice(c.amount)}</p>
                    </div>
                    <p className="text-xs text-gray-400">{fmt(c.createdAt)}</p>
                  </div>

                  {c.hasComplaint && c.complaintStatus && (
                    <span className="mt-2 inline-block text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: COMPLAINT_PILL[c.complaintStatus].bg, color: COMPLAINT_PILL[c.complaintStatus].color }}>
                      {COMPLAINT_PILL[c.complaintStatus].label}
                    </span>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => setDetailTarget(c)} className="flex-1 min-w-[80px] h-10 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold active:bg-gray-200">
                      Chi tiết
                    </button>
                    <button onClick={() => printCompensationPDF(c)} className="flex-1 min-w-[80px] h-10 rounded-xl bg-action/10 text-action text-sm font-semibold active:bg-action/20">
                      Tải PDF
                    </button>
                    {canComplain && (
                      <button onClick={() => setComplaintTarget(c)} className="flex-1 min-w-[80px] h-10 rounded-xl bg-orange-50 text-orange-700 text-sm font-semibold active:bg-orange-100">
                        Khiếu nại
                      </button>
                    )}
                    {canSubmitProof && (
                      <button
                        onClick={() => setProofTarget(c)}
                        className="flex-1 min-w-[120px] h-10 rounded-xl text-sm font-semibold bg-blue-600 text-white active:bg-blue-700"
                      >
                        Nộp minh chứng
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {detailTarget && (
        <CompensationDetailModal
          compensation={detailTarget}
          onClose={() => setDetailTarget(null)}
          onExportPDF={() => printCompensationPDF(detailTarget)}
          onSubmitProof={() => {
            setProofTarget(detailTarget);
            setDetailTarget(null);
          }}
        />
      )}
      {complaintTarget && (
        <ComplaintFormModal compensation={complaintTarget} onClose={() => setComplaintTarget(null)} />
      )}
      {proofTarget && (
        <PaymentProofModal compensation={proofTarget} onClose={() => setProofTarget(null)} />
      )}
    </>
  );
}
