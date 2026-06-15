import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { compensationApi } from '../../api/compensationApi';
import { useToastStore } from '../../store/toastStore';
import CompensationDetailModal from '../../components/CompensationDetailModal';
import ResolveComplaintModal from '../../components/ResolveComplaintModal';
import { printCompensationPDF } from '../../utils/compensationPdf';
import type { Compensation, CompensationStatus } from '../../types/compensation';

type TabKey = 'ALL' | CompensationStatus | 'COMPLAINT';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'ALL',       label: 'Tất cả' },
  { key: 'PENDING',   label: 'Chờ bồi thường' },
  { key: 'COMPLAINT', label: 'Có khiếu nại' },
  { key: 'PAID',      label: 'Đã bồi thường' },
  { key: 'CANCELLED', label: 'Đã hủy' },
];

const STATUS_PILL: Record<CompensationStatus, { label: string; bg: string; color: string }> = {
  PENDING:   { label: 'Chờ bồi thường', bg: '#fef9c3', color: '#a16207' },
  PAID:      { label: 'Đã bồi thường',  bg: '#dcfce7', color: '#15803d' },
  CANCELLED: { label: 'Đã hủy',         bg: '#f1f5f9', color: '#475569' },
};

const PROOF_PILL = { label: 'Đã nộp minh chứng', bg: '#dbeafe', color: '#1d4ed8' };

// PENDING + đã có minh chứng → hiển thị "Đã nộp minh chứng" để admin biết cần kiểm tra
function statusPill(c: Compensation) {
  if (c.status === 'PENDING' && c.paymentProofUrl) return PROOF_PILL;
  return STATUS_PILL[c.status];
}

const borderStyle = { border: '1px solid #e5e7eb' };

function fmtDateTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}
function fmtPrice(v?: number) {
  if (v === undefined || v === null) return '—';
  return Number(v).toLocaleString('vi-VN') + ' ₫';
}
function getErrorMessage(err: unknown): string | undefined {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
}

export default function CompensationsPage() {
  const qc = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const { search } = useOutletContext<{ search: string }>();

  const [tab, setTab] = useState<TabKey>('ALL');
  const [detailTarget, setDetailTarget] = useState<Compensation | null>(null);
  const [confirmPaidTarget, setConfirmPaidTarget] = useState<Compensation | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Compensation | null>(null);
  const [resolveTarget, setResolveTarget] = useState<Compensation | null>(null);

  const { data: claims = [], isLoading, isError } = useQuery({
    queryKey: ['compensations'],
    queryFn: () => compensationApi.getAll(),
  });

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return claims;
    return claims.filter((c) =>
      (c.code ?? '').toLowerCase().includes(q) ||
      (c.userName ?? '').toLowerCase().includes(q) ||
      (c.userEmail ?? '').toLowerCase().includes(q) ||
      (c.equipmentCode ?? '').toLowerCase().includes(q) ||
      (c.equipmentName ?? '').toLowerCase().includes(q)
    );
  }, [claims, search]);

  const counts = TABS.reduce((acc, t) => {
    if (t.key === 'ALL') acc[t.key] = searched.length;
    else if (t.key === 'COMPLAINT')
      acc[t.key] = searched.filter((c) => c.hasComplaint && c.complaintStatus === 'PENDING_REVIEW').length;
    else acc[t.key] = searched.filter((c) => c.status === t.key).length;
    return acc;
  }, {} as Record<TabKey, number>);

  const filtered = tab === 'ALL'
    ? searched
    : tab === 'COMPLAINT'
      ? searched.filter((c) => c.hasComplaint && c.complaintStatus === 'PENDING_REVIEW')
      : searched.filter((c) => c.status === tab);

  const confirmPaidMut = useMutation({
    mutationFn: (id: number) => compensationApi.confirmPaid(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compensations'] });
      setConfirmPaidTarget(null);
      toast('Đã xác nhận bồi thường', 'success');
    },
    onError: (err) => toast(getErrorMessage(err) || 'Xác nhận thất bại', 'error'),
  });

  const cancelMut = useMutation({
    mutationFn: (id: number) => compensationApi.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['compensations'] });
      setCancelTarget(null);
      toast('Đã hủy phiếu bồi thường', 'success');
    },
    onError: (err) => toast(getErrorMessage(err) || 'Hủy phiếu thất bại', 'error'),
  });

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmPaidTarget && !confirmPaidMut.isPending) setConfirmPaidTarget(null);
        else if (cancelTarget && !cancelMut.isPending) setCancelTarget(null);
      }
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [confirmPaidTarget, cancelTarget, confirmPaidMut.isPending, cancelMut.isPending]);

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div
        className="bg-white px-2 py-1 flex gap-1 overflow-x-auto"
        style={{ ...borderStyle, borderRadius: 10 }}
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          const count = counts[t.key];
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-4 py-2 text-sm rounded-lg font-medium transition-colors whitespace-nowrap"
              style={{
                backgroundColor: active ? '#2563eb' : 'transparent',
                color: active ? 'white' : '#4b5563',
              }}
            >
              {t.label}
              {count > 0 && (
                <span
                  className="ml-2 text-[11px] px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: active ? 'rgba(255,255,255,0.25)' : '#e5e7eb',
                    color: active ? 'white' : '#4b5563',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white" style={{ ...borderStyle, borderRadius: 10 }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 bg-gray-50">
              <tr>
                <th className="px-5 py-2.5 font-medium whitespace-nowrap">Mã phiếu</th>
                <th className="px-5 py-2.5 font-medium">Giảng viên</th>
                <th className="px-5 py-2.5 font-medium">Thiết bị</th>
                <th className="px-5 py-2.5 font-medium text-right whitespace-nowrap">Số tiền</th>
                <th className="px-5 py-2.5 font-medium whitespace-nowrap">Ngày tạo</th>
                <th className="px-5 py-2.5 font-medium text-right whitespace-nowrap">Trạng thái</th>
                <th className="px-5 py-2.5 font-medium text-center whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400">Đang tải...</td></tr>
              )}
              {isError && !isLoading && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-red-500">Không thể tải danh sách</td></tr>
              )}
              {!isLoading && !isError && filtered.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400">Không có phiếu nào</td></tr>
              )}
              {filtered.map((c) => {
                const pill = statusPill(c);
                const complaintPending = c.hasComplaint && c.complaintStatus === 'PENDING_REVIEW';
                return (
                  <tr
                    key={c.id}
                    onClick={() => setDetailTarget(c)}
                    className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-gray-700 tracking-wider">{c.code}</span>
                        {complaintPending && (
                          <span title="Có khiếu nại chờ xử lý">
                            <svg className="w-4 h-4 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            </svg>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-900">{c.userName}</div>
                      <div className="text-xs text-gray-500">{c.userEmail}</div>
                    </td>
                    <td className="px-5 py-3 max-w-[260px]">
                      <div className="font-medium text-gray-900 truncate" title={c.equipmentName}>{c.equipmentName}</div>
                      <div className="text-xs text-gray-500">{c.equipmentCode}</div>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums whitespace-nowrap font-semibold text-red-700">{fmtPrice(c.amount)}</td>
                    <td className="px-5 py-3 whitespace-nowrap text-gray-600">{fmtDateTime(c.createdAt)}</td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: pill.bg, color: pill.color }}>
                        {pill.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => printCompensationPDF(c)}
                        title="Xuất phiếu PDF"
                        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-blue-700 hover:bg-blue-50 border border-blue-200"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
      </div>

      {/* Detail modal */}
      {detailTarget && (
        <CompensationDetailModal
          compensation={detailTarget}
          onClose={() => setDetailTarget(null)}
          onExportPDF={() => printCompensationPDF(detailTarget)}
          onConfirmPaid={detailTarget.status === 'PENDING' ? () => { setConfirmPaidTarget(detailTarget); setDetailTarget(null); } : undefined}
          onCancel={detailTarget.status === 'PENDING' ? () => { setCancelTarget(detailTarget); setDetailTarget(null); } : undefined}
          onResolveComplaint={
            detailTarget.status === 'PENDING' && detailTarget.hasComplaint && detailTarget.complaintStatus === 'PENDING_REVIEW'
              ? () => { setResolveTarget(detailTarget); setDetailTarget(null); }
              : undefined
          }
        />
      )}

      {/* Confirm paid */}
      {confirmPaidTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !confirmPaidMut.isPending && setConfirmPaidTarget(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Xác nhận đã bồi thường</h3>
            <p className="text-sm text-gray-600 mb-5">
              Xác nhận giảng viên <span className="font-medium text-gray-900">{confirmPaidTarget.userName}</span> đã nộp{' '}
              <span className="font-semibold text-red-700">{fmtPrice(confirmPaidTarget.amount)}</span> cho phiếu{' '}
              <span className="font-mono font-semibold">{confirmPaidTarget.code}</span>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmPaidTarget(null)}
                disabled={confirmPaidMut.isPending}
                className="h-9 px-4 rounded-lg bg-gray-100 text-gray-800 border border-gray-300 text-sm hover:bg-gray-200 disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                onClick={() => confirmPaidMut.mutate(confirmPaidTarget.id)}
                disabled={confirmPaidMut.isPending}
                autoFocus
                className="h-9 px-4 rounded-lg bg-green-100 text-green-800 border border-green-300 text-sm font-semibold hover:bg-green-200 disabled:opacity-60 inline-flex items-center gap-2"
              >
                {confirmPaidMut.isPending && <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel modal */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !cancelMut.isPending && setCancelTarget(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Hủy phiếu bồi thường</h3>
            <p className="text-sm text-gray-600 mb-5">
              Hủy phiếu <span className="font-mono font-semibold">{cancelTarget.code}</span> của giảng viên{' '}
              <span className="font-medium text-gray-900">{cancelTarget.userName}</span>? Giảng viên sẽ không phải bồi thường nữa.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setCancelTarget(null)}
                disabled={cancelMut.isPending}
                className="h-9 px-4 rounded-lg bg-gray-100 text-gray-800 border border-gray-300 text-sm hover:bg-gray-200 disabled:opacity-60"
              >
                Không
              </button>
              <button
                onClick={() => cancelMut.mutate(cancelTarget.id)}
                disabled={cancelMut.isPending}
                className="h-9 px-4 rounded-lg bg-red-100 text-red-800 border border-red-300 text-sm font-semibold hover:bg-red-200 disabled:opacity-60 inline-flex items-center gap-2"
              >
                {cancelMut.isPending && <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                Xác nhận hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve complaint */}
      {resolveTarget && (
        <ResolveComplaintModal
          compensation={resolveTarget}
          onClose={() => setResolveTarget(null)}
        />
      )}
    </div>
  );
}
