import type { EquipmentStatus, FilterParams } from '../types/equipment';
import type { EquipTypeResponse } from '../api/equipTypeApi';

interface FilterBarProps {
  filters: FilterParams;
  onChange: (filters: FilterParams) => void;
  search: string;
  onSearch: (value: string) => void;
  equipTypes: EquipTypeResponse[];
}

const STATUSES: { value: 'Tất cả' | EquipmentStatus; label: string }[] = [
  { value: 'Tất cả', label: 'Tất cả trạng thái' },
  { value: 'AVAILABLE', label: 'Sẵn sàng' },
  { value: 'BORROWED', label: 'Đang mượn' },
  { value: 'MAINTENANCE', label: 'Bảo trì' },
  { value: 'BROKEN', label: 'Hỏng' },
];

export default function FilterBar({ filters, onChange, search, onSearch, equipTypes }: FilterBarProps) {
  const selectBase =
    'h-9 pl-3 pr-8 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors duration-150 cursor-pointer appearance-none bg-no-repeat bg-[right_10px_center] bg-[length:16px]';
  const activeSelect = 'border-blue-500 bg-blue-50 text-blue-700 font-medium';
  const idleSelect = 'border-gray-200 bg-white text-gray-700 hover:border-gray-300';
  const hasFilter = !!(filters.equipTypeId || filters.status || search.trim());

  return (
    <div className="sticky top-16 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center gap-3">

        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
            viewBox="0 0 20 20" fill="currentColor"
          >
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc mã thiết bị..."
            className="w-full h-9 pl-9 pr-4 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white transition-colors duration-150"
          />
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-gray-200 flex-shrink-0" />

        {/* Loại thiết bị */}
        <div className="relative flex-shrink-0">
          <select
            value={filters.equipTypeId ?? ''}
            onChange={(e) =>
              onChange({ ...filters, equipTypeId: e.target.value ? Number(e.target.value) : undefined })
            }
            className={`${selectBase} ${filters.equipTypeId ? activeSelect : idleSelect}`}
          >
            <option value="">Tất cả loại</option>
            {equipTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </div>

        {/* Trạng thái */}
        <div className="relative flex-shrink-0">
          <select
            value={filters.status ?? 'Tất cả'}
            onChange={(e) => {
              const v = e.target.value;
              onChange({ ...filters, status: v === 'Tất cả' ? undefined : (v as EquipmentStatus) });
            }}
            className={`${selectBase} ${filters.status ? activeSelect : idleSelect}`}
          >
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </div>

        {/* Clear */}
        {hasFilter && (
          <button
            onClick={() => { onChange({}); onSearch(''); }}
            className="flex-shrink-0 h-9 px-3 rounded-lg text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors duration-150 flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
            Xoá
          </button>
        )}
      </div>
    </div>
  );
}
