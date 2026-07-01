// Xuất báo cáo dạng bảng ra PDF — mở cửa sổ HTML rồi window.print().
// Cùng pattern & style header/chữ ký với compensationPdf.ts / disposalPdf.ts để đồng bộ phiếu.
import type { ReportColumn, ReportMeta, ReportSummary } from './reportData';
import type { BorrowResponse } from '../api/borrowApi';

const PURPOSE_LABEL: Record<string, string> = {
  TEACHING: 'Giảng dạy', PRACTICE: 'Thực hành', RESEARCH: 'Nghiên cứu',
  CONFERENCE: 'Hội nghị', EXTRACURRICULAR: 'Ngoại khóa', OTHER: 'Khác',
};

function fmtVN(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

function openBienBan(title: string, soPhieu: string, body: string) {
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) { alert('Trình duyệt chặn pop-up. Vui lòng cho phép pop-up.'); return; }
  const now = new Date();
  w.document.write(`<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8">
<title>${title}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Times New Roman', Times, serif; margin: 0; padding: 16mm 18mm; color: #000; font-size: 12pt; line-height: 1.5; }
  .header-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  .header-table td { vertical-align: top; width: 50%; text-align: center; }
  .bold-upper { font-weight: bold; text-transform: uppercase; font-size: 11pt; }
  .italic-bold { font-weight: bold; font-style: italic; font-size: 11pt; }
  .title { text-align: center; font-weight: bold; font-size: 16pt; text-transform: uppercase; margin: 16px 0 4px; }
  .so-phieu { text-align: center; font-style: italic; font-size: 11pt; margin-bottom: 16px; }
  table.info { width: 100%; border-collapse: collapse; margin: 10px 0; }
  table.info td { padding: 4px 6px; font-size: 11pt; vertical-align: top; }
  table.info td:first-child { width: 38%; font-weight: bold; }
  .section-title { font-weight: bold; font-size: 12pt; margin: 14px 0 4px; border-bottom: 1px solid #333; padding-bottom: 2px; }
  .note-box { border: 1px solid #888; border-radius: 4px; padding: 8px 12px; min-height: 60px; margin: 6px 0; font-size: 11pt; }
  .date-line { text-align: right; font-style: italic; margin-top: 20px; }
  .date-line .dash { display: inline-block; min-width: 28px; border-bottom: 1px dotted #000; text-align: center; font-style: normal; }
  table.signs { width: 100%; margin-top: 8px; border-collapse: collapse; }
  table.signs td { width: 50%; text-align: center; padding: 6px 4px; }
  .sign-title { font-weight: bold; text-transform: uppercase; font-size: 11pt; }
  .sign-note { font-style: italic; font-size: 10pt; }
  .sign-space { height: 80px; }
  @media print { body { padding: 10mm; } @page { size: A4 portrait; margin: 0; } }
</style></head><body>
  <table class="header-table">
    <tr>
      <td><div class="bold-upper">Trường Đại học Bách khoa</div><div class="bold-upper">Phòng Quản lý Tài sản công</div></td>
      <td><div class="bold-upper">Cộng hòa Xã hội Chủ nghĩa Việt Nam</div><div class="italic-bold">Độc lập - Tự do - Hạnh phúc</div></td>
    </tr>
  </table>
  <div class="title">${title}</div>
  <div class="so-phieu">Số phiếu: ${soPhieu}</div>
  ${body}
  <div class="date-line">Đà Nẵng, ngày <span class="dash">${now.getDate()}</span> tháng <span class="dash">${now.getMonth() + 1}</span> năm <span class="dash">${now.getFullYear()}</span></div>
  <table class="signs">
    <tr>
      <td><div class="sign-title">Người mượn</div><div class="sign-note">(Ký, ghi rõ họ tên)</div><div class="sign-space"></div></td>
      <td><div class="sign-title">Cán bộ quản lý tài sản</div><div class="sign-note">(Ký, ghi rõ họ tên)</div><div class="sign-space"></div></td>
    </tr>
  </table>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 200); };<\/script>
</body></html>`);
  w.document.close();
}

// Biên bản Bàn giao thiết bị — xuất khi đơn APPROVED
export function generateHandoverPdf(b: BorrowResponse) {
  const body = `
    <div class="section-title">I. THÔNG TIN THIẾT BỊ BÀN GIAO</div>
    <table class="info">
      <tr><td>Tên thiết bị:</td><td>${b.equipmentName}</td></tr>
      <tr><td>Mã thiết bị:</td><td>${b.equipmentCode}</td></tr>
      <tr><td>Khu sử dụng:</td><td>${b.buildingName ?? '—'}</td></tr>
      <tr><td>Phòng:</td><td>${b.room ?? '—'}</td></tr>
    </table>
    <div class="section-title">II. THÔNG TIN NGƯỜI MƯỢN</div>
    <table class="info">
      <tr><td>Họ và tên:</td><td>${b.userName}</td></tr>
      <tr><td>Email:</td><td>${b.userEmail}</td></tr>
      <tr><td>Số điện thoại:</td><td>${b.userPhone ?? '—'}</td></tr>
    </table>
    <div class="section-title">III. THỜI GIAN & MỤC ĐÍCH</div>
    <table class="info">
      <tr><td>Ngày giờ mượn:</td><td>${fmtVN(b.borrowDateTime)}</td></tr>
      <tr><td>Ngày giờ trả dự kiến:</td><td>${fmtVN(b.returnDateTime)}</td></tr>
      <tr><td>Mục đích sử dụng:</td><td>${PURPOSE_LABEL[b.purpose ?? ''] ?? (b.purpose ?? '—')}</td></tr>
      ${b.purposeNote ? `<tr><td>Mô tả chi tiết:</td><td>${b.purposeNote}</td></tr>` : ''}
    </table>
    <div class="section-title">IV. TÌNH TRẠNG THIẾT BỊ KHI BÀN GIAO</div>
    <div class="note-box">${b.preBorrowConditionNote ?? '(Chưa ghi nhận)'}</div>
    <div class="section-title">V. GHI CHÚ</div>
    <div class="note-box">${b.note ?? ''}</div>
    <p style="font-size:11pt; margin-top:10px;">Người mượn cam kết sử dụng đúng mục đích, bảo quản thiết bị và trả đúng hạn. Nếu có hư hỏng sẽ chịu trách nhiệm bồi thường theo quy định.</p>
  `;
  openBienBan('Biên bản bàn giao thiết bị', `BGT-${b.id}`, body);
}

// Biên bản Thu hồi thiết bị — xuất khi đơn RETURNED
export function generateReturnPdf(b: BorrowResponse) {
  const body = `
    <div class="section-title">I. THÔNG TIN THIẾT BỊ</div>
    <table class="info">
      <tr><td>Tên thiết bị:</td><td>${b.equipmentName}</td></tr>
      <tr><td>Mã thiết bị:</td><td>${b.equipmentCode}</td></tr>
    </table>
    <div class="section-title">II. THÔNG TIN NGƯỜI MượN</div>
    <table class="info">
      <tr><td>Họ và tên:</td><td>${b.userName}</td></tr>
      <tr><td>Email:</td><td>${b.userEmail}</td></tr>
      <tr><td>Số điện thoại:</td><td>${b.userPhone ?? '—'}</td></tr>
    </table>
    <div class="section-title">III. THỜI GIAN TRẢ</div>
    <table class="info">
      <tr><td>Ngày giờ mượn:</td><td>${fmtVN(b.borrowDateTime)}</td></tr>
      <tr><td>Hạn trả dự kiến:</td><td>${fmtVN(b.returnDateTime)}</td></tr>
      <tr><td>Thời gian trả thực tế:</td><td>${fmtVN(b.actualReturnDateTime)}</td></tr>
    </table>
    <div class="section-title">IV. TÌNH TRẠNG KHI BÀN GIAO BAN ĐẦU</div>
    <div class="note-box">${b.preBorrowConditionNote ?? '(Không ghi nhận)'}</div>
    <div class="section-title">V. TÌNH TRẠNG KHI TRẢ LẠI</div>
    <div class="note-box">${b.damageReported
      ? `Có hư hỏng — Mức độ: ${b.damageSeverity ?? '—'}<br>${b.damageDescription ?? ''}`
      : 'Thiết bị được trả trong tình trạng tốt, không có hư hỏng ghi nhận.'
    }</div>
    <p style="font-size:11pt; margin-top:10px;">Hai bên xác nhận thiết bị đã được bàn giao lại đầy đủ theo biên bản này.</p>
  `;
  openBienBan('Biên bản thu hồi thiết bị', `THT-${b.id}`, body);
}

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

  // Dòng "Tổng cộng" cuối bảng — chỉ hiện khi có cột khai báo total và có dữ liệu
  const hasTotals = rows.length > 0 && columns.some((c) => c.total);
  const tfoot = hasTotals
    ? `<tfoot><tr>${columns
        .map((c, i) =>
          c.total
            ? `<td class="num">${esc(c.total(rows))}</td>`
            : `<td>${i === 0 ? '<b>Tổng cộng</b>' : ''}</td>`,
        )
        .join('')}</tr></tfoot>`
    : '';

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
  table.data tfoot td { background: #e8eef7; font-weight: bold; }

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
    ${tfoot}
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
