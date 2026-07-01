import type { Procurement } from '../types/procurement';

// Hàm escape + tiện ích dùng chung cho 2 mẫu PDF mua sắm
const esc = (s?: string | number | null) =>
  String(s ?? '').replace(/[&<>"']/g, (ch) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string));
const fmtVnDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('vi-VN') : '');
const fmtMoney = (v?: number | null) =>
  v != null ? Number(v).toLocaleString('vi-VN') + ' đ' : '—';

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
  table.info td.lbl { font-weight: bold; width: 28%; background: #fafafa; white-space: nowrap; }
  table.items { width: 100%; border-collapse: collapse; font-size: 11.5pt; }
  table.items th, table.items td { border: 1px solid #000; padding: 5px 6px; vertical-align: top; }
  table.items th { background: #f0f0f0; text-align: center; }
  .num { text-align: right; white-space: nowrap; }
  .center { text-align: center; }
  .date-line { text-align: right; font-style: italic; margin-top: 12px; }
  .date-line .dash { display: inline-block; min-width: 32px; border-bottom: 1px dotted #000; text-align: center; font-style: normal; }
  table.signs { width: 100%; margin-top: 10px; border-collapse: collapse; }
  table.signs td { width: 50%; text-align: center; vertical-align: top; padding: 6px 4px; }
  table.signs.signs-3 td { width: 33.33%; }
  .sign-title { font-weight: bold; text-transform: uppercase; font-size: 11.5pt; }
  .sign-note { font-style: italic; font-size: 10.5pt; }
  .sign-space { height: 80px; }
  @media print { body { padding: 16mm; } @page { size: A4; margin: 0; } }
`;

function openPrint(title: string, bodyHtml: string) {
  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) {
    alert('Trình duyệt chặn cửa sổ pop-up. Vui lòng cho phép pop-up để xuất PDF.');
    return;
  }
  w.document.write(`<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><title>${esc(title)}</title>
<style>${BASE_CSS}</style></head><body>${bodyHtml}
<script>window.onload=function(){setTimeout(function(){window.print();},200);};<\/script>
</body></html>`);
  w.document.close();
}

const HEADER_HTML = `
  <table class="header"><tr>
    <td class="left"><div class="name">Trường Đại học Bách khoa</div><div class="name">Phòng Quản lý Tài sản công</div></td>
    <td class="right"><div class="name">Cộng hòa Xã hội Chủ nghĩa Việt Nam</div><div class="motto">Độc lập - Tự do - Hạnh phúc</div></td>
  </tr></table>`;

function dateLine() {
  const now = new Date();
  return `<div class="date-line">Đà Nẵng, ngày <span class="dash">${now.getDate()}</span> tháng <span class="dash">${now.getMonth() + 1}</span> năm <span class="dash">${now.getFullYear()}</span></div>`;
}

function itemRows(p: Procurement, withCodes: boolean) {
  return (p.items ?? [])
    .map((it, idx) => `<tr>
      <td class="center">${idx + 1}</td>
      <td>${esc(it.name)}${it.specifications ? `<br><span style="font-size:10.5pt;color:#444">${esc(it.specifications)}</span>` : ''}</td>
      <td>${esc(it.equipTypeName)}</td>
      <td class="center">${esc(it.quantity)}</td>
      <td class="num">${fmtMoney(it.unitPrice)}</td>
      <td>${esc(it.targetBuildingName)}</td>
      ${withCodes ? `<td>${esc((it.receivedCodes ?? []).join(', '))}</td>` : ''}
    </tr>`)
    .join('');
}

// Tờ trình đề nghị mua sắm — in ở trạng thái PENDING để trình lãnh đạo ký
export function printProcurementProposalPDF(p: Procurement) {
  const body = `
  ${HEADER_HTML}
  <div class="title">Phiếu đề nghị mua sắm thiết bị</div>
  <div class="code-line">Số: <span class="code-value">${esc(p.code)}</span></div>

  <div class="section">I. Thông tin đề nghị</div>
  <table class="info">
    <tr><td class="lbl">Tiêu đề:</td><td>${esc(p.title)}</td></tr>
    <tr><td class="lbl">Người lập:</td><td>${esc(p.requestedByName)}</td></tr>
    ${p.supplier ? `<tr><td class="lbl">Nhà cung cấp dự kiến:</td><td>${esc(p.supplier)}</td></tr>` : ''}
    <tr><td class="lbl">Lý do/Mục đích:</td><td style="white-space:pre-wrap">${esc(p.reason)}</td></tr>
  </table>

  <div class="section">II. Danh mục thiết bị đề nghị</div>
  <table class="items">
    <thead><tr><th>STT</th><th>Tên thiết bị</th><th>Loại</th><th>SL</th><th>Đơn giá DK</th><th>Nơi đặt</th></tr></thead>
    <tbody>${itemRows(p, false)}</tbody>
    <tfoot><tr><td colspan="3" class="num"><b>Tổng cộng</b></td><td class="center"><b>${esc(p.totalQuantity)}</b></td><td class="num"><b>${fmtMoney(p.estimatedTotal)}</b></td><td></td></tr></tfoot>
  </table>

  ${dateLine()}
  <table class="signs signs-3"><tr>
    <td><div class="sign-title">Người lập đề nghị</div><div class="sign-note">(Ký, ghi rõ họ tên)</div><div class="sign-space"></div></td>
    <td><div class="sign-title">Phòng Tài chính Kế toán</div><div class="sign-note">(Ký, đóng dấu)</div><div class="sign-space"></div></td>
    <td><div class="sign-title">Lãnh đạo phê duyệt</div><div class="sign-note">(Ký, ghi rõ họ tên)</div><div class="sign-space"></div></td>
  </tr></table>`;
  openPrint(`Phiếu đề nghị mua sắm ${p.code}`, body);
}

// Biên bản nghiệm thu/bàn giao — in sau COMPLETED, dẫn chiếu số quyết định
export function printProcurementReceiptPDF(p: Procurement) {
  const body = `
  ${HEADER_HTML}
  <div class="title">Biên bản nghiệm thu, nhập kho thiết bị</div>
  <div class="code-line">Theo đề nghị số: <span class="code-value">${esc(p.code)}</span></div>

  <div class="section">I. Căn cứ</div>
  <table class="info">
    <tr><td class="lbl">Đề nghị mua sắm:</td><td>${esc(p.code)} — ${esc(p.title)}</td></tr>
    <tr><td class="lbl">Quyết định phê duyệt:</td><td>${esc(p.decisionNo)}${p.decisionDate ? ` ngày ${fmtVnDate(p.decisionDate)}` : ''}${p.approverName ? ` — Người duyệt: ${esc(p.approverName)}` : ''}</td></tr>
    ${p.supplier ? `<tr><td class="lbl">Nhà cung cấp:</td><td>${esc(p.supplier)}</td></tr>` : ''}
  </table>

  <div class="section">II. Thiết bị đã nghiệm thu, nhập kho</div>
  <table class="items">
    <thead><tr><th>STT</th><th>Tên thiết bị</th><th>Loại</th><th>SL</th><th>Đơn giá</th><th>Nơi đặt</th><th>Mã thiết bị</th></tr></thead>
    <tbody>${itemRows(p, true)}</tbody>
  </table>

  ${dateLine()}
  <table class="signs"><tr>
    <td><div class="sign-title">Người nhận/Nhập kho</div><div class="sign-note">(Ký, ghi rõ họ tên)</div><div class="sign-space"></div></td>
    <td><div class="sign-title">Đại diện đơn vị</div><div class="sign-note">(Ký, ghi rõ họ tên)</div><div class="sign-space"></div></td>
  </tr></table>`;
  openPrint(`Biên bản nghiệm thu ${p.code}`, body);
}
