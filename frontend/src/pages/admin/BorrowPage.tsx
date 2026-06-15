import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useOutletContext } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { borrowApi, type BorrowResponse, type BorrowStatus, type DamageSeverity, type EquipmentReturnStatus } from '../../api/borrowApi';
import { compensationApi } from '../../api/compensationApi';
import { useToastStore } from '../../store/toastStore';
import MaintenanceFormModal from '../../components/MaintenanceFormModal';
import MoneyInput from '../../components/MoneyInput';

type TabKey = BorrowStatus | 'DAMAGE' | 'ALL';
const VALID_TABS: TabKey[] = ['PENDING', 'APPROVED', 'RETURNED', 'OVERDUE', 'DAMAGE', 'REJECTED', 'CANCELLED', 'ALL'];

const SEVERITY_META: Record<DamageSeverity, { label: string; bg: string; color: string }> = {
  LIGHT:  { label: 'Nhẹ',        bg: '#fef9c3', color: '#a16207' },
  MEDIUM: { label: 'Trung bình', bg: '#ffedd5', color: '#c2410c' },
  SEVERE: { label: 'Nặng',       bg: '#fee2e2', color: '#b91c1c' },
};

// Intent UI: tách khỏi equipmentStatus gửi BE.
// "Cần bảo trì" và "Hỏng" cùng map sang BROKEN ở BE — phân biệt MAINTENANCE chỉ dành cho thiết bị
// đã có phiếu BT IN_PROGRESS. Sau khi xác nhận trả với "Cần bảo trì", form tạo phiếu BT mở ra.
type LocalReturnIntent = 'AVAILABLE' | 'NEEDS_MAINTENANCE' | 'BROKEN';

const RETURN_STATUS_OPTIONS: { value: LocalReturnIntent; label: string; description: string }[] = [
  { value: 'AVAILABLE',         label: 'Sẵn sàng',    description: 'Kiểm tra OK, đưa lại vào kho' },
  { value: 'NEEDS_MAINTENANCE', label: 'Cần bảo trì', description: 'Cần sửa chữa/bảo dưỡng — sẽ mở form tạo phiếu bảo trì' },
  { value: 'BROKEN',            label: 'Hỏng',        description: 'Hỏng nặng, không sử dụng được' },
];

const INTENT_TO_BE: Record<LocalReturnIntent, EquipmentReturnStatus> = {
  AVAILABLE: 'AVAILABLE',
  NEEDS_MAINTENANCE: 'BROKEN',
  BROKEN: 'BROKEN',
};

type ConfirmKind = 'approve' | 'return';
const CONFIRM_META: Record<ConfirmKind, { title: string; verb: string; classes: string }> = {
  approve: { title: 'Duyệt đơn mượn',     verb: 'Duyệt',         classes: 'bg-green-100 text-green-800 border border-green-300 hover:bg-green-200' },
  return:  { title: 'Xác nhận trả thiết bị', verb: 'Xác nhận trả', classes: 'bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200' },
};

const TABS: { key: TabKey; label: string }[] = [
  { key: 'PENDING',   label: 'Chờ duyệt' },
  { key: 'APPROVED',  label: 'Đã duyệt' },
  { key: 'RETURNED',  label: 'Đã trả' },
  { key: 'OVERDUE',   label: 'Quá hạn' },
  { key: 'DAMAGE',    label: 'Báo hỏng' },
  { key: 'REJECTED',  label: 'Từ chối' },
  { key: 'CANCELLED', label: 'Đã hủy' },
  { key: 'ALL',       label: 'Tất cả' },
];

const STATUS_PILL: Record<BorrowStatus, { label: string; bg: string; color: string }> = {
  PENDING:   { label: 'Chờ duyệt', bg: '#fef9c3', color: '#a16207' },
  APPROVED:  { label: 'Đã duyệt',  bg: '#dbeafe', color: '#1d4ed8' },
  RETURNED:  { label: 'Đã trả',    bg: '#dcfce7', color: '#15803d' },
  OVERDUE:   { label: 'Quá hạn',   bg: '#fee2e2', color: '#b91c1c' },
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

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-start gap-4">
      <span className="w-36 flex-shrink-0 text-xs text-gray-500 pt-0.5">{label}</span>
      <span className="flex-1 text-sm text-gray-900">
        {value ? value : <span className="text-gray-400">—</span>}
      </span>
    </div>
  );
}

export default function BorrowPage() {
  const qc = useQueryClient();
  const showToast = useToastStore((s) => s.show);
  const [searchParams, setSearchParams] = useSearchParams();
  const { search } = useOutletContext<{ search: string }>();

  const [tab, setTab] = useState<TabKey>('PENDING');

  // Khi đến từ notification (vd ?tab=APPROVED), mở đúng tab rồi xóa query param
  useEffect(() => {
    const queryTab = searchParams.get('tab');
    if (queryTab && VALID_TABS.includes(queryTab as TabKey)) {
      setTab(queryTab as TabKey);
      searchParams.delete('tab');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const [detailTarget, setDetailTarget] = useState<BorrowResponse | null>(null);
  const [maintenanceTarget, setMaintenanceTarget] = useState<BorrowResponse | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ kind: ConfirmKind; target: BorrowResponse } | null>(null);
  const [returnIntent, setReturnIntent] = useState<LocalReturnIntent>('NEEDS_MAINTENANCE');
  // Khi chọn "Hỏng" (BROKEN): hỏi tiếp do thiết bị hay do người dùng. Nếu do user → tạo phiếu bồi thường
  const [damageBy, setDamageBy] = useState<'EQUIPMENT' | 'USER'>('USER');
  const [compensationAmount, setCompensationAmount] = useState('');
  const [compensationReason, setCompensationReason] = useState('');
  // Tình trạng thiết bị khi bàn giao — bắt buộc khi duyệt đơn
  const [preBorrowCondition, setPreBorrowCondition] = useState('');
  const [rejectTarget, setRejectTarget] = useState<BorrowResponse | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  const { data: borrows = [], isLoading, isError } = useQuery({
    queryKey: ['borrows'],
    queryFn: () => borrowApi.getAll(),
  });

  // Áp dụng search trước (lọc theo người mượn / thiết bị) — counts & list đều phản ánh kết quả search
  const searchedBorrows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return borrows;
    return borrows.filter((b) =>
      (b.userName ?? '').toLowerCase().includes(q) ||
      (b.userEmail ?? '').toLowerCase().includes(q) ||
      (b.equipmentName ?? '').toLowerCase().includes(q) ||
      (b.equipmentCode ?? '').toLowerCase().includes(q)
    );
  }, [borrows, search]);

  const counts = TABS.reduce((acc, t) => {
    if (t.key === 'ALL') {
      acc[t.key] = searchedBorrows.length;
    } else if (t.key === 'DAMAGE') {
      acc[t.key] = searchedBorrows.filter((b) => b.damageReported).length;
    } else {
      acc[t.key] = searchedBorrows.filter((b) => b.status === t.key).length;
    }
    return acc;
  }, {} as Record<TabKey, number>);

  const filtered =
    tab === 'ALL'    ? searchedBorrows
    : tab === 'DAMAGE' ? searchedBorrows.filter((b) => b.damageReported)
    : searchedBorrows.filter((b) => b.status === tab);

  const approveMut = useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) => borrowApi.approve(id, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['borrows'] });
      showToast('Đã duyệt đơn mượn', 'success');
    },
    onError: (err: unknown) => {
      showToast(getErrorMessage(err) || 'Duyệt đơn thất bại', 'error');
    },
  });

  const returnMut = useMutation({
    mutationFn: ({ id, equipmentStatus }: { id: number; equipmentStatus?: EquipmentReturnStatus }) =>
      borrowApi.confirmReturn(id, equipmentStatus),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['borrows'] });
      showToast('Đã xác nhận trả thiết bị', 'success');
    },
    onError: (err: unknown) => {
      showToast(getErrorMessage(err) || 'Xác nhận trả thất bại', 'error');
    },
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => borrowApi.reject(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['borrows'] });
      setRejectTarget(null);
      setRejectReason('');
      setRejectError('');
      showToast('Đã từ chối đơn mượn', 'success');
    },
    onError: (err: unknown) => {
      setRejectError(getErrorMessage(err) || 'Từ chối đơn thất bại');
    },
  });

  const executeConfirm = () => {
    if (!confirmAction) return;
    const { kind, target } = confirmAction;
    if (kind === 'approve') {
      if (!preBorrowCondition.trim()) {
        showToast('Vui lòng nhập tình trạng thiết bị khi bàn giao', 'error');
        return;
      }
      approveMut.mutate(
        { id: target.id, note: preBorrowCondition.trim() },
        { onSuccess: () => setConfirmAction(null) }
      );
    } else {
      // Validate trước nếu cần tạo bồi thường (admin chọn Hỏng + Do người dùng — bất kể user có báo hỏng hay không)
      const needCompensation = returnIntent === 'BROKEN' && damageBy === 'USER';
      if (needCompensation) {
        const n = Number(compensationAmount);
        if (!compensationAmount.trim() || Number.isNaN(n) || n <= 0) {
          showToast('Vui lòng nhập số tiền bồi thường hợp lệ', 'error');
          return;
        }
        if (!compensationReason.trim()) {
          showToast('Vui lòng nhập lý do bồi thường', 'error');
          return;
        }
      }

      // Luôn gửi equipmentStatus theo intent của admin — BE đã chấp nhận cho mọi đơn
      const equipmentStatus = INTENT_TO_BE[returnIntent];
      const shouldOpenMaintenanceForm = returnIntent === 'NEEDS_MAINTENANCE';
      returnMut.mutate(
        { id: target.id, equipmentStatus },
        {
          onSuccess: async (updated) => {
            setConfirmAction(null);
            // Nếu chọn "Cần bảo trì" → mở form tạo phiếu BT
            if (shouldOpenMaintenanceForm) {
              setDetailTarget(null);
              setMaintenanceTarget(updated);
              return;
            }
            // Nếu chọn "Hỏng do người dùng" → tạo phiếu bồi thường
            if (needCompensation) {
              try {
                await compensationApi.create({
                  borrowId: target.id,
                  amount: Number(compensationAmount),
                  reason: compensationReason.trim(),
                });
                qc.invalidateQueries({ queryKey: ['compensations'] });
                showToast('Đã tạo phiếu bồi thường', 'success');
                setDetailTarget(null);
              } catch (err: unknown) {
                showToast(getErrorMessage(err) || 'Tạo phiếu bồi thường thất bại', 'error');
              }
            }
          },
        }
      );
    }
  };

  // Mỗi lần mở dialog xác nhận trả → reset state.
  // Default: đơn có damage → 'NEEDS_MAINTENANCE' (admin thường cần xử lý);
  //          đơn không damage → 'AVAILABLE' (case phổ biến: trả bình thường).
  useEffect(() => {
    if (confirmAction?.kind === 'return') {
      setReturnIntent(confirmAction.target.damageReported ? 'NEEDS_MAINTENANCE' : 'AVAILABLE');
      setDamageBy('USER');
      setCompensationAmount(String(confirmAction.target.equipmentPurchasePrice ?? ''));
      setCompensationReason('');
    } else if (confirmAction?.kind === 'approve') {
      setPreBorrowCondition('');
    }
  }, [confirmAction]);

  const handleRejectSubmit = () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      setRejectError('Vui lòng nhập lý do từ chối');
      return;
    }
    rejectMut.mutate({ id: rejectTarget.id, reason: rejectReason.trim() });
  };

  // Phím tắt: ESC đóng modal, Enter xác nhận (confirm/detail)
  // — không trigger Enter khi đang focus textarea/input để tránh đè default behavior
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      const isInput = tag === 'TEXTAREA' || tag === 'INPUT';
      const busy = approveMut.isPending || returnMut.isPending || rejectMut.isPending;

      if (e.key === 'Escape') {
        if (busy) return;
        if (confirmAction) setConfirmAction(null);
        else if (rejectTarget) setRejectTarget(null);
        else if (detailTarget) setDetailTarget(null);
        return;
      }

      if (e.key === 'Enter' && !isInput) {
        if (confirmAction && !busy) {
          e.preventDefault();
          executeConfirm();
        } else if (detailTarget && !rejectTarget && !confirmAction) {
          e.preventDefault();
          setDetailTarget(null);
        }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmAction, rejectTarget, detailTarget, approveMut.isPending, returnMut.isPending, rejectMut.isPending]);

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div
        className="bg-white px-2 py-1 flex gap-1 overflow-x-auto"
        style={{ border: '1px solid #e5e7eb', borderRadius: 10 }}
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
      <div className="bg-white" style={{ border: '1px solid #e5e7eb', borderRadius: 10 }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 bg-gray-50">
              <tr>
                <th className="px-5 py-2.5 font-medium">Giảng viên</th>
                <th className="px-5 py-2.5 font-medium">Thiết bị</th>
                <th className="px-5 py-2.5 font-medium">Khu</th>
                <th className="px-5 py-2.5 font-medium">Phòng</th>
                <th className="px-5 py-2.5 font-medium">Ngày mượn</th>
                <th className="px-5 py-2.5 font-medium">Ngày trả</th>
                <th className="px-5 py-2.5 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-gray-400">
                    Đang tải...
                  </td>
                </tr>
              )}
              {isError && !isLoading && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-red-500">
                    Không thể tải danh sách đơn mượn
                  </td>
                </tr>
              )}
              {!isLoading && !isError && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-gray-400">
                    Không có đơn nào trong mục này
                  </td>
                </tr>
              )}
              {filtered.map((b) => {
                const status = b.status as BorrowStatus;
                const s = STATUS_PILL[status];
                return (
                  <tr
                    key={b.id}
                    onClick={() => setDetailTarget(b)}
                    className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-900">{b.userName}</div>
                      <div className="text-xs text-gray-500">{b.userEmail}</div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-gray-900">{b.equipmentName}</span>
                        {b.damageReported && (
                          <span
                            title={`Đã báo hỏng${b.damageSeverity ? ` (${SEVERITY_META[b.damageSeverity].label})` : ''}`}
                            className="inline-flex items-center"
                          >
                            <svg className="w-5 h-5 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            </svg>
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">{b.equipmentCode}</div>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{b.buildingName ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-500">{b.room ?? '—'}</td>
                    <td className="px-5 py-3 whitespace-nowrap">{fmtDateTime(b.borrowDateTime)}</td>
                    <td className="px-5 py-3 whitespace-nowrap">{fmtDateTime(b.returnDateTime)}</td>
                    <td className="px-5 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {status === 'PENDING' && (
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => setConfirmAction({ kind: 'approve', target: b })}
                            disabled={approveMut.isPending}
                            className="text-xs font-semibold px-2.5 py-1 rounded-md bg-green-100 text-green-800 border border-green-300 hover:bg-green-200 disabled:opacity-60"
                          >
                            Duyệt
                          </button>
                          <button
                            onClick={() => { setRejectTarget(b); setRejectReason(''); setRejectError(''); }}
                            className="text-xs font-semibold px-2.5 py-1 rounded-md bg-red-100 text-red-800 border border-red-300 hover:bg-red-200"
                          >
                            Từ chối
                          </button>
                        </div>
                      )}
                      {(status === 'APPROVED' || status === 'OVERDUE') && (
                        <button
                          onClick={() => setConfirmAction({ kind: 'return', target: b })}
                          disabled={returnMut.isPending}
                          className="text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200 disabled:opacity-60"
                        >
                          Xác nhận trả
                        </button>
                      )}
                      {(status === 'RETURNED' || status === 'REJECTED' || status === 'CANCELLED') && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: s.bg, color: s.color }}
                          title={status === 'REJECTED' ? `Lý do: ${b.rejectReason ?? ''}` : undefined}
                        >
                          {s.label}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail modal */}
      {detailTarget && (() => {
        const b = detailTarget;
        const status = b.status as BorrowStatus;
        const s = STATUS_PILL[status];
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setDetailTarget(null)}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div
              className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3 min-w-0">
                  <h3 className="text-base font-semibold text-gray-900">Chi tiết đơn mượn</h3>
                  <span className="text-xs text-gray-400 font-mono">#{b.id}</span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"                    style={{ backgroundColor: s.bg, color: s.color }}
                  >
                    {s.label}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailTarget(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                {/* Equipment */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <path strokeLinecap="round" d="M8 21h8M12 17v4" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{b.equipmentName}</p>
                    <p className="text-xs text-gray-500">{b.equipmentCode}</p>
                  </div>
                </div>

                {/* Người mượn (snapshot) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Người mượn</p>
                    <span className="text-[11px] text-gray-400">Snapshot tại lúc tạo đơn</span>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-2">
                    <Row label="Họ và tên" value={b.userName} />
                    <Row label="Email" value={b.userEmail} />
                    <Row label="Số điện thoại" value={b.userPhone} />
                  </div>
                </div>

                {/* Thông tin sử dụng */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Thông tin sử dụng</p>
                  <div className="space-y-2">
                    <Row label="Khu sử dụng" value={b.buildingName} />
                    <Row label="Phòng" value={b.room} />
                    <Row label="Ngày giờ mượn" value={fmtDateTime(b.borrowDateTime)} />
                    <Row label="Ngày giờ trả dự kiến" value={fmtDateTime(b.returnDateTime)} />
                    <Row label="Mục đích" value={b.purpose} />
                    {b.purposeNote && <Row label="Mô tả chi tiết" value={b.purposeNote} />}
                  </div>
                </div>

                {/* Trạng thái & timeline */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Trạng thái đơn</p>
                  <div className="space-y-2">
                    <Row label="Tạo lúc" value={fmtDateTime(b.createdAt)} />
                    {b.actualReturnDateTime && (
                      <Row label="Đã trả lúc" value={fmtDateTime(b.actualReturnDateTime)} />
                    )}
                    {status === 'REJECTED' && b.rejectReason && (
                      <div className="flex items-start gap-4">
                        <span className="w-36 flex-shrink-0 text-xs text-gray-500 pt-0.5">Lý do từ chối</span>
                        <span className="flex-1 text-sm text-red-600">{b.rejectReason}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ghi chú */}
                {b.note && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Ghi chú</p>
                    <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700 whitespace-pre-wrap">{b.note}</div>
                  </div>
                )}

                {/* Tình trạng thiết bị khi bàn giao (admin ghi lúc duyệt) */}
                {b.preBorrowConditionNote && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Tình trạng khi bàn giao</p>
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-gray-800 whitespace-pre-wrap">
                      {b.preBorrowConditionNote}
                    </div>
                  </div>
                )}

                {/* Báo cáo hỏng */}
                {b.damageReported && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      </svg>
                      <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider">Báo cáo hỏng từ người mượn</p>
                      {b.damageSeverity && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: SEVERITY_META[b.damageSeverity].bg, color: SEVERITY_META[b.damageSeverity].color }}
                        >
                          {SEVERITY_META[b.damageSeverity].label}
                        </span>
                      )}
                    </div>
                    <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 space-y-3">
                      <Row label="Báo lúc" value={fmtDateTime(b.damageReportedAt)} />
                      <div className="flex items-start gap-4">
                        <span className="w-36 flex-shrink-0 text-xs text-gray-500 pt-0.5">Mô tả</span>
                        <span className="flex-1 text-sm text-gray-800 whitespace-pre-wrap">{b.damageDescription ?? '—'}</span>
                      </div>
                      {b.damageImageUrls && b.damageImageUrls.length > 0 && (
                        <div className="flex items-start gap-4">
                          <span className="w-36 flex-shrink-0 text-xs text-gray-500 pt-0.5">Ảnh minh chứng</span>
                          <div className="flex-1 grid grid-cols-3 gap-2">
                            {b.damageImageUrls.map((url, idx) => (
                              <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-lg overflow-hidden border border-orange-200 hover:opacity-90">
                                <img src={url} alt={`Hỏng ${idx + 1}`} className="w-full h-full object-cover" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer — chỉ render khi có action; bỏ nút "Đóng" vì đã có X góc phải */}
              {(status === 'PENDING'
                || (b.damageReported && status === 'RETURNED' && b.equipmentStatus === 'BROKEN')) && (
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
                  {status === 'PENDING' && (
                    <>
                      <button
                        type="button"
                        onClick={() => { setRejectTarget(b); setRejectReason(''); setRejectError(''); setDetailTarget(null); }}
                        className="h-9 px-4 rounded-lg text-sm font-semibold bg-red-100 text-red-800 border border-red-300 hover:bg-red-200"
                      >
                        Từ chối
                      </button>
                      <button
                        type="button"
                        onClick={() => { setConfirmAction({ kind: 'approve', target: b }); setDetailTarget(null); }}
                        className="h-9 px-4 rounded-lg text-sm font-semibold bg-green-100 text-green-800 border border-green-300 hover:bg-green-200"
                      >
                        Duyệt
                      </button>
                    </>
                  )}
                  {b.damageReported && status === 'RETURNED' && b.equipmentStatus === 'BROKEN' && (
                    <button
                      type="button"
                      onClick={() => { setMaintenanceTarget(b); setDetailTarget(null); }}
                      className="h-9 px-4 rounded-lg text-sm font-semibold bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200"
                    >
                      Tạo phiếu bảo trì
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Confirm modal (approve / return) */}
      {confirmAction && (() => {
        const meta = CONFIRM_META[confirmAction.kind];
        const b = confirmAction.target;
        const busy = confirmAction.kind === 'approve' ? approveMut.isPending : returnMut.isPending;
        const isReturn = confirmAction.kind === 'return';
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => !busy && setConfirmAction(null)}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div
              className={`relative bg-white rounded-2xl shadow-2xl w-full ${
                isReturn && returnIntent === 'BROKEN' && damageBy === 'USER'
                  ? 'max-w-3xl'
                  : 'max-w-md'
              } p-6 max-h-[92vh] overflow-y-auto`}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-semibold text-gray-900 mb-1">{meta.title}</h3>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                {confirmAction.kind === 'approve' ? 'Duyệt đơn mượn ' : 'Xác nhận đã nhận lại '}
                <span className="font-medium text-gray-900">"{b.equipmentName}"</span>
                {' của '}
                <span className="font-medium text-gray-900">{b.userName}</span>?
              </p>

              {/* Dialog DUYỆT đơn: bắt admin ghi tình trạng thiết bị khi bàn giao */}
              {confirmAction.kind === 'approve' && (
                <div className="mb-5">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Tình trạng thiết bị khi bàn giao <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={preBorrowCondition}
                    onChange={(e) => setPreBorrowCondition(e.target.value)}
                    rows={4}
                    placeholder="VD: Vỏ máy mới, ống kính sạch, đầy đủ phụ kiện (2 pin, sạc, dây HDMI)..."
                    disabled={busy}
                    autoFocus
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Ghi nhận tình trạng thực tế khi bàn giao — làm bằng chứng so sánh khi giảng viên trả thiết bị.
                  </p>
                </div>
              )}

              {/* Dialog TRẢ thiết bị: hiển thị baseline đã ghi lúc duyệt (read-only) */}
              {isReturn && b.preBorrowConditionNote && (
                <div className="mb-4 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                  <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider mb-1">Tình trạng khi bàn giao</p>
                  <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{b.preBorrowConditionNote}</p>
                </div>
              )}

              {isReturn && (() => {
                const showCompForm = returnIntent === 'BROKEN' && damageBy === 'USER';
                return (
                  <div className={`mb-5 ${showCompForm ? 'grid grid-cols-2 gap-5 items-start' : ''}`}>
                    {/* LEFT — warning (nếu báo hỏng) + trạng thái + nguyên nhân hỏng */}
                    <div>
                      {b.damageReported && (
                        <div className="bg-orange-50 border border-orange-100 rounded-lg px-3 py-2 mb-3 flex items-start gap-2">
                          <svg className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          </svg>
                          <p className="text-xs text-orange-700 leading-relaxed">
                            Người mượn đã báo hỏng thiết bị
                            {b.damageSeverity ? ` (mức ${SEVERITY_META[b.damageSeverity].label.toLowerCase()})` : ''}.
                            Sau khi nhận lại, hãy kiểm tra và chọn trạng thái phù hợp.
                          </p>
                        </div>
                      )}
                      <p className="text-xs font-medium text-gray-700 mb-2">Trạng thái thiết bị sau khi trả</p>
                      <div className="space-y-1.5">
                        {RETURN_STATUS_OPTIONS.map((opt) => {
                          const active = returnIntent === opt.value;
                          return (
                            <label
                              key={opt.value}
                              className={`flex items-start gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                                active ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <input
                                type="radio"
                                name="returnIntent"
                                value={opt.value}
                                checked={active}
                                onChange={() => setReturnIntent(opt.value)}
                                disabled={busy}
                                className="mt-0.5 accent-blue-600"
                              />
                              <div className="flex-1">
                                <div className={`text-sm font-medium ${active ? 'text-blue-700' : 'text-gray-900'}`}>
                                  {opt.label}
                                </div>
                                <div className="text-[11px] text-gray-500 leading-snug">{opt.description}</div>
                              </div>
                            </label>
                          );
                        })}
                      </div>

                      {/* Nếu chọn "Hỏng" → hỏi tiếp do thiết bị / do người dùng */}
                      {returnIntent === 'BROKEN' && (
                        <div className="mt-4 pt-4 border-t border-orange-100">
                          <p className="text-xs font-medium text-gray-700 mb-2">Nguyên nhân hỏng</p>
                          <div className="grid grid-cols-2 gap-2">
                            {(['EQUIPMENT', 'USER'] as const).map((v) => {
                              const active = damageBy === v;
                              return (
                                <label
                                  key={v}
                                  className={`flex items-start gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                                    active ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name="damageBy"
                                    value={v}
                                    checked={active}
                                    onChange={() => setDamageBy(v)}
                                    disabled={busy}
                                    className="mt-0.5 accent-blue-600"
                                  />
                                  <div className="flex-1">
                                    <div className={`text-sm font-medium ${active ? 'text-blue-700' : 'text-gray-900'}`}>
                                      {v === 'EQUIPMENT' ? 'Do thiết bị' : 'Do người dùng'}
                                    </div>
                                    <div className="text-[11px] text-gray-500 leading-snug">
                                      {v === 'EQUIPMENT' ? 'Lỗi kỹ thuật, không bồi thường' : 'Lỗi do giảng viên — cần bồi thường'}
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* RIGHT — form bồi thường (chỉ khi do USER) */}
                    {showCompForm && (
                      <div className="p-4 rounded-lg bg-red-50 border border-red-100 space-y-3">
                        <p className="text-xs font-semibold text-red-700 uppercase tracking-wider">Phiếu bồi thường</p>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Số tiền (VNĐ) <span className="text-red-500">*</span>
                          </label>
                          <MoneyInput
                            value={compensationAmount}
                            onChange={setCompensationAmount}
                            placeholder="VD: 5.000.000"
                            disabled={busy}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                          />
                          {b.equipmentPurchasePrice ? (
                            <p className="text-[11px] text-gray-500 mt-1">
                              Gợi ý theo giá thiết bị: {Number(b.equipmentPurchasePrice).toLocaleString('vi-VN')} đ
                            </p>
                          ) : null}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Lý do bồi thường <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            rows={5}
                            value={compensationReason}
                            onChange={(e) => setCompensationReason(e.target.value)}
                            placeholder="Mô tả ngắn lý do giảng viên phải bồi thường (vd: làm rơi vỡ màn hình, mất phụ kiện...)"
                            disabled={busy}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setConfirmAction(null)}
                  disabled={busy}
                  className="h-9 px-4 rounded-lg bg-gray-100 text-gray-800 border border-gray-300 text-sm hover:bg-gray-200 disabled:opacity-60"
                >
                  Hủy
                </button>
                <button
                  onClick={executeConfirm}
                  disabled={busy}
                  autoFocus
                  className={`h-9 px-4 rounded-lg text-sm font-semibold disabled:opacity-60 inline-flex items-center gap-2 ${meta.classes}`}
                >
                  {busy && (
                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  )}
                  {meta.verb}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Reject reason modal */}
      {rejectTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => !rejectMut.isPending && setRejectTarget(null)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-gray-900 mb-1">Từ chối đơn mượn</h3>
            <p className="text-sm text-gray-500 mb-4">
              Đơn của <span className="font-medium text-gray-900">{rejectTarget.userName}</span> cho thiết bị{' '}
              <span className="font-medium text-gray-900">{rejectTarget.equipmentName}</span>
            </p>

            <label className="block text-xs font-medium text-gray-700 mb-1">
              Lý do từ chối <span className="text-red-500">*</span>
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => { setRejectReason(e.target.value); setRejectError(''); }}
              rows={3}
              className={`w-full px-3 py-2 text-sm rounded-lg border outline-none focus:ring-2 focus:ring-blue-500/20 ${
                rejectError ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-blue-400'
              }`}
              placeholder="Nhập lý do từ chối để gửi đến giảng viên..."
              autoFocus
            />
            {rejectError && <p className="mt-1 text-xs text-red-500">{rejectError}</p>}

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setRejectTarget(null)}
                disabled={rejectMut.isPending}
                className="h-9 px-4 rounded-lg bg-gray-100 text-gray-800 border border-gray-300 text-sm hover:bg-gray-200 disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={rejectMut.isPending}
                className="h-9 px-4 rounded-lg bg-red-100 text-red-800 border border-red-300 text-sm font-semibold hover:bg-red-200 disabled:opacity-60 inline-flex items-center gap-2"
              >
                {rejectMut.isPending && (
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                )}
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tạo phiếu bảo trì — pre-fill từ đơn báo hỏng */}
      {maintenanceTarget && (
        <MaintenanceFormModal
          preset={{
            equipmentId: maintenanceTarget.equipmentId,
            equipmentCode: maintenanceTarget.equipmentCode,
            equipmentName: maintenanceTarget.equipmentName,
            description: maintenanceTarget.damageDescription ?? '',
          }}
          onClose={() => setMaintenanceTarget(null)}
        />
      )}
    </div>
  );
}
