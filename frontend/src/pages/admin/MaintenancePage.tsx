import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useOutletContext } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { maintenanceApi } from '../../api/maintenanceApi';
import { buildingApi } from '../../api/buildingApi';
import { useToastStore } from '../../store/toastStore';
import MaintenanceFormModal from '../../components/MaintenanceFormModal';
import MaintenanceDetailModal from '../../components/MaintenanceDetailModal';
import MoneyInput from '../../components/MoneyInput';
import type { MaintenanceLog, MaintenanceStatus, MaintenanceUpdatePayload } from '../../types/maintenance';

type TabKey = 'ALL' | MaintenanceStatus;

const TABS: { key: TabKey; label: string }[] = [
  { key: 'ALL',         label: 'Tất cả' },
  { key: 'IN_PROGRESS', label: 'Đang bảo trì' },
  { key: 'COMPLETED',   label: 'Hoàn thành' },
  { key: 'CANCELLED',   label: 'Đã hủy' },
];

const STATUS_PILL: Record<MaintenanceStatus, { label: string; bg: string; color: string }> = {
  IN_PROGRESS: { label: 'Đang bảo trì', bg: '#fef9c3', color: '#a16207' },
  COMPLETED:   { label: 'Hoàn thành',   bg: '#dcfce7', color: '#15803d' },
  CANCELLED:   { label: 'Đã hủy',       bg: '#f1f5f9', color: '#475569' },
};

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white';
const borderStyle = { border: '1px solid #e5e7eb' };

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('vi-VN');
}

function fmtPrice(v?: number) {
  if (v === undefined || v === null) return '—';
  return Number(v).toLocaleString('vi-VN') + ' ₫';
}

function getErrorMessage(err: unknown): string | undefined {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
}

function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// Mở cửa sổ mới với HTML phiếu BT theo template Phieu_Bao_Tri_Thiet_Bi.docx
// rồi gọi window.print() — browser native chuyển thành PDF qua dialog Print
function printMaintenancePDF(m: MaintenanceLog) {
  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) {
    alert('Trình duyệt chặn cửa sổ pop-up. Vui lòng cho phép pop-up để xuất PDF.');
    return;
  }
  const esc = (s?: string | number | null) => String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
  const fmtVnDate = (iso?: string) => iso ? new Date(iso).toLocaleDateString('vi-VN') : '';
  const cost = m.cost != null ? Number(m.cost).toLocaleString('vi-VN') : '';
  const now = new Date();
  const day = now.getDate();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // Checkbox cho "Trạng thái sau BT" — mapping với MaintenanceStatus
  const cb = (checked: boolean) => checked ? '☑' : '☐';
  const cbHoanThanh = cb(m.status === 'COMPLETED');
  const cbHuyBo    = cb(m.status === 'CANCELLED');
  // "Cần sửa thêm" không có status tương ứng → để trống
  const cbCanSua   = cb(false);

  w.document.write(`<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Phiếu bảo trì ${esc(m.code)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: 'Times New Roman', Times, serif;
    margin: 0;
    padding: 18mm 20mm;
    color: #000;
    font-size: 13pt;
    line-height: 1.4;
  }
  .header { width: 100%; margin-bottom: 8px; }
  .header td { vertical-align: top; padding: 0; }
  .header .left, .header .right { text-align: center; width: 50%; }
  .header .name { font-weight: bold; text-transform: uppercase; font-size: 12pt; }
  .header .motto { font-weight: bold; font-style: italic; font-size: 12pt; }

  .title { text-align: center; font-weight: bold; font-size: 16pt; text-transform: uppercase; margin: 24px 0 8px; }
  .code-line { text-align: center; font-size: 12pt; margin-bottom: 16px; }
  .code-line .code-value { display: inline-block; min-width: 220px; border-bottom: 1px solid #000; padding: 0 8px; font-weight: bold; }

  .section { font-weight: bold; text-transform: uppercase; font-size: 12pt; margin: 14px 0 6px; }

  table.info { width: 100%; border-collapse: collapse; }
  table.info td { border: 1px solid #000; padding: 6px 8px; vertical-align: top; font-size: 12pt; }
  table.info td.lbl { font-weight: bold; width: 24%; background: #fafafa; white-space: nowrap; }
  table.info td.lbl-sm { font-weight: bold; width: 18%; background: #fafafa; white-space: nowrap; }
  .multiline { min-height: 100px; }
  .multiline-big { min-height: 100px; }
  .multiline-xl { min-height: 150px; }

  .date-line { text-align: right; font-style: italic; margin-top: 12px; }
  .date-line .dash { display: inline-block; min-width: 35px; border-bottom: 1px dotted #000; text-align: center; font-style: normal; }

  .signs { width: 100%; margin-top: 10px; }
  .signs td { width: 50%; text-align: center; vertical-align: top; padding: 6px 0 0; }
  .sign-title { font-weight: bold; }
  .sign-note { font-style: italic; font-size: 11pt; }
  .sign-space { height: 70px; }

  @media print {
    body { padding: 16mm; }
    @page { size: A4; margin: 0; }
  }
</style>
</head>
<body>
  <table class="header">
    <tr>
      <td class="left">
        <div class="name">Trường Đại học Bách khoa</div>
        <div class="name">Phòng Quản lý Tài sản công</div>
      </td>
      <td class="right">
        <div class="name">Cộng hòa Xã hội Chủ nghĩa Việt Nam</div>
        <div class="motto">Độc lập - Tự do - Hạnh phúc</div>
      </td>
    </tr>
  </table>

  <div class="title">Phiếu bảo trì thiết bị</div>
  <div class="code-line">Mã phiếu bảo trì: <span class="code-value">${esc(m.code)}</span></div>

  <div class="section">I. Thông tin thiết bị</div>
  <table class="info">
    <tr>
      <td class="lbl">Mã thiết bị:</td>
      <td>${esc(m.equipmentCode)}</td>

    </tr>
    <tr>
      <td class="lbl">Tên thiết bị:</td>
      <td colspan="3">${esc(m.equipmentName)}</td>
    </tr>

    <tr>
      <td class="lbl">Tình trạng trước bảo trì:</td>
      <td colspan="3" class="multiline-big" style="white-space: pre-wrap;">${esc(m.description)}</td>
    </tr>
  </table>

  <div class="section">II. Thông tin phiếu bảo trì</div>
  <table class="info">
    <tr>
      <td class="lbl">Người thực hiện:</td>
      <td>${esc(m.technicianName)}</td>
      <td class="lbl-sm">Ngày bắt đầu:</td>
      <td>${fmtVnDate(m.startDate)}</td>
    </tr>
    <tr>
      <td class="lbl">Chi phí (VNĐ):</td>
      <td>${cost}</td>
      <td class="lbl-sm">Ngày kết thúc:</td>
      <td>${fmtVnDate(m.endDate)}</td>
    </tr>
    <tr>
      <td class="lbl">Nội dung bảo trì:</td>
      <td colspan="3" class="multiline-big"></td>
    </tr>

    <tr>
      <td class="lbl">Kết quả sau bảo trì:</td>
      <td colspan="3">
        <span style="margin-right: 24px;">${cbHoanThanh} Hoàn thành</span>
        <span style="margin-right: 24px;">${cbCanSua} Cần sửa thêm</span>
        <span>${cbHuyBo} Hủy bỏ</span>
      </td>
    </tr>
    <tr>
      <td class="lbl">Ghi chú:</td>
      <td colspan="3" class="multiline-xl"></td>
    </tr>
  </table>

  <div class="section">III. Xác nhận và ký duyệt</div>
  <div class="date-line">
    Đà Nẵng, ngày <span class="dash">${day}</span> tháng <span class="dash">${month}</span> năm <span class="dash">${year}</span>
  </div>

  <table class="signs">
    <tr>
      <td>
        <div class="sign-title">Người thực hiện bảo trì</div>
        <div class="sign-note">(Ký, ghi rõ họ tên)</div>
        <div class="sign-space"></div>
      </td>
      <td>
        <div class="sign-title">Trưởng phòng Quản lý Tài sản</div>
        <div class="sign-note">(Ký, ghi rõ họ tên)</div>
        <div class="sign-space"></div>
      </td>
    </tr>
  </table>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 200);
    };
  <\/script>
</body>
</html>`);
  w.document.close();
}

export default function MaintenancePage() {
  const qc = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const [searchParams, setSearchParams] = useSearchParams();
  const { search } = useOutletContext<{ search: string }>();

  const [tab, setTab] = useState<TabKey>('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [detailTarget, setDetailTarget] = useState<MaintenanceLog | null>(null);
  const [editTarget, setEditTarget] = useState<MaintenanceLog | null>(null);
  const [completeTarget, setCompleteTarget] = useState<MaintenanceLog | null>(null);
  const [cancelTarget, setCancelTarget] = useState<MaintenanceLog | null>(null);

  // Mở form tạo khi vào từ topbar (?action=add)
  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      setShowCreate(true);
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: logs = [], isLoading, isError } = useQuery({
    queryKey: ['maintenance'],
    queryFn: () => maintenanceApi.getAll(),
  });

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((l) =>
      (l.equipmentName ?? '').toLowerCase().includes(q) ||
      (l.equipmentCode ?? '').toLowerCase().includes(q) ||
      (l.technicianName ?? '').toLowerCase().includes(q)
    );
  }, [logs, search]);

  const counts = TABS.reduce((acc, t) => {
    acc[t.key] = t.key === 'ALL' ? searched.length : searched.filter((l) => l.status === t.key).length;
    return acc;
  }, {} as Record<TabKey, number>);

  const filtered = tab === 'ALL' ? searched : searched.filter((l) => l.status === tab);

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div
        className="bg-white px-2 py-1 flex gap-1 overflow-x-auto"
        style={{ ...borderStyle, borderRadius: 10 }}
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
      <div className="bg-white" style={{ ...borderStyle, borderRadius: 10 }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 bg-gray-50">
              <tr>
                <th className="px-5 py-2.5 font-medium whitespace-nowrap">Mã phiếu</th>
                <th className="px-5 py-2.5 font-medium">Thiết bị</th>
                <th className="px-5 py-2.5 font-medium">Người thực hiện</th>
                <th className="px-5 py-2.5 font-medium">Ngày BĐ</th>
                <th className="px-5 py-2.5 font-medium">Ngày KT</th>
                <th className="px-5 py-2.5 font-medium">Mô tả</th>
                <th className="px-5 py-2.5 font-medium text-right whitespace-nowrap">Trạng thái</th>
                <th className="px-5 py-2.5 font-medium text-center whitespace-nowrap">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-gray-400">Đang tải...</td></tr>
              )}
              {isError && !isLoading && (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-red-500">Không thể tải danh sách phiếu bảo trì</td></tr>
              )}
              {!isLoading && !isError && filtered.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-gray-400">Không có phiếu nào trong mục này</td></tr>
              )}
              {filtered.map((m) => {
                const pill = STATUS_PILL[m.status];
                return (
                  <tr
                    key={m.id}
                    onClick={() => setDetailTarget(m)}
                    className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3 font-semibold text-gray-700 whitespace-nowrap">{m.code}</td>
                    <td className="px-5 py-3 max-w-[280px]">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-gradient-to-br from-blue-50 to-slate-100 ring-1 ring-gray-100 flex items-center justify-center">
                          {m.equipmentImageUrl ? (
                            <img src={m.equipmentImageUrl} alt={m.equipmentName} className="w-full h-full object-cover" />
                          ) : (
                            <svg className="w-5 h-5 text-blue-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <rect x="2" y="3" width="20" height="14" rx="2.5" />
                              <path strokeLinecap="round" d="M8 21h8M12 17v4" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 truncate" title={m.equipmentName}>{m.equipmentName}</div>
                          <div className="text-xs text-gray-500">{m.equipmentCode}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-700">{m.technicianName ?? <span className="text-gray-400">—</span>}</td>
                    <td className="px-5 py-3 whitespace-nowrap">{fmtDate(m.startDate)}</td>
                    <td className="px-5 py-3 whitespace-nowrap">{fmtDate(m.endDate)}</td>
                    <td className="px-5 py-3 text-gray-600 max-w-[280px]">
                      <div className="line-clamp-2">{m.description}</div>
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: pill.bg, color: pill.color }}
                      >
                        {pill.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => printMaintenancePDF(m)}
                        title="Xuất phiếu PDF"
                        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-blue-700 hover:bg-blue-50 border border-blue-200"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14 2v6h6M9 13h6M9 17h4" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal tạo */}
      {showCreate && (
        <MaintenanceFormModal
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* Detail */}
      {detailTarget && (
        <MaintenanceDetailModal
          maintenance={detailTarget}
          onClose={() => setDetailTarget(null)}
          onEdit={detailTarget.status === 'IN_PROGRESS' ? () => { setEditTarget(detailTarget); setDetailTarget(null); } : undefined}
          onComplete={detailTarget.status === 'IN_PROGRESS' ? () => { setCompleteTarget(detailTarget); setDetailTarget(null); } : undefined}
          onCancel={detailTarget.status === 'IN_PROGRESS' ? () => { setCancelTarget(detailTarget); setDetailTarget(null); } : undefined}
          onExportPDF={() => printMaintenancePDF(detailTarget)}
        />
      )}

      {/* Edit modal — inline (chỉ admin chỉnh thông tin khi IN_PROGRESS) */}
      {editTarget && (
        <EditMaintenanceModal
          maintenance={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ['maintenance'] });
            setEditTarget(null);
            toast('Đã cập nhật phiếu bảo trì', 'success');
          }}
        />
      )}

      {/* Complete modal */}
      {completeTarget && (
        <CompleteMaintenanceModal
          maintenance={completeTarget}
          onClose={() => setCompleteTarget(null)}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ['maintenance'] });
            qc.invalidateQueries({ queryKey: ['equips'] });
            setCompleteTarget(null);
            toast('Đã hoàn thành phiếu bảo trì', 'success');
          }}
        />
      )}

      {/* Cancel modal */}
      {cancelTarget && (
        <CancelMaintenanceModal
          maintenance={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ['maintenance'] });
            qc.invalidateQueries({ queryKey: ['equips'] });
            setCancelTarget(null);
            toast('Đã hủy phiếu bảo trì', 'success');
          }}
        />
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// EditMaintenanceModal — sửa info phiếu IN_PROGRESS
// -----------------------------------------------------------------------------
function EditMaintenanceModal({
  maintenance,
  onClose,
  onSaved,
}: {
  maintenance: MaintenanceLog;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToastStore((s) => s.show);
  const [technicianName, setTechnicianName] = useState(maintenance.technicianName ?? '');
  const [startDate, setStartDate] = useState(maintenance.startDate);
  const [endDate, setEndDate] = useState(maintenance.endDate ?? '');
  const [costStr, setCostStr] = useState(maintenance.cost != null ? String(maintenance.cost) : '');
  const [description, setDescription] = useState(maintenance.description ?? '');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const mut = useMutation({
    mutationFn: (payload: MaintenanceUpdatePayload) => maintenanceApi.update(maintenance.id, payload),
    onSuccess: onSaved,
    onError: (err) => {
      const msg = getErrorMessage(err) ?? 'Không thể cập nhật';
      setFormError(msg);
      toast(msg, 'error');
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate) { setFormError('Vui lòng chọn ngày bắt đầu'); return; }
    if (!description.trim()) { setFormError('Vui lòng nhập mô tả'); return; }
    if (endDate && endDate < startDate) { setFormError('Ngày kết thúc phải sau ngày bắt đầu'); return; }

    let cost: number | undefined;
    if (costStr.trim()) {
      const n = Number(costStr);
      if (Number.isNaN(n) || n < 0) { setFormError('Chi phí phải là số không âm'); return; }
      cost = n;
    }

    mut.mutate({
      technicianName: technicianName.trim() || undefined,
      startDate,
      endDate: endDate || undefined,
      description: description.trim(),
      cost,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !mut.isPending && onClose()}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Sửa phiếu bảo trì #{maintenance.id}</h3>
          <button onClick={onClose} disabled={mut.isPending} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-4">
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <p className="text-sm font-semibold text-gray-900 truncate">{maintenance.equipmentName}</p>
              <p className="text-xs text-gray-500">{maintenance.equipmentCode}</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Người thực hiện</label>
              <input type="text" value={technicianName} onChange={(e) => setTechnicianName(e.target.value)} className={inputCls} style={borderStyle} maxLength={200} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Ngày bắt đầu <span className="text-red-500">*</span></label>
                <input type="date" lang="en-GB" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} style={borderStyle} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Dự kiến kết thúc</label>
                <input type="date" lang="en-GB" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} style={borderStyle} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Chi phí <span className="text-gray-400 font-normal">(VNĐ, tùy chọn)</span></label>
              <MoneyInput value={costStr} onChange={setCostStr} className={inputCls} style={borderStyle} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Mô tả nội dung bảo trì <span className="text-red-500">*</span></label>
              <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputCls} resize-none`} style={borderStyle} />
            </div>

            {formError && (
              <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg" style={{ border: '1px solid #fecaca' }}>{formError}</p>
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={mut.isPending} className="text-sm px-4 py-2 rounded-lg bg-gray-100 text-gray-800 border border-gray-300 hover:bg-gray-200 disabled:opacity-60">Hủy</button>
            <button type="submit" disabled={mut.isPending} className="text-sm px-4 py-2 rounded-lg bg-blue-100 text-blue-800 border border-blue-300 font-medium hover:bg-blue-200 disabled:opacity-60 inline-flex items-center gap-2">
              {mut.isPending && <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// CompleteMaintenanceModal — admin nhập cost + endDate khi hoàn thành
// -----------------------------------------------------------------------------
function CompleteMaintenanceModal({
  maintenance,
  onClose,
  onDone,
}: {
  maintenance: MaintenanceLog;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToastStore((s) => s.show);
  const [costStr, setCostStr] = useState(maintenance.cost != null ? String(maintenance.cost) : '');
  const [endDate, setEndDate] = useState(todayISO());
  const [buildingId, setBuildingId] = useState<number>(maintenance.equipmentBuildingId ?? 0);
  const [err, setErr] = useState('');

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: buildingApi.getAll,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const mut = useMutation({
    mutationFn: (payload: { cost?: number; endDate?: string; buildingId?: number }) => maintenanceApi.complete(maintenance.id, payload),
    onSuccess: onDone,
    onError: (e) => {
      const msg = getErrorMessage(e) ?? 'Không thể hoàn thành phiếu';
      setErr(msg);
      toast(msg, 'error');
    },
  });

  function handleSubmit() {
    let cost: number | undefined;
    if (costStr.trim()) {
      const n = Number(costStr);
      if (Number.isNaN(n) || n < 0) { setErr('Chi phí phải là số không âm'); return; }
      cost = n;
    }
    if (endDate < maintenance.startDate) { setErr('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu'); return; }
    if (!buildingId) { setErr('Vui lòng chọn vị trí cho thiết bị'); return; }
    mut.mutate({ cost, endDate, buildingId });
  }

  const buildingChanged = buildingId !== (maintenance.equipmentBuildingId ?? 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !mut.isPending && onClose()}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-gray-900 mb-1">Hoàn thành phiếu bảo trì</h3>
        <p className="text-sm text-gray-600 mb-4">
          Xác nhận hoàn thành bảo trì <span className="font-medium text-gray-900">"{maintenance.equipmentName}"</span>. Thiết bị sẽ chuyển về trạng thái <span className="font-medium">Sẵn sàng</span>.
        </p>

        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Chi phí <span className="text-gray-400 font-normal">(VNĐ, tùy chọn)</span></label>
            <MoneyInput value={costStr} onChange={(raw) => { setCostStr(raw); setErr(''); }} className={inputCls} style={borderStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Ngày kết thúc</label>
            <input type="date" lang="en-GB" value={endDate} onChange={(e) => { setEndDate(e.target.value); setErr(''); }} className={inputCls} style={borderStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Vị trí thiết bị sau bảo trì
              {maintenance.equipmentBuildingName && (
                <span className="ml-1 text-gray-400 font-normal">(hiện tại: {maintenance.equipmentBuildingName})</span>
              )}
            </label>
            <select
              value={buildingId || ''}
              onChange={(e) => { setBuildingId(Number(e.target.value)); setErr(''); }}
              className={`${inputCls} cursor-pointer`}
              style={borderStyle}
            >
              <option value="">-- Chọn khu --</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            {buildingChanged && buildingId > 0 && (
              <p className="text-[11px] text-blue-600 mt-1">
                Thiết bị sẽ được chuyển sang khu mới sau khi xác nhận.
              </p>
            )}
          </div>
        </div>

        {err && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3" style={{ border: '1px solid #fecaca' }}>{err}</p>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} disabled={mut.isPending} className="h-9 px-4 rounded-lg bg-gray-100 text-gray-800 border border-gray-300 text-sm hover:bg-gray-200 disabled:opacity-60">Hủy</button>
          <button onClick={handleSubmit} disabled={mut.isPending} autoFocus className="h-9 px-4 rounded-lg bg-green-100 text-green-800 border border-green-300 text-sm font-semibold hover:bg-green-200 disabled:opacity-60 inline-flex items-center gap-2">
            {mut.isPending && <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
            Xác nhận hoàn thành
          </button>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// CancelMaintenanceModal — admin nhập lý do hủy
// -----------------------------------------------------------------------------
function CancelMaintenanceModal({
  maintenance,
  onClose,
  onDone,
}: {
  maintenance: MaintenanceLog;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToastStore((s) => s.show);
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const mut = useMutation({
    mutationFn: (r: string) => maintenanceApi.cancel(maintenance.id, r),
    onSuccess: onDone,
    onError: (e) => {
      const msg = getErrorMessage(e) ?? 'Không thể hủy phiếu';
      setErr(msg);
      toast(msg, 'error');
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !mut.isPending && onClose()}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-gray-900 mb-1">Hủy phiếu bảo trì</h3>
        <p className="text-sm text-gray-600 mb-4">
          Hủy phiếu bảo trì cho <span className="font-medium text-gray-900">"{maintenance.equipmentName}"</span>? Thiết bị sẽ chuyển về <span className="font-medium">Sẵn sàng</span>.
        </p>

        <label className="block text-xs font-medium text-gray-700 mb-1">Lý do hủy <span className="text-gray-400 font-normal">(tùy chọn)</span></label>
        <textarea
          rows={3}
          value={reason}
          onChange={(e) => { setReason(e.target.value); setErr(''); }}
          placeholder="VD: Không cần thiết nữa..."
          className={`${inputCls} resize-none`}
          style={borderStyle}
          autoFocus
        />

        {err && <p className="mt-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg" style={{ border: '1px solid #fecaca' }}>{err}</p>}

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} disabled={mut.isPending} className="h-9 px-4 rounded-lg bg-gray-100 text-gray-800 border border-gray-300 text-sm hover:bg-gray-200 disabled:opacity-60">Đóng</button>
          <button onClick={() => mut.mutate(reason.trim())} disabled={mut.isPending} className="h-9 px-4 rounded-lg bg-red-100 text-red-800 border border-red-300 text-sm font-semibold hover:bg-red-200 disabled:opacity-60 inline-flex items-center gap-2">
            {mut.isPending && <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
            Xác nhận hủy
          </button>
        </div>
      </div>
    </div>
  );
}
