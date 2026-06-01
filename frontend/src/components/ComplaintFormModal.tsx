import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { compensationApi } from '../api/compensationApi';
import { useToastStore } from '../store/toastStore';
import type { Compensation } from '../types/compensation';

interface Props {
  compensation: Compensation;
  onClose: () => void;
}

const MAX_IMAGES = 3;

function getErrorMessage(err: unknown): string | undefined {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
}

export default function ComplaintFormModal({ compensation, onClose }: Props) {
  const qc = useQueryClient();
  const showToast = useToastStore((s) => s.show);

  const [reason, setReason] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submitMut = useMutation({
    mutationFn: () =>
      compensationApi.submitComplaint(compensation.id, {
        reason: reason.trim(),
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-compensations'] });
      qc.invalidateQueries({ queryKey: ['compensations'] });
      showToast('Đã gửi khiếu nại đến quản trị viên', 'success');
      onClose();
    },
    onError: (err: unknown) => {
      setError(getErrorMessage(err) || 'Gửi khiếu nại thất bại');
    },
  });

  const busy = submitMut.isPending || uploading;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (busy) return;
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, busy]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = MAX_IMAGES - imageUrls.length;
    if (remaining <= 0) { setError(`Tối đa ${MAX_IMAGES} ảnh`); return; }
    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    setError('');
    try {
      const uploaded: string[] = [];
      for (const f of toUpload) {
        const url = await compensationApi.uploadComplaintImage(f);
        uploaded.push(url);
      }
      setImageUrls((prev) => [...prev, ...uploaded]);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Upload ảnh thất bại');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (idx: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = () => {
    setError('');
    if (!reason.trim()) {
      setError('Vui lòng nhập lý do khiếu nại');
      return;
    }
    submitMut.mutate();
  };

  const reasonLength = reason.trim().length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={() => !busy && onClose()}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-gray-900">Khiếu nại phiếu bồi thường</h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate">
              <span className="font-mono">{compensation.code}</span> — {compensation.equipmentName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="bg-orange-50 border border-orange-100 rounded-lg px-3 py-2 text-xs text-orange-700">
            Bạn chỉ có thể khiếu nại <strong>1 lần</strong> cho mỗi phiếu. Hãy mô tả rõ ràng và đính kèm
            bằng chứng (nếu có) để admin xử lý nhanh nhất.
          </div>

          {/* Lý do */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Lý do khiếu nại <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => { setReason(e.target.value); setError(''); }}
              rows={5}
              placeholder="VD: Thiết bị đã có dấu hiệu hỏng từ trước khi mượn / Hỏng không phải do tôi gây ra / Số tiền không hợp lý..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
            <div className="flex justify-end mt-1">
              <span className="text-[11px] text-gray-500">{reasonLength} ký tự</span>
            </div>
          </div>

          {/* Ảnh chứng cứ */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Ảnh chứng cứ <span className="text-gray-400">(tuỳ chọn, tối đa {MAX_IMAGES})</span>
            </label>

            {imageUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-2">
                {imageUrls.map((url, idx) => (
                  <div key={url} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200">
                    <img src={url} alt={`Chứng cứ ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      disabled={busy}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {imageUrls.length < MAX_IMAGES && (
              <label
                className={`flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded-lg py-5 cursor-pointer transition-colors ${
                  uploading
                    ? 'border-gray-200 bg-gray-50 cursor-wait'
                    : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => handleFiles(e.target.files)}
                />
                {uploading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-gray-500">Đang tải ảnh...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-xs text-gray-500">Thêm ảnh (JPG/PNG/WEBP, ≤5MB)</span>
                  </>
                )}
              </label>
            )}
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="h-9 px-4 rounded-lg bg-gray-100 text-gray-700 border border-gray-300 text-sm hover:bg-gray-200 disabled:opacity-60"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy || reasonLength === 0}
            className="h-9 px-4 rounded-lg bg-orange-100 text-orange-800 border border-orange-300 text-sm font-semibold hover:bg-orange-200 disabled:opacity-60 inline-flex items-center gap-2"
          >
            {submitMut.isPending && (
              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
            Gửi khiếu nại
          </button>
        </div>
      </div>
    </div>
  );
}
