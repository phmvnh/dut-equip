// Xuất báo cáo ra Excel (.xlsx) bằng SheetJS. Dùng CHUNG định nghĩa cột với reportPdf.ts
// (ReportColumn) để hai định dạng luôn khớp.
import * as XLSX from 'xlsx';
import type { ReportColumn, ReportMeta, ReportSummary } from './reportData';
import type { ReportPeriod } from './reportPdf';

export function exportReportExcel<T>(
  meta: ReportMeta,
  columns: ReportColumn<T>[],
  rows: T[],
  summary: ReportSummary[],
  period?: ReportPeriod,
) {
  const fmtVnDate = (d: string) => (d ? new Date(d).toLocaleDateString('vi-VN') : '…');

  // Dựng bảng dạng mảng-2-chiều: tiêu đề → kỳ → tổng kết → header → dữ liệu.
  const aoa: (string | number)[][] = [];
  aoa.push([meta.title]);
  if (period && (period.from || period.to)) {
    aoa.push([`Kỳ báo cáo: ${fmtVnDate(period.from)} - ${fmtVnDate(period.to)}`]);
  }
  aoa.push([`Xuất ngày: ${new Date().toLocaleDateString('vi-VN')}`]);
  aoa.push([]); // dòng trống
  aoa.push(summary.map((s) => `${s.label}: ${s.value}`));
  aoa.push([]); // dòng trống

  aoa.push(columns.map((c) => c.header));
  rows.forEach((row) => aoa.push(columns.map((c) => c.value(row))));

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // Độ rộng cột tự động theo độ dài nội dung (giới hạn 10–40 ký tự)
  ws['!cols'] = columns.map((c) => {
    const maxLen = Math.max(
      c.header.length,
      ...rows.map((row) => String(c.value(row)).length),
    );
    return { wch: Math.min(40, Math.max(10, maxLen + 2)) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Báo cáo');

  const stamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `${meta.fileName}-${stamp}.xlsx`);
}
