import { useQuery } from '@tanstack/react-query';
import { borrowApi, type BorrowResponse, type BorrowStatus } from '../../../api/borrowApi';
import MobileSubHeader from '../../../components/mobile/MobileSubHeader';

const ENDED: BorrowStatus[] = ['RETURNED', 'REJECTED', 'CANCELLED'];

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

function endNote(b: BorrowResponse): { label: string; value: string; tone?: 'red' } {
  const status = b.status as BorrowStatus;
  if (status === 'RETURNED') return { label: 'Đã trả lúc', value: fmt(b.actualReturnDateTime) };
  if (status === 'REJECTED') return { label: 'Lý do từ chối', value: b.rejectReason ?? '—', tone: 'red' };
  return { label: 'Đã hủy', value: 'Bạn hủy đơn trước khi duyệt' };
}

export default function MobileHistory() {
  const { data: borrows = [], isLoading, isError } = useQuery({
    queryKey: ['my-borrows'],
    queryFn: () => borrowApi.getMy(),
  });
  const history = borrows.filter((b) => ENDED.includes(b.status as BorrowStatus));

  return (
    <>
      <MobileSubHeader title="Lịch sử mượn/trả" back="/account/profile" />
      <div className="px-4 py-4">
        {isLoading ? (
          <div className="py-16 flex justify-center">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : isError ? (
          <p className="py-16 text-center text-sm text-red-500">Không thể tải lịch sử mượn trả</p>
        ) : history.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-2 text-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12 text-gray-200">
              <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 15" />
            </svg>
            <p className="text-sm text-gray-400">Chưa có lịch sử mượn/trả</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((b) => {
              const status = b.status as BorrowStatus;
              const s = STATUS_PILL[status];
              const note = endNote(b);
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
                    <div className="min-w-0">
                      <p className="text-[11px] text-gray-400">Ngày mượn</p>
                      <p className="text-gray-800 truncate">{fmt(b.borrowDateTime)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-gray-400">Ngày trả dự kiến</p>
                      <p className="text-gray-800 truncate">{fmt(b.returnDateTime)}</p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-50">
                    <p className="text-[11px] text-gray-400">{note.label}</p>
                    <p className={`text-sm ${note.tone === 'red' ? 'text-red-600' : 'text-gray-800'}`}>{note.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
