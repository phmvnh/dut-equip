import type { Disposal } from '../types/disposal';
import { DISPOSAL_METHOD_LABELS } from '../types/disposal';

// 2 mẫu PDF cho quy trình thanh lý:
//  - printDisposalProposalPDF: Tờ trình đề nghị thanh lý (in ở PENDING để trình ký)
//  - printDisposalRecordPDF:   Biên bản thanh lý (in sau COMPLETED, dẫn chiếu số QĐ)
const esc = (s?: string | number | null) =>
  String(s ?? '').replace(/[&<>"']/g, (ch) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string));
const fmtVnDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('vi-VN') : '');
const fmtMoney = (v?: number | null) => (v != null ? Number(v).toLocaleString('vi-VN') + ' đ' : '—');
const methodLabel = (m?: string) => (m ? DISPOSAL_METHOD_LABELS[m as keyof typeof DISPOSAL_METHOD_LABELS] ?? m : '—');

const BASE_CSS = `
  * { box-sizing: border-box; }
  body { font-family: 'Times New Roman', Times, serif; margin: 0; padding: 18mm 20mm; color: #000; font-size: 13pt; line-height: 1.4; }
  .header { width: 100%; margin-bottom: 8px; }
  .header td { vertical-align: top; padding: 0; }
  .header .left, .header .right { text-align: center; width: 50%; }
  .header .name { font-weight: bold; text-transform: uppercase; font-size: 12pt; }
  .header .motto { font-weight: bold; font-style: italic; font-size: 12pt; }
  .title { text-align: center; font-weight: bold; font-size: 16pt; text-transform: uppercase; margin: 24px 0 4px; }
  .code-line { text-align: center; font-size: 12pt; margin-bottom: 16px; }
  .code-line .code-value { display: inline-block; min-width: 200px; border-bottom: 1px solid #000; padding: 0 8px; font-weight: bold; }
  .section { font-weight: bold; text-transform: uppercase; font-size: 12pt; margin: 14px 0 6px; }
  table.info { width: 100%; border-collapse: collapse; }
  table.info td { border: 1px solid #000; padding: 6px 8px; vertical-align: top; font-size: 12pt; }
  table.info td.lbl { font-weight: bold; width: 30%; background: #fafafa; white-space: nowrap; }
  .multiline { min-height: 50px; }
  .amount-big { font-size: 14pt; font-weight: bold; color: #b91c1c; }
  .date-line { text-align: right; font-style: italic; margin-top: 12px; }
  .date-line .dash { display: inline-block; min-width: 32px; border-bottom: 1px dotted #000; text-align: center; font-style: normal; }
  table.signs { width: 100%; margin-top: 10px; border-collapse: collapse; }
  table.signs td { width: 50%; text-align: center; vertical-align: top; padding: 6px 4px; }
  .sign-title { font-weight: bold; text-transform: uppercase; font-size: 11.5pt; }
  .sign-note { font-style: italic; font-size: 10.5pt; }
  .sign-space { height: 80px; }
  @media print { body { padding: 16mm; } @page { size: A4; margin: 0; } }
`;

const HEADER_HTML = `
  <table class="header"><tr>
    <td class="left"><div class="name">Trường Đại học Bách khoa</div><div class="name">Phòng Quản lý Tài sản công</div></td>
    <td class="right"><div class="name">Cộng hòa Xã hội Chủ nghĩa Việt Nam</div><div class="motto">Độc lập - Tự do - Hạnh phúc</div></td>
  </tr></table>`;

function dateLine() {
  const now = new Date();
  return `<div class="date-line">Đà Nẵng, ngày <span class="dash">${now.getDate()}</span> tháng <span class="dash">${now.getMonth() + 1}</span> năm <span class="dash">${now.getFullYear()}</span></div>`;
}

function openPrint(title: string, body: string) {
  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) {
    alert('Trình duyệt chặn cửa sổ pop-up. Vui lòng cho phép pop-up để xuất PDF.');
    return;
  }
  w.document.write(`<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><title>${esc(title)}</title>
<style>${BASE_CSS}</style></head><body>${body}
<script>window.onload=function(){setTimeout(function(){window.print();},200);};<\/script>
</body></html>`);
  w.document.close();
}

const equipInfoRows = (d: Disposal) => `
  <tr><td class="lbl">Mã thiết bị:</td><td>${esc(d.equipmentCode)}</td></tr>
  <tr><td class="lbl">Tên thiết bị:</td><td>${esc(d.equipmentName)}</td></tr>`;

// Tờ trình đề nghị thanh lý — in ở PENDING để trình lãnh đạo ký
export function printDisposalProposalPDF(d: Disposal) {
  const body = `
  ${HEADER_HTML}
  <div class="title">Tờ trình đề nghị thanh lý thiết bị</div>
  <div class="code-line">Số: <span class="code-value">${esc(d.code)}</span></div>

  <div class="section">I. Thông tin thiết bị</div>
  <table class="info">${equipInfoRows(d)}
    <tr><td class="lbl">Người lập đề nghị:</td><td>${esc(d.requestedByName)}</td></tr>
    <tr><td class="lbl">Hình thức đề xuất:</td><td>${esc(methodLabel(d.proposedMethod))}</td></tr>
    <tr><td class="lbl">Giá trị còn lại (ước tính):</td><td>${fmtMoney(d.estimatedValue)}</td></tr>
  </table>

  <div class="section">II. Lý do đề nghị thanh lý</div>
  <table class="info"><tr><td class="multiline" style="white-space:pre-wrap;">${esc(d.reason)}</td></tr></table>
  ${d.note ? `<div class="section">III. Ghi chú</div><table class="info"><tr><td style="white-space:pre-wrap;">${esc(d.note)}</td></tr></table>` : ''}

  ${dateLine()}
  <table class="signs"><tr>
    <td><div class="sign-title">Người lập đề nghị</div><div class="sign-note">(Ký, ghi rõ họ tên)</div><div class="sign-space"></div></td>
    <td><div class="sign-title">Lãnh đạo phê duyệt</div><div class="sign-note">(Ký, ghi rõ họ tên)</div><div class="sign-space"></div></td>
  </tr></table>`;
  openPrint(`Tờ trình thanh lý ${d.code}`, body);
}

// Biên bản thanh lý — in sau COMPLETED
export function printDisposalRecordPDF(d: Disposal) {
  const body = `
  ${HEADER_HTML}
  <div class="title">Biên bản thanh lý thiết bị</div>
  <div class="code-line">Số: <span class="code-value">${esc(d.code)}</span></div>

  <div class="section">I. Căn cứ</div>
  <table class="info">
    <tr><td class="lbl">Quyết định thanh lý:</td><td>${esc(d.decisionNo)}${d.decisionDate ? ` ngày ${fmtVnDate(d.decisionDate)}` : ''}</td></tr>
    <tr><td class="lbl">Người duyệt/ký:</td><td>${esc(d.approverName)}</td></tr>
  </table>

  <div class="section">II. Thông tin thiết bị</div>
  <table class="info">${equipInfoRows(d)}
    <tr><td class="lbl">Lý do thanh lý:</td><td style="white-space:pre-wrap;">${esc(d.reason)}</td></tr>
  </table>

  <div class="section">III. Kết quả thực hiện</div>
  <table class="info">
    <tr><td class="lbl">Hình thức thanh lý:</td><td>${esc(methodLabel(d.actualMethod))}</td></tr>
    <tr><td class="lbl">Ngày thực hiện:</td><td>${fmtVnDate(d.disposalDate)}</td></tr>
    <tr><td class="lbl">Số tiền thu được:</td><td class="amount-big">${fmtMoney(d.proceeds)}</td></tr>
  </table>

  ${dateLine()}
  <table class="signs"><tr>
    <td><div class="sign-title">Người lập biên bản</div><div class="sign-note">(Ký, ghi rõ họ tên)</div><div class="sign-space"></div></td>
    <td><div class="sign-title">Trưởng phòng Quản lý Tài sản</div><div class="sign-note">(Ký, ghi rõ họ tên)</div><div class="sign-space"></div></td>
  </tr></table>`;
  openPrint(`Biên bản thanh lý ${d.code}`, body);
}
