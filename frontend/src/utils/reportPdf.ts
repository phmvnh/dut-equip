// Xuất báo cáo dạng bảng ra PDF — mở cửa sổ HTML rồi window.print().
// Cùng pattern & style header/chữ ký với compensationPdf.ts / disposalPdf.ts để đồng bộ phiếu.
import type { ReportColumn, ReportMeta, ReportSummary } from './reportData';

const esc = (s?: string | number | null) =>
  String(s ?? '').replace(/[&<>"']/g, (ch) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string));

export interface ReportPeriod {
  from: string; // YYYY-MM-DD
  to: string;
}

export function printReportPDF<T>(
  meta: ReportMeta,
  columns: ReportColumn<T>[],
  rows: T[],
  summary: ReportSummary[],
  period?: ReportPeriod,
) {
  const w = window.open('', '_blank', 'width=1100,height=800');
  if (!w) {
    alert('Trình duyệt chặn cửa sổ pop-up. Vui lòng cho phép pop-up để xuất PDF.');
    return;
  }

  const now = new Date();
  const day = now.getDate();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const fmtVnDate = (d: string) => (d ? new Date(d).toLocaleDateString('vi-VN') : '');
  const periodText = period && (period.from || period.to)
    ? `Kỳ báo cáo: ${esc(fmtVnDate(period.from) || '…')} — ${esc(fmtVnDate(period.to) || '…')}`
    : '';

  const thead = columns.map((c) => `<th>${esc(c.header)}</th>`).join('');
  const tbody = rows.length
    ? rows
        .map(
          (row) =>
            `<tr>${columns
              .map((c) => `<td class="${c.numeric ? 'num' : ''}">${esc(c.value(row))}</td>`)
              .join('')}</tr>`,
        )
        .join('')
    : `<tr><td colspan="${columns.length}" class="empty">Không có dữ liệu trong kỳ báo cáo</td></tr>`;

  const summaryHtml = summary
    .map((s) => `<span class="sum-item"><b>${esc(s.label)}:</b> ${esc(s.value)}</span>`)
    .join('');

  w.document.write(`<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>${esc(meta.title)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: 'Times New Roman', Times, serif;
    margin: 0; padding: 14mm 14mm; color: #000; font-size: 11pt; line-height: 1.35;
  }
  .header { width: 100%; margin-bottom: 8px; }
  .header td { vertical-align: top; padding: 0; }
  .header .left, .header .right { text-align: center; width: 50%; }
  .header .name { font-weight: bold; text-transform: uppercase; font-size: 11pt; }
  .header .motto { font-weight: bold; font-style: italic; font-size: 11pt; }

  .title { text-align: center; font-weight: bold; font-size: 16pt; text-transform: uppercase; margin: 18px 0 4px; }
  .period { text-align: center; font-size: 11pt; font-style: italic; margin-bottom: 12px; }

  .summary { margin: 10px 0; font-size: 11pt; }
  .summary .sum-item { display: inline-block; margin-right: 22px; }

  table.data { width: 100%; border-collapse: collapse; margin-top: 6px; }
  table.data th, table.data td { border: 1px solid #444; padding: 4px 6px; font-size: 10pt; }
  table.data th { background: #e8eef7; font-weight: bold; text-align: left; }
  table.data td.num { text-align: right; white-space: nowrap; }
  table.data td.empty { text-align: center; font-style: italic; color: #666; padding: 16px; }
  table.data tbody tr:nth-child(even) { background: #f7f9fc; }

  .date-line { text-align: right; font-style: italic; margin-top: 18px; font-size: 11pt; }
  .date-line .dash { display: inline-block; min-width: 32px; border-bottom: 1px dotted #000; text-align: center; font-style: normal; }
  table.signs { width: 100%; margin-top: 6px; border-collapse: collapse; }
  table.signs td { width: 50%; text-align: center; vertical-align: top; padding: 6px 4px; }
  .sign-title { font-weight: bold; text-transform: uppercase; font-size: 11pt; }
  .sign-note { font-style: italic; font-size: 10pt; }
  .sign-space { height: 70px; }

  @media print {
    body { padding: 10mm; }
    @page { size: A4 landscape; margin: 0; }
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

  <div class="title">${esc(meta.title)}</div>
  ${periodText ? `<div class="period">${periodText}</div>` : '<div class="period"></div>'}

  <div class="summary">${summaryHtml}</div>

  <table class="data">
    <thead><tr>${thead}</tr></thead>
    <tbody>${tbody}</tbody>
  </table>

  <div class="date-line">
    Đà Nẵng, ngày <span class="dash">${day}</span> tháng <span class="dash">${month}</span> năm <span class="dash">${year}</span>
  </div>
  <table class="signs">
    <tr>
      <td>
        <div class="sign-title">Người lập báo cáo</div>
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
