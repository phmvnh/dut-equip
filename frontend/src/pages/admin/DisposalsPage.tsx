import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { disposalApi } from '../../api/disposalApi';
import { useToastStore } from '../../store/toastStore';
import DisposalApproveModal from '../../components/DisposalApproveModal';
import DisposalCompleteModal from '../../components/DisposalCompleteModal';
import DisposalDetailModal from '../../components/DisposalDetailModal';
import { printDisposalProposalPDF, printDisposalRecordPDF } from '../../utils/disposalPdf';
import type { Disposal, DisposalStatus } from '../../types/disposal';

type TabKey = 'ALL' | DisposalStatus;

const TABS: { key: TabKey; label: string }[] = [
  { key: 'ALL',       label: 'Tất cả' },
  { key: 'PENDING',   label: 'Chờ duyệt' },
  { key: 'APPROVED',  label: 'Đã duyệt' },
  { key: 'COMPLETED', label: 'Đã thanh lý' },
  { key: 'REJECTED',  label: 'Từ chối' },
  { key: 'CANCELLED', label: 'Đã hủy' },
];

const STATUS_PILL: Record<DisposalStatus, { label: string; bg: string; color: string }> = {
  PENDING:   { label: 'Chờ duyệt',   bg: '#fef9c3', color: '#a16207' },
  APPROVED:  { label: 'Đã duyệt',    bg: '#dbeafe', color: '#1d4ed8' },
  REJECTED:  { label: 'Từ chối',     bg: '#fee2e2', color: '#b91c1c' },
  COMPLETED: { label: 'Đã thanh lý', bg: '#e5e7eb', color: '#4b5563' },
  CANCELLED: { label: 'Đã hủy',      bg: '#f1f5f9', color: '#475569' },
};

const borderStyle = { border: '1px solid #e5e7eb' };

function fmtDate(iso?: string) { return iso ? new Date(iso).toLocaleDateString('vi-VN') : '—'; }
function getErrorMessage(err: unknown): string | undefined {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
}

export default function DisposalsPage() {
  const qc = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const { search } = useOutletContext<{ search: string }>();

  const [tab, setTab] = useState<TabKey>('ALL');
  const [detailTarget, setDetailTarget] = useState<Disposal | null>(null);
  const [approveTarget, setApproveTarget] = useState<Disposal | null>(null);
  const [completeTarget, setCompleteTarget] = useState<Disposal | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Disposal | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [cancelTarget, setCancelTarget] = useState<Disposal | null>(null);

  const { data: list = [], isLoading, isError } = useQuery({
    queryKey: ['disposals'],
    queryFn: () => disposalApi.getAll(),
  });

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((d) =>
      d.code.toLowerCase().includes(q) ||
      d.equipmentCode.toLowerCase().includes(q) ||
      d.equipmentName.toLowerCase().includes(q) ||
      (d.requestedByName ?? '').toLowerCase().includes(q));
  }, [list, search]);

  const counts = TABS.reduce((acc, t) => {
    acc[t.key] = t.key === 'ALL' ? searched.length : searched.filter((d) => d.status === t.key).length;
    return acc;
  }, {} as Record<TabKey, number>);

  const filtered = tab === 'ALL' ? searched : searched.filter((d) => d.status === tab);

  const rejectMut = useMutation({
    mutationFn: (vars: { id: number; reason: string }) => disposalApi.reject(vars.id, vars.reason),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['disposals'] }); setRejectTarget(null); setRejectReason(''); toast('Đã từ chối đề nghị', 'success'); },
    onError: (err) => toast(getErrorMessage(err) || 'Thao tác thất bại', 'error'),
  });
  const cancelMut = useMutation({
    mutationFn: (id: number) => disposalApi.cancel(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['disposals'] }); setCancelTarget(null); toast('Đã hủy đề nghị', 'success'); },
    onError: (err) => toast(getErrorMessage(err) || 'Thao tác thất bại', 'error'),
  });

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
                <th className="px-5 py-2.5 font-medium">Thiết bị</th>
                <th className="px-5 py-2.5 font-medium">Người lập</th>
                <th className="px-5 py-2.5 font-medium whitespace-nowrap">Ngày tạo</th>
                <th className="px-5 py-2.5 font-medium text-right whitespace-nowrap">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400">Đang tải...</td></tr>}
              {isError && !isLoading && <tr><td colSpan={5} className="px-5 py-10 text-center text-red-500">Không thể tải danh sách</td></tr>}
              {!isLoading && !isError && filtered.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400">Chưa có đề nghị nào</td></tr>}
              {filtered.map((d) => {
                const pill = STATUS_PILL[d.status];
                return (
                  <tr key={d.id} onClick={() => setDetailTarget(d)} className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                    <td className="px-5 py-3 whitespace-nowrap font-mono font-semibold text-gray-700">{d.code}</td>
                    <td className="px-5 py-3 max-w-[260px]">
                      <div className="font-medium text-gray-900 truncate" title={d.equipmentName}>{d.equipmentName}</div>
                      <div className="text-xs text-gray-500">{d.equipmentCode}</div>
                    </td>
                    <td className="px-5 py-3">{d.requestedByName}</td>
                    <td className="px-5 py-3 whitespace-nowrap text-gray-600">{fmtDate(d.createdAt)}</td>
                    <td className="px-5 py-3 text-right whitespace-nowrap"><span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: pill.bg, color: pill.color }}>{pill.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {detailTarget && (
        <DisposalDetailModal
          disposal={detailTarget}
          onClose={() => setDetailTarget(null)}
          onPrintProposal={() => printDisposalProposalPDF(detailTarget)}
          onPrintRecord={() => printDisposalRecordPDF(detailTarget)}
          onApprove={detailTarget.status === 'PENDING' ? () => { setApproveTarget(detailTarget); setDetailTarget(null); } : undefined}
          onReject={detailTarget.status === 'PENDING' ? () => { setRejectTarget(detailTarget); setDetailTarget(null); } : undefined}
          onCancel={detailTarget.status === 'PENDING' || detailTarget.status === 'APPROVED' ? () => { setCancelTarget(detailTarget); setDetailTarget(null); } : undefined}
          onComplete={detailTarget.status === 'APPROVED' ? () => { setCompleteTarget(detailTarget); setDetailTarget(null); } : undefined}
        />
      )}

      {approveTarget && <DisposalApproveModal disposal={approveTarget} onClose={() => setApproveTarget(null)} />}
      {completeTarget && <DisposalCompleteModal disposal={completeTarget} onClose={() => setCompleteTarget(null)} />}

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
            <p className="text-sm text-gray-600 mb-5">Bạn chắc chắn muốn hủy đề nghị thanh lý này? Thiết bị sẽ trở lại trạng thái bình thường.</p>
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
