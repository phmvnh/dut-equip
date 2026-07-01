import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { disposalApi } from '../api/disposalApi';
import { uploadApi } from '../api/uploadApi';
import { useToastStore } from '../store/toastStore';
import type { Disposal, DisposalApprovePayload } from '../types/disposal';

interface Props {
  disposal: Disposal;
  onClose: () => void;
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function getErrorMessage(err: unknown): string | undefined {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
}

const inputCls = 'w-full h-9 px-3 text-sm rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400';

export default function DisposalApproveModal({ disposal, onClose }: Props) {
  const qc = useQueryClient();
  const toast = useToastStore((s) => s.show);

  const [decisionNo, setDecisionNo] = useState('');
  const [decisionDate, setDecisionDate] = useState(todayISO());
  const [approverName, setApproverName] = useState('');
  const [decisionFileUrl, setDecisionFileUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = ''; };
  }, [onClose]);

  const mut = useMutation({
    mutationFn: (payload: DisposalApprovePayload) => disposalApi.approve(disposal.id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['disposals'] });
      toast('Đã ghi nhận phê duyệt', 'success');
      onClose();
    },
    onError: (err) => setError(getErrorMessage(err) || 'Không thể ghi nhận phê duyệt'),
  });

  async function handleUpload(file: File) {
    setUploading(true); setError('');
    try { setDecisionFileUrl(await uploadApi.uploadDecisionFile(file)); }
    catch { setError('Tải ảnh thất bại'); }
    finally { setUploading(false); }
  }

  function handleSubmit() {
    setError('');
    if (!decisionNo.trim()) { setError('Vui lòng nhập số quyết định'); return; }
    if (!decisionDate) { setError('Vui lòng chọn ngày quyết định'); return; }
    if (!approverName.trim()) { setError('Vui lòng nhập tên người duyệt/ký'); return; }
    mut.mutate({ decisionNo: decisionNo.trim(), decisionDate, approverName: approverName.trim(), decisionFileUrl: decisionFileUrl || undefined });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-gray-900">Ghi nhận phê duyệt thanh lý</h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate"><span className="font-medium">{disposal.code}</span> — {disposal.equipmentName}</p>
          </div>
          <button type="button" onClick={onClose} disabled={mut.isPending} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-50">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700">
            In <strong>Tờ trình đề nghị</strong> trình lãnh đạo ký. Sau khi có quyết định thanh lý, nhập thông tin bên dưới để chuyển sang <strong>Đã duyệt</strong>.
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Số quyết định thanh lý <span className="text-red-500">*</span></label>
            <input value={decisionNo} onChange={(e) => { setDecisionNo(e.target.value); setError(''); }} placeholder="VD: 45/QĐ-ĐHBK" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Ngày quyết định <span className="text-red-500">*</span></label>
              <input type="date" value={decisionDate} onChange={(e) => setDecisionDate(e.target.value)} max={todayISO()} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Người duyệt/ký <span className="text-red-500">*</span></label>
              <input value={approverName} onChange={(e) => setApproverName(e.target.value)} placeholder="VD: Trưởng phòng QTTB" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Ảnh scan quyết định đã ký (tùy chọn)</label>
            {decisionFileUrl ? (
              <div className="flex items-center gap-3">
                <img src={decisionFileUrl} alt="scan" className="h-16 w-16 object-cover rounded-lg border border-gray-200" />
                <button type="button" onClick={() => setDecisionFileUrl('')} className="text-xs text-red-600 hover:underline">Xóa ảnh</button>
              </div>
            ) : (
              <input type="file" accept="image/*" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} className="text-xs" />
            )}
            {uploading && <p className="text-xs text-gray-500 mt-1">Đang tải ảnh...</p>}
          </div>
          {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 whitespace-pre-line">{error}</div>}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={mut.isPending} className="h-9 px-4 rounded-lg bg-gray-100 text-gray-700 border border-gray-300 text-sm hover:bg-gray-200 disabled:opacity-60">Hủy</button>
          <button type="button" onClick={handleSubmit} disabled={mut.isPending || uploading} className="h-9 px-4 rounded-lg bg-green-600 text-white border border-green-700 text-sm font-semibold hover:bg-green-700 disabled:opacity-60 inline-flex items-center gap-2">
            {mut.isPending && <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
            Xác nhận đã duyệt
          </button>
        </div>
      </div>
    </div>
  );
}
