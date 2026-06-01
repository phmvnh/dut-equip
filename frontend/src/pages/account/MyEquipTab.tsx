import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { borrowApi, type BorrowResponse, type BorrowStatus, type DamageSeverity } from '../../api/borrowApi';
import { useToastStore } from '../../store/toastStore';
import ReportDamageModal from '../../components/ReportDamageModal';

const SEVERITY_LABEL: Record<DamageSeverity, string> = {
  LIGHT:  'Nhẹ',
  MEDIUM: 'Trung bình',
  SEVERE: 'Nặng',
};

const ACTIVE: BorrowStatus[] = ['PENDING', 'APPROVED', 'OVERDUE'];

const STATUS_PILL: Record<BorrowStatus, { label: string; bg: string; color: string }> = {
  PENDING:   { label: 'Chờ duyệt', bg: '#fef9c3', color: '#a16207' },
  APPROVED:  { label: 'Đang mượn', bg: '#dbeafe', color: '#1d4ed8' },
  OVERDUE:   { label: 'Quá hạn',   bg: '#fee2e2', color: '#b91c1c' },
  RETURNED:  { label: 'Đã trả',    bg: '#dcfce7', color: '#15803d' },
  REJECTED:  { label: 'Từ chối',   bg: '#f3f4f6', color: '#4b5563' },
  CANCELLED: { label: 'Đã hủy',    bg: '#f1f5f9', color: '#475569' },
};

function fmtDateTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

function getErrorMessage(err: unknown): string | undefined {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
}

export default function MyEquipTab() {
  const qc = useQueryClient();
  const showToast = useToastStore((s) => s.show);

  const [cancelTarget, setCancelTarget] = useState<BorrowResponse | null>(null);
  const [reportTarget, setReportTarget] = useState<BorrowResponse | null>(null);

  const { data: borrows = [], isLoading, isError } = useQuery({
    queryKey: ['my-borrows'],
    queryFn: () => borrowApi.getMy(),
  });

  const active = borrows.filter((b) => ACTIVE.includes(b.status as BorrowStatus));

  const cancelMut = useMutation({
    mutationFn: (id: number) => borrowApi.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-borrows'] });
      setCancelTarget(null);
      showToast('Đã hủy đơn mượn', 'success');
    },
    onError: (err: unknown) => {
      showToast(getErrorMessage(err) || 'Hủy đơn thất bại', 'error');
    },
  });

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!cancelTarget) return;
      if (cancelMut.isPending) return;
      if (e.key === 'Escape') setCancelTarget(null);
      else if (e.key === 'Enter') {
        e.preventDefault();
        cancelMut.mutate(cancelTarget.id);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [cancelTarget, cancelMut]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">Thiết bị đang mượn</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Đơn đang chờ duyệt và thiết bị bạn đang giữ
        </p>
      </div>

      {isLoading && (
        <div className="px-6 py-12 flex justify-center">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {isError && !isLoading && (
        <div className="px-6 py-12 text-center text-sm text-red-500">
          Không thể tải danh sách đơn mượn
        </div>
      )}

      {!isLoading && !isError && active.length === 0 && (
        <div className="px-6 py-12 flex flex-col items-center gap-2 text-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12 text-gray-300">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          <p className="text-sm text-gray-500">Bạn chưa có đơn mượn nào đang hoạt động</p>
        </div>
      )}

      {!isLoading && !isError && active.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 bg-gray-50">
              <tr>
                <th className="px-5 py-2.5 font-medium">Thiết bị</th>
                <th className="px-5 py-2.5 font-medium">Khu / Phòng</th>
                <th className="px-5 py-2.5 font-medium">Ngày mượn</th>
                <th className="px-5 py-2.5 font-medium">Ngày trả</th>
                <th className="px-5 py-2.5 font-medium">Trạng thái</th>
                <th className="px-5 py-2.5 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {active.map((b) => {
                const status = b.status as BorrowStatus;
                const s = STATUS_PILL[status];
                const canReportDamage = (status === 'APPROVED' || status === 'OVERDUE') && !b.damageReported;
                return (
                  <tr key={b.id} className="border-t border-gray-100">
                    <td className="px-5 py-3 max-w-[220px]">
                      <div className="flex items-start gap-1.5 min-w-0">
                        <span className="font-medium text-gray-900 line-clamp-2 leading-snug" title={b.equipmentName}>
                          {b.equipmentName}
                        </span>
                        {b.damageReported && (
                          <span
                            title={`Đã báo hỏng (${b.damageSeverity ? SEVERITY_LABEL[b.damageSeverity] : ''}) lúc ${fmtDateTime(b.damageReportedAt)}`}
                            className="inline-flex items-center shrink-0 mt-0.5"
                          >
                            <svg className="w-5 h-5 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            </svg>
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">{b.equipmentCode}</div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      <div>{b.buildingName ?? '—'}</div>
                      <div className="text-xs text-gray-500">{b.room ?? '—'}</div>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">{fmtDateTime(b.borrowDateTime)}</td>
                    <td className="px-5 py-3 whitespace-nowrap">{fmtDateTime(b.returnDateTime)}</td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                        style={{ backgroundColor: s.bg, color: s.color }}
                      >
                        {s.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      {status === 'PENDING' && (
                        <button
                          onClick={() => setCancelTarget(b)}
                          className="text-xs px-2.5 py-1 rounded-md bg-red-100 text-red-700 border border-red-300 hover:bg-red-200"
                        >
                          Hủy đơn
                        </button>
                      )}
                      {canReportDamage && (
                        <button
                          onClick={() => setReportTarget(b)}
                          className="text-xs px-2.5 py-1 rounded-md bg-orange-100 text-orange-700 border border-orange-300 hover:bg-orange-200"
                        >
                          Báo hỏng
                        </button>
                      )}
                      {(status === 'APPROVED' || status === 'OVERDUE') && b.damageReported && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: '#ffedd5', color: '#c2410c' }}
                          title={`Mức độ: ${b.damageSeverity ? SEVERITY_LABEL[b.damageSeverity] : '—'}`}
                        >
                          Đã báo hỏng
                        </span>
                      )}
                      {status === 'PENDING' || canReportDamage || b.damageReported ? null : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Cancel confirm modal */}
      {cancelTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => !cancelMut.isPending && setCancelTarget(null)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-gray-900 mb-1">Hủy đơn mượn</h3>
            <p className="text-sm text-gray-600 mb-5 leading-relaxed">
              Hủy đơn mượn <span className="font-medium text-gray-900">"{cancelTarget.equipmentName}"</span>? Đơn sẽ không thể khôi phục, nếu vẫn cần thiết bị bạn phải tạo đơn mới.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setCancelTarget(null)}
                disabled={cancelMut.isPending}
                className="h-9 px-4 rounded-lg bg-gray-100 text-gray-700 border border-gray-300 text-sm hover:bg-gray-200 disabled:opacity-60"
              >
                Không
              </button>
              <button
                onClick={() => cancelMut.mutate(cancelTarget.id)}
                disabled={cancelMut.isPending}
                autoFocus
                className="h-9 px-4 rounded-lg bg-red-100 text-red-700 border border-red-300 text-sm font-semibold hover:bg-red-200 disabled:opacity-60 inline-flex items-center gap-2"
              >
                {cancelMut.isPending && (
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                )}
                Xác nhận hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {reportTarget && (
        <ReportDamageModal borrow={reportTarget} onClose={() => setReportTarget(null)} />
      )}
    </div>
  );
}
