import { useEffect } from 'react';
import type { MaintenanceLog, MaintenanceStatus } from '../types/maintenance';

interface Props {
  maintenance: MaintenanceLog;
  onClose: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
  onEdit?: () => void;
  onExportPDF?: () => void;
}

const STATUS_PILL: Record<MaintenanceStatus, { label: string; bg: string; color: string }> = {
  IN_PROGRESS: { label: 'Đang bảo trì', bg: '#fef9c3', color: '#a16207' },
  COMPLETED:   { label: 'Hoàn thành',   bg: '#dcfce7', color: '#15803d' },
  CANCELLED:   { label: 'Đã hủy',       bg: '#f1f5f9', color: '#475569' },
};

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('vi-VN');
}

function fmtDateTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

function fmtPrice(v?: number) {
  if (v === undefined || v === null) return '—';
  return Number(v).toLocaleString('vi-VN') + ' ₫';
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4">
      <span className="w-36 flex-shrink-0 text-xs text-gray-500 pt-0.5">{label}</span>
      <span className="flex-1 text-sm text-gray-900">{value || <span className="text-gray-400">—</span>}</span>
    </div>
  );
}

export default function MaintenanceDetailModal({ maintenance, onClose, onComplete, onCancel, onEdit, onExportPDF }: Props) {
  const m = maintenance;
  const status = m.status as MaintenanceStatus;
  const pill = STATUS_PILL[status];
  const isOpen = status === 'IN_PROGRESS';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3 min-w-0">
            <h3 className="text-base font-semibold text-gray-900">Chi tiết phiếu bảo trì</h3>
            <span className="text-xs font-semibold text-gray-700 font-mono tracking-wider">{m.code}</span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: pill.bg, color: pill.color }}
            >
              {pill.label}
            </span>
          </div>
          <button
            onClick={onClose}
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
              <p className="text-sm font-semibold text-gray-900 truncate">{m.equipmentName}</p>
              <p className="text-xs text-gray-500">{m.equipmentCode}</p>
            </div>
          </div>

          {/* Thông tin phiếu */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Thông tin bảo trì</p>
            <div className="space-y-2">
              <Row label="Người thực hiện" value={m.technicianName} />
              <Row label="Ngày bắt đầu" value={fmtDate(m.startDate)} />
              <Row
                label={status === 'IN_PROGRESS' ? 'Dự kiến kết thúc' : 'Ngày kết thúc'}
                value={fmtDate(m.endDate)}
              />
              <Row label="Chi phí" value={fmtPrice(m.cost)} />
            </div>
          </div>

          {/* Mô tả */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Mô tả nội dung</p>
            <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700 whitespace-pre-wrap">
              {m.description || <span className="text-gray-400">Không có mô tả</span>}
            </div>
          </div>

          {/* Timeline */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Timeline</p>
            <div className="space-y-2">
              <Row label="Tạo lúc" value={fmtDateTime(m.createdAt)} />
              <Row label="Cập nhật lần cuối" value={fmtDateTime(m.updatedAt)} />
            </div>
          </div>
        </div>

        {/* Footer — render khi có ít nhất 1 action; phiếu đã đóng vẫn cho phép xuất PDF */}
        {(onExportPDF || (isOpen && (onCancel || onEdit || onComplete))) && (
          <div className="px-6 py-4 border-t border-gray-100 flex justify-between gap-2">
            <div>
              {onExportPDF && (
                <button
                  onClick={onExportPDF}
                  className="h-9 px-4 rounded-lg text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 inline-flex items-center gap-2"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 2v6h6M9 13h6M9 17h4" />
                  </svg>
                  Xuất báo cáo
                </button>
              )}
            </div>
            <div className="flex gap-2">
              {isOpen && onCancel && (
                <button
                  onClick={onCancel}
                  className="h-9 px-4 rounded-lg text-sm font-semibold bg-red-100 text-red-800 border border-red-300 hover:bg-red-200"
                >
                  Hủy phiếu
                </button>
              )}
              {isOpen && onEdit && (
                <button
                  onClick={onEdit}
                  className="h-9 px-4 rounded-lg text-sm font-semibold bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200"
                >
                  Sửa
                </button>
              )}
              {isOpen && onComplete && (
                <button
                  onClick={onComplete}
                  className="h-9 px-4 rounded-lg text-sm font-semibold bg-green-100 text-green-800 border border-green-300 hover:bg-green-200"
                >
                  Hoàn thành
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
