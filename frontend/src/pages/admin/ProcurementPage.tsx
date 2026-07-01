import { useEffect, useMemo, useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { procurementApi } from '../../api/procurementApi';
import { useToastStore } from '../../store/toastStore';
import ProcurementFormModal from '../../components/ProcurementFormModal';
import ProcurementApproveModal from '../../components/ProcurementApproveModal';
import ProcurementDetailModal from '../../components/ProcurementDetailModal';
import { printProcurementProposalPDF, printProcurementReceiptPDF } from '../../utils/procurementPdf';
import type { Procurement, ProcurementStatus } from '../../types/procurement';

type TabKey = 'ALL' | ProcurementStatus;

const TABS: { key: TabKey; label: string }[] = [
  { key: 'ALL',       label: 'Tất cả' },
  { key: 'PENDING',   label: 'Chờ duyệt' },
  { key: 'APPROVED',  label: 'Đã duyệt' },
  { key: 'COMPLETED', label: 'Hoàn thành' },
  { key: 'REJECTED',  label: 'Từ chối' },
  { key: 'CANCELLED', label: 'Đã hủy' },
];

const STATUS_PILL: Record<ProcurementStatus, { label: string; bg: string; color: string }> = {
  PENDING:   { label: 'Chờ duyệt',  bg: '#fef9c3', color: '#a16207' },
  APPROVED:  { label: 'Đã duyệt',   bg: '#dbeafe', color: '#1d4ed8' },
  REJECTED:  { label: 'Từ chối',    bg: '#fee2e2', color: '#b91c1c' },
  COMPLETED: { label: 'Hoàn thành', bg: '#dcfce7', color: '#15803d' },
  CANCELLED: { label: 'Đã hủy',     bg: '#f1f5f9', color: '#475569' },
};

const borderStyle = { border: '1px solid #e5e7eb' };

function fmtDate(iso?: string) { return iso ? new Date(iso).toLocaleDateString('vi-VN') : '—'; }
function fmtMoney(v?: number) { return v != null ? Number(v).toLocaleString('vi-VN') + ' ₫' : '—'; }
function getErrorMessage(err: unknown): string | undefined {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
}

export default function ProcurementPage() {
  const qc = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const { search } = useOutletContext<{ search: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tab, setTab] = useState<TabKey>('ALL');
  const [showForm, setShowForm] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [approveTarget, setApproveTarget] = useState<Procurement | null>(null);
  const [receiveTarget, setReceiveTarget] = useState<Procurement | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Procurement | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [cancelTarget, setCancelTarget] = useState<Procurement | null>(null);

  // Mở form từ topbar action (?action=add)
  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      setShowForm(true);
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: list = [], isLoading, isError } = useQuery({
    queryKey: ['procurements'],
    queryFn: () => procurementApi.getAll(),
  });

  const { data: detail, isFetching: detailLoading } = useQuery({
    queryKey: ['procurement', detailId],
    queryFn: () => procurementApi.getById(detailId as number),
    enabled: detailId != null,
  });

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((p) =>
      p.code.toLowerCase().includes(q) ||
      p.title.toLowerCase().includes(q) ||
      (p.requestedByName ?? '').toLowerCase().includes(q));
  }, [list, search]);

  const counts = TABS.reduce((acc, t) => {
    acc[t.key] = t.key === 'ALL' ? searched.length : searched.filter((p) => p.status === t.key).length;
    return acc;
  }, {} as Record<TabKey, number>);

  const filtered = tab === 'ALL' ? searched : searched.filter((p) => p.status === tab);

  const rejectMut = useMutation({
    mutationFn: (vars: { id: number; reason: string }) => procurementApi.reject(vars.id, vars.reason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['procurements'] }); setRejectTarget(null); setRejectReason(''); toast('Đã từ chối đề nghị', 'success'); },
    onError: (err) => toast(getErrorMessage(err) || 'Thao tác thất bại', 'error'),
  });
  const cancelMut = useMutation({
    mutationFn: (id: number) => procurementApi.cancel(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['procurements'] }); setCancelTarget(null); toast('Đã hủy đề nghị', 'success'); },
    onError: (err) => toast(getErrorMessage(err) || 'Thao tác thất bại', 'error'),
  });
  const receiveMut = useMutation({
    mutationFn: (id: number) => procurementApi.receive(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['procurements'] }); setReceiveTarget(null); toast('Đã nghiệm thu đề nghị', 'success'); },
    onError: (err) => toast(getErrorMessage(err) || 'Thao tác thất bại', 'error'),
  });

  const closeDetail = () => setDetailId(null);

  return (
    <div className="space-y-4">
      <div className="bg-white px-2 py-1 flex gap-1 overflow-x-auto" style={{ ...borderStyle, borderRadius: 10 }}>
        {TABS.map((t) => {
          const active = tab === t.key;
          const count = counts[t.key];
          return (
            <button key={t.key} onClick={() => setTab(t.key)} className="px-4 py-2 text-sm rounded-lg font-medium transition-colors whitespace-nowrap" style={{ backgroundColor: active ? '#2563eb' : 'transparent', color: active ? 'white' : '#4b5563' }}>
              {t.label}
              {count > 0 && <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: active ? 'rgba(255,255,255,0.25)' : '#e5e7eb', color: active ? 'white' : '#4b5563' }}>{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="bg-white" style={{ ...borderStyle, borderRadius: 10 }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 bg-gray-50">
              <tr>
                <th className="px-5 py-2.5 font-medium whitespace-nowrap">Mã</th>
                <th className="px-5 py-2.5 font-medium">Tiêu đề</th>
                <th className="px-5 py-2.5 font-medium">Người lập</th>
                <th className="px-5 py-2.5 font-medium text-center whitespace-nowrap">Số lượng</th>
                <th className="px-5 py-2.5 font-medium text-right whitespace-nowrap">Dự toán</th>
                <th className="px-5 py-2.5 font-medium whitespace-nowrap">Ngày tạo</th>
                <th className="px-5 py-2.5 font-medium text-right whitespace-nowrap">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400">Đang tải...</td></tr>}
              {isError && !isLoading && <tr><td colSpan={7} className="px-5 py-10 text-center text-red-500">Không thể tải danh sách</td></tr>}
              {!isLoading && !isError && filtered.length === 0 && <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400">Chưa có đề nghị nào</td></tr>}
              {filtered.map((p) => {
                const pill = STATUS_PILL[p.status];
                return (
                  <tr key={p.id} onClick={() => setDetailId(p.id)} className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                    <td className="px-5 py-3 whitespace-nowrap font-mono font-semibold text-gray-700">{p.code}</td>
                    <td className="px-5 py-3 max-w-[260px]"><div className="truncate" title={p.title}>{p.title}</div></td>
                    <td className="px-5 py-3">{p.requestedByName}</td>
                    <td className="px-5 py-3 text-center">{p.totalQuantity}</td>
                    <td className="px-5 py-3 text-right tabular-nums whitespace-nowrap">{fmtMoney(p.estimatedTotal)}</td>
                    <td className="px-5 py-3 whitespace-nowrap text-gray-600">{fmtDate(p.createdAt)}</td>
                    <td className="px-5 py-3 text-right whitespace-nowrap"><span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: pill.bg, color: pill.color }}>{pill.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && <ProcurementFormModal onClose={() => setShowForm(false)} />}

      {detailId != null && detail && (
        <ProcurementDetailModal
          procurement={detail}
          loading={detailLoading}
          onClose={closeDetail}
          onPrintProposal={() => printProcurementProposalPDF(detail)}
          onPrintReceipt={() => printProcurementReceiptPDF(detail)}
          onApprove={detail.status === 'PENDING' ? () => { setApproveTarget(detail); closeDetail(); } : undefined}
          onReject={detail.status === 'PENDING' ? () => { setRejectTarget(detail); closeDetail(); } : undefined}
          onCancel={detail.status === 'PENDING' || detail.status === 'APPROVED' ? () => { setCancelTarget(detail); closeDetail(); } : undefined}
          onReceive={detail.status === 'APPROVED' ? () => { setReceiveTarget(detail); closeDetail(); } : undefined}
        />
      )}

      {approveTarget && <ProcurementApproveModal procurement={approveTarget} onClose={() => setApproveTarget(null)} />}
      {receiveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !receiveMut.isPending && setReceiveTarget(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Nghiệm thu đề nghị {receiveTarget.code}</h3>
            <p className="text-sm text-gray-600 mb-5">Xác nhận đã nghiệm thu? Đề nghị sẽ chuyển sang <b>Hoàn thành</b>. Thiết bị được thêm thủ công ở tab <b>Thiết bị</b>.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setReceiveTarget(null)} disabled={receiveMut.isPending} className="h-9 px-4 rounded-lg bg-gray-100 text-gray-800 border border-gray-300 text-sm hover:bg-gray-200 disabled:opacity-60">Hủy</button>
              <button onClick={() => receiveMut.mutate(receiveTarget.id)} disabled={receiveMut.isPending} className="h-9 px-4 rounded-lg bg-green-600 text-white border border-green-700 text-sm font-semibold hover:bg-green-700 disabled:opacity-60">Xác nhận nghiệm thu</button>
            </div>
          </div>
        </div>
      )}

      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !rejectMut.isPending && setRejectTarget(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-900 mb-2">Từ chối đề nghị {rejectTarget.code}</h3>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={3} placeholder="Lý do từ chối (tùy chọn)" className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 mb-4" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setRejectTarget(null)} disabled={rejectMut.isPending} className="h-9 px-4 rounded-lg bg-gray-100 text-gray-800 border border-gray-300 text-sm hover:bg-gray-200 disabled:opacity-60">Hủy</button>
              <button onClick={() => rejectMut.mutate({ id: rejectTarget.id, reason: rejectReason.trim() })} disabled={rejectMut.isPending} className="h-9 px-4 rounded-lg bg-red-100 text-red-800 border border-red-300 text-sm font-semibold hover:bg-red-200 disabled:opacity-60">Xác nhận từ chối</button>
            </div>
          </div>
        </div>
      )}

      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !cancelMut.isPending && setCancelTarget(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Hủy đề nghị {cancelTarget.code}</h3>
            <p className="text-sm text-gray-600 mb-5">Bạn chắc chắn muốn hủy đề nghị mua sắm này?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setCancelTarget(null)} disabled={cancelMut.isPending} className="h-9 px-4 rounded-lg bg-gray-100 text-gray-800 border border-gray-300 text-sm hover:bg-gray-200 disabled:opacity-60">Không</button>
              <button onClick={() => cancelMut.mutate(cancelTarget.id)} disabled={cancelMut.isPending} className="h-9 px-4 rounded-lg bg-red-100 text-red-800 border border-red-300 text-sm font-semibold hover:bg-red-200 disabled:opacity-60">Xác nhận hủy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
