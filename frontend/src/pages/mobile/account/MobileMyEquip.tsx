import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { borrowApi, type BorrowResponse, type BorrowStatus } from '../../../api/borrowApi';
import { useToastStore } from '../../../store/toastStore';
import ReportDamageModal from '../../../components/ReportDamageModal';
import MobileSubHeader from '../../../components/mobile/MobileSubHeader';
import MobileSheet from '../../../components/mobile/MobileSheet';

const ACTIVE: BorrowStatus[] = ['PENDING', 'APPROVED', 'OVERDUE'];

const STATUS_PILL: Record<BorrowStatus, { label: string; bg: string; color: string }> = {
  PENDING: { label: 'Chờ duyệt', bg: '#fef9c3', color: '#a16207' },
  APPROVED: { label: 'Đang mượn', bg: '#dbeafe', color: '#1d4ed8' },
  OVERDUE: { label: 'Quá hạn', bg: '#fee2e2', color: '#b91c1c' },
  RETURNED: { label: 'Đã trả', bg: '#dcfce7', color: '#15803d' },
  REJECTED: { label: 'Từ chối', bg: '#f3f4f6', color: '#4b5563' },
  CANCELLED: { label: 'Đã hủy', bg: '#f1f5f9', color: '#475569' },
};

function fmt(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

export default function MobileMyEquip() {
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
      showToast((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Hủy đơn thất bại', 'error');
    },
  });

  return (
    <>
      <MobileSubHeader title="Thiết bị đang mượn" />
      <div className="px-4 py-4">
        {isLoading ? (
          <div className="py-16 flex justify-center">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : isError ? (
          <p className="py-16 text-center text-sm text-red-500">Không thể tải danh sách đơn mượn</p>
        ) : active.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-2 text-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12 text-gray-200">
              <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <p className="text-sm text-gray-400">Bạn chưa có đơn mượn nào đang hoạt động</p>
          </div>
        ) : (
          <div className="space-y-3">
            {active.map((b) => {
              const status = b.status as BorrowStatus;
              const s = STATUS_PILL[status];
              const canReport = (status === 'APPROVED' || status === 'OVERDUE') && !b.damageReported;
              return (
                <div key={b.id} className="card-soft p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 leading-snug">{b.equipmentName}</p>
                      <p className="text-xs text-gray-400">{b.equipmentCode}</p>
                    </div>
                    <span className="shrink-0 text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: s.bg, color: s.color }}>
                      {s.label}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
                    <Cell label="Khu / Phòng" value={`${b.buildingName ?? '—'} · ${b.room ?? '—'}`} />
                    <Cell label="Ngày mượn" value={fmt(b.borrowDateTime)} />
                    <Cell label="Hạn trả" value={fmt(b.returnDateTime)} />
                  </div>

                  {b.damageReported && (
                    <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-orange-700 bg-orange-50 px-2 py-1 rounded-lg">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /></svg>
                      Đã báo hỏng
                    </p>
                  )}

                  {(status === 'PENDING' || canReport) && (
                    <div className="mt-3 flex gap-2">
                      {status === 'PENDING' && (
                        <button onClick={() => setCancelTarget(b)} className="flex-1 h-10 rounded-xl bg-red-50 text-red-600 text-sm font-semibold active:bg-red-100">
                          Hủy đơn
                        </button>
                      )}
                      {canReport && (
                        <button onClick={() => setReportTarget(b)} className="flex-1 h-10 rounded-xl bg-orange-50 text-orange-700 text-sm font-semibold active:bg-orange-100">
                          Báo hỏng
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {cancelTarget && (
        <MobileSheet
          onClose={() => !cancelMut.isPending && setCancelTarget(null)}
          footer={
            <div className="flex gap-2">
              <button onClick={() => setCancelTarget(null)} disabled={cancelMut.isPending} className="flex-1 h-12 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold active:bg-gray-200 disabled:opacity-60">
                Không
              </button>
              <button onClick={() => cancelMut.mutate(cancelTarget.id)} disabled={cancelMut.isPending} className="flex-1 h-12 rounded-xl bg-red-600 text-white text-sm font-semibold active:bg-red-700 disabled:opacity-60">
                {cancelMut.isPending ? 'Đang hủy...' : 'Xác nhận hủy'}
              </button>
            </div>
          }
        >
          <div className="px-5 py-5">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Hủy đơn mượn</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Hủy đơn mượn <span className="font-medium text-gray-900">"{cancelTarget.equipmentName}"</span>? Đơn sẽ không thể khôi phục, nếu vẫn cần thiết bị bạn phải tạo đơn mới.
            </p>
          </div>
        </MobileSheet>
      )}

      {reportTarget && <ReportDamageModal borrow={reportTarget} onClose={() => setReportTarget(null)} />}
    </>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-gray-400">{label}</p>
      <p className="text-gray-800 truncate">{value}</p>
    </div>
  );
}
