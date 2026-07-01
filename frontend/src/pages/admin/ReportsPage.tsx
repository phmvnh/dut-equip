import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { borrowApi } from '../../api/borrowApi';
import { maintenanceApi } from '../../api/maintenanceApi';
import { equipApi } from '../../api/equipApi';
import { procurementApi } from '../../api/procurementApi';
import {
  REPORT_META,
  BORROW_COLUMNS,
  MAINTENANCE_COLUMNS,
  INVENTORY_COLUMNS,
  PROCUREMENT_COLUMNS,
  filterBorrows,
  filterMaintenance,
  sortInventory,
  filterProcurement,
  borrowSummary,
  maintenanceSummary,
  inventorySummary,
  procurementSummary,
  type ReportColumn,
  type ReportKey,
  type ReportSummary,
} from '../../utils/reportData';
import { printReportPDF, type ReportPeriod } from '../../utils/reportPdf';
import { exportReportExcel } from '../../utils/reportExcel';
import { useToastStore } from '../../store/toastStore';

const cardStyle: React.CSSProperties = {
  borderRadius: 16,
  border: '1px solid rgba(0,0,0,0.04)',
  boxShadow: '0 1px 2px rgba(0,0,0,0.03), 0 12px 28px -18px rgba(0,0,0,0.14)',
};

const REPORT_TABS: { key: ReportKey; label: string }[] = [
  { key: 'borrow', label: 'Mượn / trả' },
  { key: 'maintenance', label: 'Bảo trì' },
  { key: 'inventory', label: 'Tồn kho' },
  { key: 'procurement', label: 'Mua sắm' },
];

function toYmd(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

// Gói dữ liệu đã sẵn sàng để render preview & xuất file — đóng gói closure xuất theo
// đúng kiểu cột của từng loại báo cáo (tránh union type khó chịu khi gọi generic).
interface ReportView {
  columns: ReportColumn<unknown>[];
  rows: unknown[];
  summary: ReportSummary[];
  exportPdf: () => void;
  exportExcel: () => void;
}

export default function ReportsPage() {
  const showToast = useToastStore((s) => s.show);

  const today = new Date();
  const [reportKey, setReportKey] = useState<ReportKey>('borrow');
  const [from, setFrom] = useState(toYmd(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [to, setTo] = useState(toYmd(today));

  const usesPeriod = reportKey !== 'inventory';

  const borrowsQ = useQuery({
    queryKey: ['reports', 'borrows'],
    queryFn: () => borrowApi.getAll(),
    enabled: reportKey === 'borrow',
  });
  const maintenanceQ = useQuery({
    queryKey: ['reports', 'maintenance'],
    queryFn: () => maintenanceApi.getAll(),
    enabled: reportKey === 'maintenance',
  });
  const equipsQ = useQuery({
    queryKey: ['reports', 'equips'],
    queryFn: () => equipApi.getAll(),
    enabled: reportKey === 'inventory',
  });
  const procurementsQ = useQuery({
    queryKey: ['reports', 'procurements'],
    queryFn: () => procurementApi.getAll(),
    enabled: reportKey === 'procurement',
  });

  const loading =
    (reportKey === 'borrow' && borrowsQ.isLoading) ||
    (reportKey === 'maintenance' && maintenanceQ.isLoading) ||
    (reportKey === 'inventory' && equipsQ.isLoading) ||
    (reportKey === 'procurement' && procurementsQ.isLoading);

  const view: ReportView = useMemo(() => {
    const period: ReportPeriod = { from, to };
    if (reportKey === 'borrow') {
      const rows = filterBorrows(borrowsQ.data ?? [], from, to);
      const summary = borrowSummary(rows);
      return {
        columns: BORROW_COLUMNS as ReportColumn<unknown>[],
        rows,
        summary,
        exportPdf: () => printReportPDF(REPORT_META.borrow, BORROW_COLUMNS, rows, summary, period),
        exportExcel: () => exportReportExcel(REPORT_META.borrow, BORROW_COLUMNS, rows, summary, period),
      };
    }
    if (reportKey === 'maintenance') {
      const rows = filterMaintenance(maintenanceQ.data ?? [], from, to);
      const summary = maintenanceSummary(rows);
      return {
        columns: MAINTENANCE_COLUMNS as ReportColumn<unknown>[],
        rows,
        summary,
        exportPdf: () => printReportPDF(REPORT_META.maintenance, MAINTENANCE_COLUMNS, rows, summary, period),
        exportExcel: () => exportReportExcel(REPORT_META.maintenance, MAINTENANCE_COLUMNS, rows, summary, period),
      };
    }
    if (reportKey === 'inventory') {
      const rows = sortInventory(equipsQ.data ?? []);
      const summary = inventorySummary(rows);
      return {
        columns: INVENTORY_COLUMNS as ReportColumn<unknown>[],
        rows,
        summary,
        exportPdf: () => printReportPDF(REPORT_META.inventory, INVENTORY_COLUMNS, rows, summary),
        exportExcel: () => exportReportExcel(REPORT_META.inventory, INVENTORY_COLUMNS, rows, summary),
      };
    }
    const rows = filterProcurement(procurementsQ.data ?? [], from, to);
    const summary = procurementSummary(rows);
    return {
      columns: PROCUREMENT_COLUMNS as ReportColumn<unknown>[],
      rows,
      summary,
      exportPdf: () => printReportPDF(REPORT_META.procurement, PROCUREMENT_COLUMNS, rows, summary, period),
      exportExcel: () => exportReportExcel(REPORT_META.procurement, PROCUREMENT_COLUMNS, rows, summary, period),
    };
  }, [reportKey, from, to, borrowsQ.data, maintenanceQ.data, equipsQ.data, procurementsQ.data]);

  const handleExport = (fn: () => void) => {
    if (loading) return;
    if (view.rows.length === 0) {
      showToast('Không có dữ liệu để xuất trong kỳ đã chọn', 'error');
      return;
    }
    fn();
  };

  return (
    <div className="space-y-6">
      {/* Thanh điều khiển: loại báo cáo + khoảng ngày + nút xuất */}
      <div className="bg-white" style={cardStyle}>
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold tracking-tight text-gray-900">Xuất báo cáo</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Chọn loại báo cáo và kỳ thống kê, sau đó xuất ra PDF (in/lưu hồ sơ) hoặc Excel.
          </p>
        </div>

        <div className="px-5 py-4 flex flex-wrap items-end gap-4">
          {/* Loại báo cáo — segmented */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Loại báo cáo</label>
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
              {REPORT_TABS.map((tab) => {
                const active = tab.key === reportKey;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setReportKey(tab.key)}
                    className="text-sm px-4 py-2 font-medium transition-colors"
                    style={{
                      backgroundColor: active ? '#2563eb' : 'transparent',
                      color: active ? 'white' : '#6b7280',
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Khoảng ngày — ẩn với báo cáo tồn kho */}
          {usesPeriod && (
            <>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Từ ngày</label>
                <input
                  type="date"
                  value={from}
                  max={to}
                  onChange={(e) => setFrom(e.target.value)}
                  className="text-sm px-3 h-9 rounded-lg bg-white outline-none focus:border-blue-500"
                  style={{ border: '1px solid #d1d5db' }}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Đến ngày</label>
                <input
                  type="date"
                  value={to}
                  min={from}
                  onChange={(e) => setTo(e.target.value)}
                  className="text-sm px-3 h-9 rounded-lg bg-white outline-none focus:border-blue-500"
                  style={{ border: '1px solid #d1d5db' }}
                />
              </div>
            </>
          )}

          {/* Nút xuất — đẩy về phải */}
          <div className="ml-auto flex items-end gap-2">
            <button
              type="button"
              onClick={() => handleExport(view.exportPdf)}
              disabled={loading}
              className="text-sm px-4 h-9 rounded-lg font-medium text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#2563eb' }}
            >
              Xuất PDF
            </button>
            <button
              type="button"
              onClick={() => handleExport(view.exportExcel)}
              disabled={loading}
              className="text-sm px-4 h-9 rounded-lg font-medium bg-blue-100 text-blue-800 border border-blue-300 transition-colors hover:bg-blue-200 disabled:opacity-50"
            >
              Xuất Excel
            </button>
          </div>
        </div>

        {/* Tổng kết nhanh */}
        <div className="px-5 pb-4 flex flex-wrap gap-x-8 gap-y-2">
          {view.summary.map((s) => (
            <div key={s.label} className="text-sm">
              <span className="text-gray-500">{s.label}: </span>
              <span className="font-semibold text-gray-900 tabular-nums">{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bảng xem trước */}
      <div className="bg-white" style={cardStyle}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <h2 className="font-semibold tracking-tight text-gray-900">Xem trước</h2>
          <span className="text-xs text-gray-500">
            {loading ? 'Đang tải…' : `${view.rows.length} dòng`}
          </span>
        </div>
        <div className="overflow-auto" style={{ maxHeight: 540 }}>
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 bg-gray-50 sticky top-0 z-10">
              <tr>
                {view.columns.map((c) => (
                  <th key={c.header} className="px-4 py-2.5 font-medium whitespace-nowrap">
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td className="px-4 py-4 text-gray-400 text-xs" colSpan={view.columns.length}>
                    Đang tải dữ liệu…
                  </td>
                </tr>
              )}
              {!loading && view.rows.length === 0 && (
                <tr>
                  <td className="px-4 py-4 text-gray-400 text-xs" colSpan={view.columns.length}>
                    Không có dữ liệu trong kỳ báo cáo đã chọn
                  </td>
                </tr>
              )}
              {!loading &&
                view.rows.map((row, i) => (
                  <tr key={i} className="border-t border-gray-100 hover:bg-blue-50/40">
                    {view.columns.map((c) => (
                      <td
                        key={c.header}
                        className={`px-4 py-2.5 whitespace-nowrap ${c.numeric ? 'text-right tabular-nums' : 'text-gray-700'}`}
                      >
                        {c.value(row)}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
