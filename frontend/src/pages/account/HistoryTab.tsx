import { useQuery } from '@tanstack/react-query';
import { borrowApi, type BorrowResponse, type BorrowStatus } from '../../api/borrowApi';

const ENDED: BorrowStatus[] = ['RETURNED', 'REJECTED', 'CANCELLED'];

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

function endNote(b: BorrowResponse): { label: string; value: string; tone?: 'red' } {
  const status = b.status as BorrowStatus;
  if (status === 'RETURNED') {
    return { label: 'Đã trả lúc', value: fmtDateTime(b.actualReturnDateTime) };
  }
  if (status === 'REJECTED') {
    return { label: 'Lý do từ chối', value: b.rejectReason ?? '—', tone: 'red' };
  }
  return { label: 'Đã hủy', value: 'Bạn hủy đơn trước khi duyệt' };
}

export default function HistoryTab() {
  const { data: borrows = [], isLoading, isError } = useQuery({
    queryKey: ['my-borrows'],
    queryFn: () => borrowApi.getMy(),
  });

  const history = borrows.filter((b) => ENDED.includes(b.status as BorrowStatus));

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">Lịch sử mượn/trả</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Các đơn đã hoàn tất, bị từ chối hoặc đã hủy
        </p>
      </div>

      {isLoading && (
        <div className="px-6 py-12 flex justify-center">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {isError && !isLoading && (
        <div className="px-6 py-12 text-center text-sm text-red-500">
          Không thể tải lịch sử mượn trả
        </div>
      )}

      {!isLoading && !isError && history.length === 0 && (
        <div className="px-6 py-12 flex flex-col items-center gap-2 text-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12 text-gray-300">
            <circle cx="12" cy="12" r="9" />
            <polyline points="12 7 12 12 15 15" />
          </svg>
          <p className="text-sm text-gray-500">Chưa có lịch sử mượn/trả</p>
        </div>
      )}

      {!isLoading && !isError && history.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 bg-gray-50">
              <tr>
                <th className="px-5 py-2.5 font-medium">Thiết bị</th>
                <th className="px-5 py-2.5 font-medium">Khu / Phòng</th>
                <th className="px-5 py-2.5 font-medium">Ngày mượn</th>
                <th className="px-5 py-2.5 font-medium">Ngày trả dự kiến</th>
                <th className="px-5 py-2.5 font-medium">Trạng thái</th>
                <th className="px-5 py-2.5 font-medium">Kết quả</th>
              </tr>
            </thead>
            <tbody>
              {history.map((b) => {
                const status = b.status as BorrowStatus;
                const s = STATUS_PILL[status];
                const note = endNote(b);
                return (
                  <tr key={b.id} className="border-t border-gray-100">
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-900">{b.equipmentName}</div>
                      <div className="text-xs text-gray-500">{b.equipmentCode}</div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      <div>{b.buildingName ?? '—'}</div>
                      <div className="text-xs text-gray-500">{b.room ?? '—'}</div>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">{fmtDateTime(b.borrowDateTime)}</td>
                    <td className="px-5 py-3 whitespace-nowrap">{fmtDateTime(b.returnDateTime)}</td>
                    <td className="px-5 py-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                        style={{ backgroundColor: s.bg, color: s.color }}
                      >
                        {s.label}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="text-xs text-gray-500">{note.label}</div>
                      <div
                        className={`text-sm ${note.tone === 'red' ? 'text-red-600' : 'text-gray-900'}`}
                      >
                        {note.value}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
