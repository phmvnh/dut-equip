import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { maintenanceApi } from '../api/maintenanceApi';
import { equipApi } from '../api/equipApi';
import { useToastStore } from '../store/toastStore';
import MoneyInput from './MoneyInput';
import type { Equipment } from '../types/equipment';
import type { MaintenanceLog, MaintenanceCreatePayload } from '../types/maintenance';

interface PresetEquipment {
  equipmentId: number;
  equipmentCode: string;
  equipmentName: string;
  description?: string;
}

interface Props {
  preset?: PresetEquipment;
  onClose: () => void;
  onSuccess?: (created: MaintenanceLog) => void;
}

const inputCls =
  'w-full px-3 py-2 text-sm rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white';
const borderStyle = { border: '1px solid #e5e7eb' };

const STATUS_PILL: Record<string, { label: string; bg: string; color: string }> = {
  AVAILABLE:   { label: 'Sẵn sàng',  bg: '#dcfce7', color: '#15803d' },
  BORROWED:    { label: 'Đang mượn', bg: '#dbeafe', color: '#1d4ed8' },
  MAINTENANCE: { label: 'Bảo trì',   bg: '#fef9c3', color: '#a16207' },
  BROKEN:      { label: 'Hỏng',      bg: '#fee2e2', color: '#b91c1c' },
};

function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// --- Date input dd/mm/yyyy ---
// Native <input type="date"> dùng OS locale → trên máy en-US sẽ hiển thị mm/dd/yyyy
// Bỏ native, dùng text + auto-mask để force format dd/mm/yyyy
function isoToDisplay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

function displayToIso(display: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(display);
  if (!m) return '';
  const dd = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const yyyy = parseInt(m[3], 10);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yyyy < 1900) return '';
  // Sanity check ngày tồn tại (vd 31/02 không hợp lệ)
  const d = new Date(yyyy, mm - 1, dd);
  if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return '';
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

function maskDate(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function DateField({
  value,
  onChange,
  className,
  style,
}: {
  value: string;
  onChange: (iso: string) => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [display, setDisplay] = useState(isoToDisplay(value));

  // Sync khi parent đổi value (vd reset form)
  useEffect(() => { setDisplay(isoToDisplay(value)); }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskDate(e.target.value);
    setDisplay(masked);
    if (masked === '') {
      onChange('');
      return;
    }
    const iso = displayToIso(masked);
    if (iso) onChange(iso);
  };

  const handleBlur = () => {
    if (display && !displayToIso(display)) {
      // Invalid → revert về giá trị parent
      setDisplay(isoToDisplay(value));
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder="dd/mm/yyyy"
      maxLength={10}
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
      style={style}
    />
  );
}

function getErrorMessage(err: unknown): string | undefined {
  return (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
}

export default function MaintenanceFormModal({ preset, onClose, onSuccess }: Props) {
  const qc = useQueryClient();
  const toast = useToastStore((s) => s.show);

  // Khi không có preset → admin tự search thiết bị
  const [selectedEquip, setSelectedEquip] = useState<{ id: number; code: string; name: string; status?: string } | null>(
    preset ? { id: preset.equipmentId, code: preset.equipmentCode, name: preset.equipmentName } : null
  );
  const [keyword, setKeyword] = useState('');
  const [debouncedKw, setDebouncedKw] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  // Form state
  const [technicianName, setTechnicianName] = useState('');
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState('');
  const [costStr, setCostStr] = useState('');
  const [description, setDescription] = useState(preset?.description ?? '');
  const [formError, setFormError] = useState('');

  // Debounce keyword 300ms
  useEffect(() => {
    if (preset) return;
    const t = setTimeout(() => setDebouncedKw(keyword.trim()), 300);
    return () => clearTimeout(t);
  }, [keyword, preset]);

  const { data: equips = [], isFetching } = useQuery({
    queryKey: ['equips', 'maintenance-search', debouncedKw],
    queryFn: () => equipApi.getAll({ keyword: debouncedKw || undefined }),
    enabled: !preset && (debouncedKw.length >= 1),
  });

  // Loại bỏ thiết bị BORROWED (BE từ chối tạo phiếu BT cho thiết bị đang mượn)
  const suggestions = useMemo(
    () => equips.filter((e) => e.status !== 'BORROWED').slice(0, 8),
    [equips]
  );

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const createMut = useMutation({
    mutationFn: (payload: MaintenanceCreatePayload) => maintenanceApi.create(payload),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['maintenance'] });
      qc.invalidateQueries({ queryKey: ['equips'] });
      qc.invalidateQueries({ queryKey: ['borrows'] });
      toast('Đã tạo phiếu bảo trì', 'success');
      onSuccess?.(created);
      onClose();
    },
    onError: (err) => {
      const msg = getErrorMessage(err) ?? 'Không thể tạo phiếu bảo trì';
      setFormError(msg);
      toast(msg, 'error');
    },
  });

  function selectEquipment(eq: Equipment) {
    setSelectedEquip({ id: eq.id, code: eq.code, name: eq.name, status: eq.status });
    setKeyword('');
    setShowDropdown(false);
    setFormError('');
  }

  function clearSelected() {
    setSelectedEquip(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedEquip) { setFormError('Vui lòng chọn thiết bị cần bảo trì'); return; }
    if (!startDate)     { setFormError('Vui lòng chọn ngày bắt đầu'); return; }
    if (!description.trim()) { setFormError('Vui lòng nhập mô tả nội dung bảo trì'); return; }
    if (endDate && endDate < startDate) { setFormError('Ngày dự kiến kết thúc phải sau ngày bắt đầu'); return; }

    let cost: number | undefined;
    if (costStr.trim()) {
      const n = Number(costStr);
      if (Number.isNaN(n) || n < 0) { setFormError('Chi phí phải là số không âm'); return; }
      cost = n;
    }

    createMut.mutate({
      equipmentId: selectedEquip.id,
      technicianName: technicianName.trim() || undefined,
      startDate,
      endDate: endDate || undefined,
      description: description.trim(),
      cost,
    });
  }

  const busy = createMut.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !busy && onClose()}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Tạo phiếu bảo trì</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-60"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-4">
            {/* Section thiết bị */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Thiết bị <span className="text-red-500">*</span>
              </label>

              {selectedEquip ? (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-blue-50 border border-blue-100">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <path strokeLinecap="round" d="M8 21h8M12 17v4" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{selectedEquip.name}</p>
                    <p className="text-xs text-gray-500">{selectedEquip.code}</p>
                  </div>
                  {selectedEquip.status && STATUS_PILL[selectedEquip.status] && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{
                        backgroundColor: STATUS_PILL[selectedEquip.status].bg,
                        color: STATUS_PILL[selectedEquip.status].color,
                      }}
                    >
                      {STATUS_PILL[selectedEquip.status].label}
                    </span>
                  )}
                  {/* Cho phép đổi thiết bị chỉ khi entry 3 (không có preset) */}
                  {!preset && (
                    <button
                      type="button"
                      onClick={clearSelected}
                      className="text-xs text-blue-700 hover:text-blue-900 font-medium"
                    >
                      Đổi
                    </button>
                  )}
                </div>
              ) : (
                <div className="relative" ref={searchBoxRef}>
                  <input
                    type="text"
                    autoFocus
                    value={keyword}
                    onChange={(e) => { setKeyword(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Tìm theo mã hoặc tên thiết bị..."
                    className={inputCls}
                    style={borderStyle}
                  />
                  {showDropdown && debouncedKw.length >= 1 && (
                    <div
                      className="absolute z-10 mt-1 left-0 right-0 bg-white rounded-lg shadow-lg max-h-60 overflow-y-auto"
                      style={borderStyle}
                    >
                      {isFetching ? (
                        <div className="px-3 py-3 text-xs text-gray-400">Đang tìm...</div>
                      ) : suggestions.length === 0 ? (
                        <div className="px-3 py-3 text-xs text-gray-400">
                          Không tìm thấy thiết bị phù hợp (đã ẩn thiết bị đang được mượn)
                        </div>
                      ) : (
                        suggestions.map((eq) => {
                          const pill = STATUS_PILL[eq.status] ?? STATUS_PILL.AVAILABLE;
                          return (
                            <button
                              key={eq.id}
                              type="button"
                              onClick={() => selectEquipment(eq as Equipment)}
                              className="w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center gap-3 border-b border-gray-50 last:border-0"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 truncate">{eq.name}</div>
                                <div className="text-xs text-gray-500">{eq.code}</div>
                              </div>
                              <span
                                className="text-[11px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
                                style={{ backgroundColor: pill.bg, color: pill.color }}
                              >
                                {pill.label}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Người thực hiện */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Người thực hiện</label>
              <input
                type="text"
                value={technicianName}
                onChange={(e) => setTechnicianName(e.target.value)}
                placeholder="VD: Trung tâm Kỹ thuật DUT"
                className={inputCls}
                style={borderStyle}
                maxLength={200}
              />
            </div>

            {/* Ngày BĐ + Dự kiến KT */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Ngày bắt đầu <span className="text-red-500">*</span>
                </label>
                <DateField value={startDate} onChange={setStartDate} className={inputCls} style={borderStyle} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Dự kiến kết thúc</label>
                <DateField value={endDate} onChange={setEndDate} className={inputCls} style={borderStyle} />
              </div>
            </div>

            {/* Chi phí */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Chi phí: <span className="text-gray-400 font-normal">(VNĐ)</span>
              </label>
              <MoneyInput
                value={costStr}
                onChange={setCostStr}
                placeholder="Chi phí dự tính cho việc bảo trì (nếu có)"
                className={inputCls}
                style={borderStyle}
              />
            </div>

            {/* Mô tả */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Lí do bảo trì <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả chi tiết về lý do bảo trì..."
                className={`${inputCls} resize-none`}
                style={borderStyle}
              />
            </div>

            {formError && (
              <p
                className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg"
                style={{ border: '1px solid #fecaca' }}
              >
                {formError}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="text-sm px-4 py-2 rounded-lg bg-gray-100 text-gray-800 border border-gray-300 hover:bg-gray-200 disabled:opacity-60"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={busy}
              className="text-sm px-4 py-2 rounded-lg bg-blue-100 text-blue-800 border border-blue-300 font-medium hover:bg-blue-200 disabled:opacity-60 inline-flex items-center gap-2"
            >
              {busy && <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
              Tạo phiếu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
