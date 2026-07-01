import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useOutletContext } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { borrowApi, type BorrowResponse, type BorrowStatus, type DamageSeverity, type EquipmentReturnStatus } from '../../api/borrowApi';
import { compensationApi } from '../../api/compensationApi';
import { departmentLoanApi, type DepartmentLoanResponse } from '../../api/departmentLoanApi';
import { equipApi } from '../../api/equipApi';
import type { Equipment } from '../../types/equipment';
import { generateHandoverPdf, generateReturnPdf } from '../../utils/reportPdf';
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

type DLTab = 'ALL' | 'ACTIVE' | 'RETURNED' | 'CANCELLED';
const DL_TABS: { key: DLTab; label: string }[] = [
  { key: 'ALL',       label: 'Tất cả' },
  { key: 'ACTIVE',    label: 'Đang mượn' },
  { key: 'RETURNED',  label: 'Đã trả' },
  { key: 'CANCELLED', label: 'Đã hủy' },
];
const DL_STATUS_PILL: Record<string, { label: string; bg: string; color: string }> = {
  ACTIVE:    { label: 'Đang mượn', bg: '#dbeafe', color: '#1d4ed8' },
  RETURNED:  { label: 'Đã trả',    bg: '#dcfce7', color: '#15803d' },
  CANCELLED: { label: 'Đã hủy',    bg: '#f1f5f9', color: '#475569' },
};

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

  // ── Section switcher ───────────────────────────────────────────────────────
  const [section, setSection] = useState<'ca-nhan' | 'theo-khoa'>('ca-nhan');

  // ── DepartmentLoan state ───────────────────────────────────────────────────
  const [dlTab, setDlTab] = useState<DLTab>('ACTIVE');
  const [dlCreateOpen, setDlCreateOpen] = useState(false);
  const [dlDetailTarget, setDlDetailTarget] = useState<DepartmentLoanResponse | null>(null);
  const [dlReturnTarget, setDlReturnTarget] = useState<DepartmentLoanResponse | null>(null);
  const [dlCancelTarget, setDlCancelTarget] = useState<DepartmentLoanResponse | null>(null);
  const [dlEquipSearch, setDlEquipSearch] = useState('');
  const [dlEquipSelected, setDlEquipSelected] = useState<Equipment | null>(null);
  const [dlDeptName, setDlDeptName] = useState('');
  const [dlContactPerson, setDlContactPerson] = useState('');
  const [dlContactPhone, setDlContactPhone] = useState('');
  const [dlPurpose, setDlPurpose] = useState('');
  const [dlApproverName, setDlApproverName] = useState('');
  const [dlStartDate, setDlStartDate] = useState('');
  const [dlExpectedReturn, setDlExpectedReturn] = useState('');
  const [dlNote, setDlNote] = useState('');
  const [dlRequestFileUrl, setDlRequestFileUrl] = useState('');
  const [dlRequestFileName, setDlRequestFileName] = useState('');
  const [dlFileUploading, setDlFileUploading] = useState(false);
  const [dlImageUrls, setDlImageUrls] = useState<string[]>([]);
  const [dlImageUploading, setDlImageUploading] = useState(false);
  const [dlActualReturn, setDlActualReturn] = useState('');
  const [dlCondition, setDlCondition] = useState('');
  const [dlReturnEquipStatus, setDlReturnEquipStatus] = useState<'AVAILABLE' | 'MAINTENANCE' | 'BROKEN'>('AVAILABLE');

  const { data: borrows = [], isLoading, isError } = useQuery({
    queryKey: ['borrows'],
    queryFn: () => borrowApi.getAll(),
  });

  const { data: deptLoans = [], isLoading: dlLoading, isError: dlError } = useQuery({
    queryKey: ['dept-loans'],
    queryFn: () => departmentLoanApi.getAll(),
    enabled: section === 'theo-khoa',
  });

  const { data: availableEquips = [] } = useQuery({
    queryKey: ['equips-available'],
    queryFn: () => equipApi.getAll({ status: 'AVAILABLE' }),
    enabled: dlCreateOpen,
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

  // ── DepartmentLoan mutations ───────────────────────────────────────────────
  const resetDlCreateForm = () => {
    setDlEquipSearch(''); setDlEquipSelected(null);
    setDlDeptName(''); setDlContactPerson(''); setDlContactPhone('');
    setDlPurpose(''); setDlApproverName('');
    setDlStartDate(''); setDlExpectedReturn(''); setDlNote('');
    setDlRequestFileUrl(''); setDlRequestFileName('');
    setDlImageUrls([]);
  };

  const dlCreateMut = useMutation({
    mutationFn: (data: Parameters<typeof departmentLoanApi.create>[0]) => departmentLoanApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dept-loans'] });
      showToast('Đã tạo phiếu mượn khoa', 'success');
      setDlCreateOpen(false);
      resetDlCreateForm();
    },
    onError: (err: unknown) => showToast(getErrorMessage(err) || 'Tạo phiếu thất bại', 'error'),
  });

  const dlReturnMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof departmentLoanApi.returnLoan>[1] }) =>
      departmentLoanApi.returnLoan(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dept-loans'] });
      showToast('Đã ghi nhận trả thiết bị', 'success');
      setDlReturnTarget(null);
    },
    onError: (err: unknown) => showToast(getErrorMessage(err) || 'Ghi nhận trả thất bại', 'error'),
  });

  const dlCancelMut = useMutation({
    mutationFn: (id: number) => departmentLoanApi.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dept-loans'] });
      showToast('Đã hủy phiếu mượn khoa', 'success');
      setDlCancelTarget(null);
    },
    onError: (err: unknown) => showToast(getErrorMessage(err) || 'Hủy phiếu thất bại', 'error'),
  });

  const handleDlCreate = () => {
    if (!dlEquipSelected) { showToast('Vui lòng chọn thiết bị', 'error'); return; }
    if (!dlDeptName.trim()) { showToast('Vui lòng nhập tên khoa/đơn vị', 'error'); return; }
    if (!dlContactPerson.trim()) { showToast('Vui lòng nhập tên người đại diện', 'error'); return; }
    if (!dlStartDate) { showToast('Vui lòng chọn ngày bàn giao', 'error'); return; }
    if (!dlRequestFileUrl) { showToast('Vui lòng đính kèm file đơn mượn từ khoa', 'error'); return; }
    dlCreateMut.mutate({
      equipmentId: dlEquipSelected.id,
      departmentName: dlDeptName.trim(),
      contactPerson: dlContactPerson.trim(),
      contactPhone: dlContactPhone.trim() || undefined,
      purpose: dlPurpose.trim() || undefined,
      approverName: dlApproverName.trim() || undefined,
      startDate: dlStartDate,
      expectedReturnDate: dlExpectedReturn || undefined,
      note: dlNote.trim() || undefined,
      requestFileUrl: dlRequestFileUrl || undefined,
      imageUrls: dlImageUrls.length > 0 ? dlImageUrls : undefined,
    });
  };

  const handleDlReturn = () => {
    if (!dlReturnTarget) return;
    if (!dlActualReturn) { showToast('Vui lòng chọn ngày trả', 'error'); return; }
    dlReturnMut.mutate({ id: dlReturnTarget.id, data: { actualReturnDate: dlActualReturn, conditionAtReturn: dlCondition.trim() || undefined, equipmentStatus: dlReturnEquipStatus } });
  };

  const dlFiltered = useMemo(() =>
    dlTab === 'ALL' ? deptLoans : deptLoans.filter((d) => d.status === dlTab),
  [deptLoans, dlTab]);

  const dlCounts = DL_TABS.reduce((acc, t) => {
    acc[t.key] = t.key === 'ALL' ? deptLoans.length : deptLoans.filter((d) => d.status === t.key).length;
    return acc;
  }, {} as Record<DLTab, number>);

  const dlEquipFiltered = useMemo(() => {
    const q = dlEquipSearch.trim().toLowerCase();
    if (!q) return availableEquips;
    return availableEquips.filter((e) =>
      e.name.toLowerCase().includes(q) || e.code.toLowerCase().includes(q)
    );
  }, [availableEquips, dlEquipSearch]);

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
      {/* Section switcher */}
      <div className="flex gap-1 bg-white p-1 rounded-xl w-fit" style={{ border: '1px solid #e5e7eb' }}>
        {(['ca-nhan', 'theo-khoa'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={`px-5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              section === s ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {s === 'ca-nhan' ? 'Cá nhân' : 'Theo khoa'}
          </button>
        ))}
      </div>

      {section === 'ca-nhan' && (<>
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
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => generateHandoverPdf(b)}
                            className="text-xs font-semibold px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
                            title="Tải biên bản bàn giao"
                          >
                            Biên bản
                          </button>
                          <button
                            onClick={() => setConfirmAction({ kind: 'return', target: b })}
                            disabled={returnMut.isPending}
                            className="text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200 disabled:opacity-60"
                          >
                            Xác nhận trả
                          </button>
                        </div>
                      )}
                      {status === 'RETURNED' && (
                        <div className="inline-flex gap-2 items-center">
                          <button
                            onClick={() => generateReturnPdf(b)}
                            className="text-xs font-semibold px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
                            title="Tải biên bản thu hồi"
                          >
                            Biên bản
                          </button>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: s.bg, color: s.color }}
                          >
                            {s.label}
                          </span>
                        </div>
                      )}
                      {(status === 'REJECTED' || status === 'CANCELLED') && (
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
      </>)}

      {/* ── Theo khoa section ─────────────────────────────────────────────── */}
      {section === 'theo-khoa' && (<>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Phiếu cho khoa mượn dài hạn</h2>
            <p className="text-xs text-gray-500 mt-0.5">Ghi nhận việc bàn giao thiết bị cho khoa/đơn vị sử dụng dài hạn</p>
          </div>
          <button
            onClick={() => { resetDlCreateForm(); setDlCreateOpen(true); }}
            className="h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Tạo phiếu mượn
          </button>
        </div>

        {/* DL Tabs */}
        <div className="bg-white px-2 py-1 flex gap-1 overflow-x-auto" style={{ border: '1px solid #e5e7eb', borderRadius: 10 }}>
          {DL_TABS.map((t) => {
            const active = dlTab === t.key;
            const count = dlCounts[t.key];
            return (
              <button key={t.key} onClick={() => setDlTab(t.key)}
                className="px-4 py-2 text-sm rounded-lg font-medium transition-colors whitespace-nowrap"
                style={{ backgroundColor: active ? '#2563eb' : 'transparent', color: active ? 'white' : '#4b5563' }}
              >
                {t.label}
                {count > 0 && (
                  <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: active ? 'rgba(255,255,255,0.25)' : '#e5e7eb', color: active ? 'white' : '#4b5563' }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* DL Table */}
        <div className="bg-white" style={{ border: '1px solid #e5e7eb', borderRadius: 10 }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500 bg-gray-50">
                <tr>
                  <th className="px-5 py-2.5 font-medium whitespace-nowrap">Mã phiếu</th>
                  <th className="px-5 py-2.5 font-medium whitespace-nowrap">Thiết bị</th>
                  <th className="px-5 py-2.5 font-medium whitespace-nowrap">Khoa/Đơn vị</th>
                  <th className="px-5 py-2.5 font-medium whitespace-nowrap">Người đại diện</th>
                  <th className="px-5 py-2.5 font-medium whitespace-nowrap">Ngày bàn giao</th>
                  <th className="px-5 py-2.5 font-medium whitespace-nowrap">Dự kiến trả</th>
                  <th className="px-5 py-2.5 font-medium whitespace-nowrap">Trạng thái</th>
                  <th className="px-5 py-2.5 font-medium whitespace-nowrap text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {dlLoading && <tr><td colSpan={8} className="px-5 py-10 text-center text-gray-400">Đang tải...</td></tr>}
                {dlError && !dlLoading && <tr><td colSpan={8} className="px-5 py-10 text-center text-red-500">Không thể tải danh sách</td></tr>}
                {!dlLoading && !dlError && dlFiltered.length === 0 && (
                  <tr><td colSpan={8} className="px-5 py-10 text-center text-gray-400">Không có phiếu nào</td></tr>
                )}
                {dlFiltered.map((d) => {
                  const pill = DL_STATUS_PILL[d.status] ?? { label: d.status, bg: '#f3f4f6', color: '#4b5563' };
                  return (
                    <tr key={d.id} onClick={() => setDlDetailTarget(d)}
                      className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                      <td className="px-5 py-3 font-mono text-xs text-gray-700">{d.code}</td>
                      <td className="px-5 py-3">
                        <div className="font-medium text-gray-900">{d.equipmentName}</div>
                        <div className="text-xs text-gray-500">{d.equipmentCode}</div>
                      </td>
                      <td className="px-5 py-3 text-gray-800">{d.departmentName}</td>
                      <td className="px-5 py-3">
                        <div className="text-gray-800">{d.contactPerson}</div>
                        {d.contactPhone && <div className="text-xs text-gray-500">{d.contactPhone}</div>}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-gray-700">{d.startDate}</td>
                      <td className="px-5 py-3 whitespace-nowrap text-gray-500">{d.expectedReturnDate ?? '—'}</td>
                      <td className="px-5 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: pill.bg, color: pill.color }}>
                          {pill.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {d.status === 'ACTIVE' && (
                          <div className="inline-flex gap-2">
                            <button onClick={() => { setDlActualReturn(''); setDlCondition(''); setDlReturnEquipStatus('AVAILABLE'); setDlReturnTarget(d); }}
                              className="text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200">
                              Ghi nhận trả
                            </button>
                            <button onClick={() => setDlCancelTarget(d)}
                              className="text-xs font-semibold px-2.5 py-1 rounded-md bg-red-100 text-red-800 border border-red-300 hover:bg-red-200">
                              Hủy
                            </button>
                          </div>
                        )}
                        {d.status !== 'ACTIVE' && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: pill.bg, color: pill.color }}>{pill.label}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* DL Create modal */}
        {dlCreateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !dlCreateMut.isPending && setDlCreateOpen(false)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
                <h3 className="text-base font-semibold text-gray-900">Tạo phiếu cho khoa mượn</h3>
                <button onClick={() => setDlCreateOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                {/* Equipment search */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Thiết bị <span className="text-red-500">*</span></label>
                  {dlEquipSelected ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-300 bg-blue-50">
                      <span className="flex-1 text-sm font-medium text-gray-900">{dlEquipSelected.name} <span className="text-gray-500 font-normal">({dlEquipSelected.code})</span></span>
                      <button onClick={() => { setDlEquipSelected(null); setDlEquipSearch(''); }} className="text-xs text-blue-600 hover:underline">Đổi</button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <input value={dlEquipSearch} onChange={(e) => setDlEquipSearch(e.target.value)}
                        placeholder="Tìm theo tên hoặc mã thiết bị..."
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                      {dlEquipSearch && (
                        <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto bg-white shadow-sm">
                          {dlEquipFiltered.length === 0 && <p className="px-3 py-2 text-sm text-gray-400">Không tìm thấy thiết bị khả dụng</p>}
                          {dlEquipFiltered.slice(0, 20).map((e) => (
                            <button key={e.id} onClick={() => { setDlEquipSelected(e); setDlEquipSearch(''); }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0">
                              <span className="font-medium">{e.name}</span>
                              <span className="text-gray-500 ml-2">({e.code})</span>
                              <span className="text-gray-400 ml-2 text-xs">{e.buildingName}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Khoa/Đơn vị <span className="text-red-500">*</span></label>
                    <input value={dlDeptName} onChange={(e) => setDlDeptName(e.target.value)} placeholder="VD: Khoa Điện tử Viễn thông"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Người đại diện <span className="text-red-500">*</span></label>
                    <input value={dlContactPerson} onChange={(e) => setDlContactPerson(e.target.value)} placeholder="VD: TS. Nguyễn Văn A"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Số điện thoại</label>
                    <input value={dlContactPhone} onChange={(e) => setDlContactPhone(e.target.value)} placeholder="0905..."
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Người phê duyệt</label>
                    <input value={dlApproverName} onChange={(e) => setDlApproverName(e.target.value)} placeholder="VD: PGS.TS. Trần Văn B"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Ngày bàn giao <span className="text-red-500">*</span></label>
                    <input type="date" value={dlStartDate} onChange={(e) => setDlStartDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Dự kiến trả <span className="text-xs text-gray-400 font-normal">(để trống = vô thời hạn)</span></label>
                    <input type="date" value={dlExpectedReturn} onChange={(e) => setDlExpectedReturn(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Mục đích sử dụng</label>
                  <textarea value={dlPurpose} onChange={(e) => setDlPurpose(e.target.value)} rows={2}
                    placeholder="VD: Phục vụ giảng dạy thực hành môn Xử lý tín hiệu số..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Ghi chú</label>
                  <textarea value={dlNote} onChange={(e) => setDlNote(e.target.value)} rows={2}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none" />
                </div>

                {/* File đơn mượn */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    File đơn mượn từ khoa (PDF) <span className="text-red-500">*</span>
                  </label>
                  {dlRequestFileUrl ? (
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-green-300 bg-green-50">
                      {dlRequestFileUrl.match(/\.(jpg|jpeg|png|webp|gif)(\?|$)/i) ? (
                        <a href={dlRequestFileUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
                          <img src={dlRequestFileUrl} alt="preview" className="h-12 w-12 object-cover rounded border border-green-200" />
                        </a>
                      ) : (
                        <svg className="w-8 h-8 text-red-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                      )}
                      <div className="flex-1 min-w-0">
                        <a href={dlRequestFileUrl} target="_blank" rel="noopener noreferrer"
                          className="text-sm text-green-800 font-medium truncate hover:underline block">
                          {dlRequestFileName || 'Xem file'}
                        </a>
                        <p className="text-xs text-green-600">Đã tải lên thành công</p>
                      </div>
                      <button onClick={() => { setDlRequestFileUrl(''); setDlRequestFileName(''); }}
                        className="text-xs text-red-500 hover:text-red-700 shrink-0">Xóa</button>
                    </div>
                  ) : (
                    <label className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
                      dlFileUploading ? 'border-blue-300 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                    }`}>
                      {dlFileUploading ? (
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
                      ) : (
                        <svg className="w-5 h-5 text-gray-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                      )}
                      <span className="text-sm text-gray-500">
                        {dlFileUploading ? 'Đang tải lên...' : 'Nhấn để chọn file PDF'}
                      </span>
                      <input type="file" accept="application/pdf" className="hidden"
                        disabled={dlFileUploading}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setDlFileUploading(true);
                          try {
                            const res = await departmentLoanApi.uploadRequestFile(file);
                            setDlRequestFileUrl(res.url);
                            setDlRequestFileName(res.name);
                          } catch {
                            showToast('Tải file thất bại', 'error');
                          } finally {
                            setDlFileUploading(false);
                            e.target.value = '';
                          }
                        }}
                      />
                    </label>
                  )}
                </div>

                {/* Ảnh đính kèm */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Ảnh đính kèm
                    <span className="ml-1 text-gray-400 font-normal">(không bắt buộc)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {dlImageUrls.map((url, idx) => (
                      <div key={url} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 group">
                        <img src={url} alt={`Ảnh ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setDlImageUrls((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    <label className={`w-20 h-20 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${
                      dlImageUploading ? 'border-blue-300 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                    }`}>
                      {dlImageUploading ? (
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                          <span className="text-[10px] text-gray-400 mt-0.5">Thêm ảnh</span>
                        </>
                      )}
                      <input type="file" accept="image/*" multiple className="hidden"
                        disabled={dlImageUploading}
                        onChange={async (e) => {
                          const files = Array.from(e.target.files ?? []);
                          if (!files.length) return;
                          setDlImageUploading(true);
                          try {
                            const results = await Promise.all(files.map((f) => departmentLoanApi.uploadImage(f)));
                            setDlImageUrls((prev) => [...prev, ...results.map((r) => r.url)]);
                          } catch {
                            showToast('Tải ảnh thất bại', 'error');
                          } finally {
                            setDlImageUploading(false);
                            e.target.value = '';
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
                <button onClick={() => setDlCreateOpen(false)} disabled={dlCreateMut.isPending}
                  className="h-9 px-4 rounded-lg bg-gray-100 text-gray-800 border border-gray-300 text-sm hover:bg-gray-200 disabled:opacity-60">Hủy</button>
                <button onClick={handleDlCreate} disabled={dlCreateMut.isPending || dlFileUploading}
                  className="h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 inline-flex items-center gap-2">
                  {(dlCreateMut.isPending || dlFileUploading) && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {dlFileUploading ? 'Đang tải file...' : 'Tạo phiếu'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DL Detail modal */}
        {dlDetailTarget && (() => {
          const d = dlDetailTarget;
          const pill = DL_STATUS_PILL[d.status] ?? { label: d.status, bg: '#f3f4f6', color: '#4b5563' };
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDlDetailTarget(null)}>
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-semibold text-gray-900">Chi tiết phiếu mượn khoa</h3>
                    <span className="text-xs text-gray-400 font-mono">{d.code}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: pill.bg, color: pill.color }}>{pill.label}</span>
                  </div>
                  <button onClick={() => setDlDetailTarget(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                  <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                    <p className="text-sm font-semibold text-gray-900">{d.equipmentName}</p>
                    <p className="text-xs text-gray-500">{d.equipmentCode}{d.buildingName ? ` · ${d.buildingName}` : ''}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Khoa/Đơn vị</p>
                    <div className="space-y-2">
                      <Row label="Khoa/Đơn vị" value={d.departmentName} />
                      <Row label="Người đại diện" value={d.contactPerson} />
                      <Row label="Số điện thoại" value={d.contactPhone} />
                      <Row label="Người phê duyệt" value={d.approverName} />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Thông tin mượn</p>
                    <div className="space-y-2">
                      <Row label="Ngày bàn giao" value={d.startDate} />
                      <Row label="Dự kiến trả" value={d.expectedReturnDate ?? 'Vô thời hạn'} />
                      <Row label="Mục đích" value={d.purpose} />
                      <Row label="Ghi chú" value={d.note} />
                    </div>
                    {d.requestFileUrl && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs font-medium text-gray-500 mb-1.5">File đơn mượn từ khoa</p>
                        {d.requestFileUrl.match(/\.(jpg|jpeg|png|webp|gif)(\?|$)/i) ? (
                          <a href={d.requestFileUrl} target="_blank" rel="noopener noreferrer">
                            <img src={d.requestFileUrl} alt="Đơn mượn" className="max-h-48 rounded-lg border border-gray-200 hover:opacity-90" />
                          </a>
                        ) : (
                          <a href={d.requestFileUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 text-sm text-blue-600 hover:underline">
                            <svg className="w-4 h-4 text-red-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                            Xem file PDF đơn mượn
                          </a>
                        )}
                      </div>
                    )}
                    {d.imageUrls && d.imageUrls.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs font-medium text-gray-500 mb-1.5">Ảnh đính kèm</p>
                        <div className="grid grid-cols-4 gap-2">
                          {d.imageUrls.map((url, idx) => (
                            <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="aspect-square rounded-lg overflow-hidden border border-gray-200 hover:opacity-90">
                              <img src={url} alt={`Ảnh ${idx + 1}`} className="w-full h-full object-cover" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {d.status !== 'ACTIVE' && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Kết quả</p>
                      <div className="space-y-2">
                        <Row label="Ngày trả thực tế" value={d.actualReturnDate} />
                        <Row label="Tình trạng khi trả" value={d.conditionAtReturn} />
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Thông tin hệ thống</p>
                    <div className="space-y-2">
                      <Row label="Người tạo phiếu" value={d.createdByName} />
                      <Row label="Tạo lúc" value={fmtDateTime(d.createdAt)} />
                    </div>
                  </div>
                </div>
                {d.status === 'ACTIVE' && (
                  <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
                    <button onClick={() => { setDlCancelTarget(d); setDlDetailTarget(null); }}
                      className="h-9 px-4 rounded-lg text-sm font-semibold bg-red-100 text-red-800 border border-red-300 hover:bg-red-200">Hủy phiếu</button>
                    <button onClick={() => { setDlActualReturn(''); setDlCondition(''); setDlReturnEquipStatus('AVAILABLE'); setDlReturnTarget(d); setDlDetailTarget(null); }}
                      className="h-9 px-4 rounded-lg text-sm font-semibold bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200">Ghi nhận trả</button>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* DL Return modal */}
        {dlReturnTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !dlReturnMut.isPending && setDlReturnTarget(null)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-base font-semibold text-gray-900 mb-1">Ghi nhận trả thiết bị</h3>
              <p className="text-sm text-gray-600 mb-5">
                Phiếu <span className="font-mono font-medium">{dlReturnTarget.code}</span> — <span className="font-medium">{dlReturnTarget.equipmentName}</span>
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Ngày trả thực tế <span className="text-red-500">*</span></label>
                  <input type="date" value={dlActualReturn} onChange={(e) => setDlActualReturn(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tình trạng thiết bị khi trả</label>
                  <textarea value={dlCondition} onChange={(e) => setDlCondition(e.target.value)} rows={3}
                    placeholder="Mô tả tình trạng thiết bị khi nhận lại..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">Trạng thái thiết bị sau khi trả</label>
                  <div className="grid grid-cols-3 gap-2">
                    {([['AVAILABLE', 'Sẵn sàng'], ['MAINTENANCE', 'Cần bảo trì'], ['BROKEN', 'Hỏng']] as const).map(([val, lbl]) => {
                      const active = dlReturnEquipStatus === val;
                      return (
                        <label key={val} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${active ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                          <input type="radio" name="dlReturnStatus" value={val} checked={active} onChange={() => setDlReturnEquipStatus(val)} className="accent-blue-600" />
                          <span className={`text-sm font-medium ${active ? 'text-blue-700' : 'text-gray-900'}`}>{lbl}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setDlReturnTarget(null)} disabled={dlReturnMut.isPending}
                  className="h-9 px-4 rounded-lg bg-gray-100 text-gray-800 border border-gray-300 text-sm hover:bg-gray-200 disabled:opacity-60">Hủy</button>
                <button onClick={handleDlReturn} disabled={dlReturnMut.isPending}
                  className="h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 inline-flex items-center gap-2">
                  {dlReturnMut.isPending && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Xác nhận trả
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DL Cancel confirm */}
        {dlCancelTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !dlCancelMut.isPending && setDlCancelTarget(null)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-base font-semibold text-gray-900 mb-2">Hủy phiếu mượn khoa</h3>
              <p className="text-sm text-gray-600 mb-6">
                Hủy phiếu <span className="font-mono font-medium">{dlCancelTarget.code}</span>? Thiết bị sẽ được chuyển về trạng thái <strong>Sẵn sàng</strong>.
              </p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setDlCancelTarget(null)} disabled={dlCancelMut.isPending}
                  className="h-9 px-4 rounded-lg bg-gray-100 text-gray-800 border border-gray-300 text-sm hover:bg-gray-200 disabled:opacity-60">Không</button>
                <button onClick={() => dlCancelMut.mutate(dlCancelTarget.id)} disabled={dlCancelMut.isPending}
                  className="h-9 px-4 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 inline-flex items-center gap-2">
                  {dlCancelMut.isPending && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Xác nhận hủy
                </button>
              </div>
            </div>
          </div>
        )}
      </>)}

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
              {confirmAction.kind === 'approve' && (() => {
                const target = confirmAction.target;
                const conflicts = borrows.filter((other) =>
                  other.id !== target.id &&
                  other.equipmentId === target.equipmentId &&
                  other.status === 'PENDING' &&
                  new Date(other.borrowDateTime) < new Date(target.returnDateTime) &&
                  new Date(other.returnDateTime) > new Date(target.borrowDateTime)
                );
                return (
                  <div className="mb-5 space-y-3">
                    {conflicts.length > 0 && (
                      <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                        <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        </svg>
                        <div className="text-xs text-amber-800 leading-relaxed">
                          <span className="font-semibold">
                            Có {conflicts.length} đơn mượn khác cùng thiết bị này đang chờ duyệt trong khung giờ tương tự.
                          </span>
                          {' '}Khi duyệt đơn này, các đơn chồng chéo sẽ bị tự từ chối.
                          <span className="block mt-0.5 text-amber-600">
                            Tìm kiếm mã <span className="font-mono font-semibold">{target.equipmentCode}</span> trong tab Chờ duyệt để xem và liên hệ với các người đó trước khi quyết định.
                          </span>
                        </div>
                      </div>
                    )}
                    <div>
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
                  </div>
                );
              })()}

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
