import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { compensationApi } from '../api/compensationApi';
import { useToastStore } from '../store/toastStore';
import type { Compensation } from '../types/compensation';

interface Props {
  compensation: Compensation;
  onClose: () => void;
}

function getErrorMessage(err: unknown): string | undefined {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
}

export default function PaymentProofModal({ compensation, onClose }: Props) {
  const qc = useQueryClient();
  const showToast = useToastStore((s) => s.show);

  // Chỉ dùng cho lần nộp đầu — nộp xong khóa lại, không cho chỉnh sửa ảnh
  const [imageUrl, setImageUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const submitMut = useMutation({
    mutationFn: () => compensationApi.submitPaymentProof(compensation.id, imageUrl),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-compensations'] });
      qc.invalidateQueries({ queryKey: ['compensations'] });
      showToast('Đã nộp minh chứng, chờ quản trị viên xác nhận', 'success');
      onClose();
    },
    onError: (err: unknown) => setError(getErrorMessage(err) || 'Nộp minh chứng thất bại'),
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

  const handleFile = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError('');
    try {
      const url = await compensationApi.uploadPaymentProof(files[0]);
      setImageUrl(url);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Upload ảnh thất bại');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = () => {
    setError('');
    if (!imageUrl) {
      setError('Vui lòng đính kèm ảnh hóa đơn đã nộp tiền');
      return;
    }
    submitMut.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !busy && onClose()}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-gray-900">Nộp minh chứng đã bồi thường</h3>
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
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700">
            Sau khi nộp tiền tại <strong>Phòng Kế toán Tài chính</strong>, hãy chụp lại hóa đơn/biên lai
            và tải lên đây làm minh chứng. Quản trị viên sẽ kiểm tra rồi xác nhận đã bồi thường.
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Ảnh hóa đơn / biên lai <span className="text-red-500">*</span>
            </label>

            {imageUrl ? (
              <div className="relative group rounded-lg overflow-hidden border border-gray-200">
                <img src={imageUrl} alt="Minh chứng đã bồi thường" className="w-full max-h-72 object-contain bg-gray-50" />
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  disabled={busy}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 disabled:opacity-50"
                  title="Xóa ảnh"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <label
                className={`flex flex-col items-center justify-center gap-1 border-2 border-dashed rounded-lg py-8 cursor-pointer transition-colors ${
                  uploading ? 'border-gray-200 bg-gray-50 cursor-wait' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => handleFile(e.target.files)}
                />
                {uploading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-gray-500">Đang tải ảnh...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-7 h-7 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5V18a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1.5M12 3v12m0-12 4 4m-4-4-4 4" />
                    </svg>
                    <span className="text-xs text-gray-500">Tải ảnh hóa đơn (JPG/PNG/WEBP, ≤5MB)</span>
                  </>
                )}
              </label>
            )}
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
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
            disabled={busy || !imageUrl}
            className="h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 inline-flex items-center gap-2"
          >
            {submitMut.isPending && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            Nộp minh chứng
          </button>
        </div>
      </div>
    </div>
  );
}
