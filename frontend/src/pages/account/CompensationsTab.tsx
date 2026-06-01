import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { compensationApi } from '../../api/compensationApi';
import CompensationDetailModal from '../../components/CompensationDetailModal';
import ComplaintFormModal from '../../components/ComplaintFormModal';
import { printCompensationPDF } from '../../utils/compensationPdf';
import type { Compensation, CompensationStatus, ComplaintStatus } from '../../types/compensation';

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

export default function CompensationsTab() {
  const [detailTarget, setDetailTarget] = useState<Compensation | null>(null);
  const [complaintTarget, setComplaintTarget] = useState<Compensation | null>(null);

  const { data: claims = [], isLoading, isError } = useQuery({
    queryKey: ['my-compensations'],
    queryFn: () => compensationApi.getMy(),
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">Bồi thường thiết bị</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Phiếu yêu cầu bồi thường — tải PDF và mang qua Phòng Kế toán Tài chính để nộp tiền + xin chữ ký.
          Nếu không đồng ý, bạn có thể khiếu nại (1 lần / phiếu).
        </p>
      </div>

      {isLoading && (
        <div className="px-6 py-12 flex justify-center">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {isError && !isLoading && (
        <div className="px-6 py-12 text-center text-sm text-red-500">Không thể tải danh sách phiếu bồi thường</div>
      )}

      {!isLoading && !isError && claims.length === 0 && (
        <div className="px-6 py-12 flex flex-col items-center gap-2 text-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12 text-gray-300">
            <circle cx="12" cy="12" r="10" />
            <path strokeLinecap="round" d="M12 8v4l3 2" />
          </svg>
          <p className="text-sm text-gray-500">Bạn không có phiếu bồi thường nào</p>
        </div>
      )}

      {!isLoading && !isError && claims.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 bg-gray-50">
              <tr>
                <th className="px-5 py-2.5 font-medium whitespace-nowrap">Mã phiếu</th>
                <th className="px-5 py-2.5 font-medium">Thiết bị</th>
                <th className="px-5 py-2.5 font-medium text-right whitespace-nowrap">Số tiền</th>
                <th className="px-5 py-2.5 font-medium whitespace-nowrap">Ngày tạo</th>
                <th className="px-5 py-2.5 font-medium whitespace-nowrap">Trạng thái</th>
                <th className="px-5 py-2.5 font-medium whitespace-nowrap">Khiếu nại</th>
                <th className="px-5 py-2.5 font-medium text-right whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((c) => {
                const pill = STATUS_PILL[c.status];
                const canComplain = c.status === 'PENDING' && !c.hasComplaint;
                return (
                  <tr
                    key={c.id}
                    onClick={() => setDetailTarget(c)}
                    className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className="font-mono font-semibold text-gray-700 tracking-wider">{c.code}</span>
                    </td>
                    <td className="px-5 py-3 max-w-[260px]">
                      <div className="font-medium text-gray-900 truncate" title={c.equipmentName}>{c.equipmentName}</div>
                      <div className="text-xs text-gray-500">{c.equipmentCode}</div>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums whitespace-nowrap font-semibold text-red-700">{fmtPrice(c.amount)}</td>
                    <td className="px-5 py-3 whitespace-nowrap text-gray-600">{fmtDateTime(c.createdAt)}</td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: pill.bg, color: pill.color }}>
                        {pill.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {c.hasComplaint && c.complaintStatus ? (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: COMPLAINT_PILL[c.complaintStatus].bg, color: COMPLAINT_PILL[c.complaintStatus].color }}>
                          {COMPLAINT_PILL[c.complaintStatus].label}
                        </span>
                      ) : canComplain ? (
                        <button
                          onClick={() => setComplaintTarget(c)}
                          className="text-xs px-2.5 py-1 rounded-md bg-orange-100 text-orange-700 border border-orange-300 hover:bg-orange-200"
                        >
                          Khiếu nại
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => printCompensationPDF(c)}
                        title="Tải xuống PDF"
                        className="inline-flex items-center justify-center gap-1.5 px-3 h-8 rounded-md text-blue-700 hover:bg-blue-50 border border-blue-200 text-xs font-semibold"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14 2v6h6M9 13h6M9 17h4" />
                        </svg>
                   
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {detailTarget && (
        <CompensationDetailModal
          compensation={detailTarget}
          onClose={() => setDetailTarget(null)}
          onExportPDF={() => printCompensationPDF(detailTarget)}
        />
      )}

      {complaintTarget && (
        <ComplaintFormModal
          compensation={complaintTarget}
          onClose={() => setComplaintTarget(null)}
        />
      )}
    </div>
  );
}
