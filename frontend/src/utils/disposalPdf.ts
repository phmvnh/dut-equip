import type { Equipment } from '../types/equipment';

// Biên bản thanh lý thiết bị — mở cửa sổ HTML rồi gọi window.print() để user xuất PDF
// Cùng pattern với compensationPdf.ts / maintenancePdf inline
export function printDisposalPDF(equipment: Equipment) {
  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) {
    alert('Trình duyệt chặn cửa sổ pop-up. Vui lòng cho phép pop-up để xuất PDF.');
    return;
  }
  const esc = (s?: string | number | null) =>
    String(s ?? '').replace(/[&<>"']/g, (ch) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string));
  const fmtVnDate = (iso?: string) => iso ? new Date(iso).toLocaleDateString('vi-VN') : '';
  const valueStr = equipment.disposalValue != null
    ? Number(equipment.disposalValue).toLocaleString('vi-VN') + ' đ'
    : 'Không thu hồi';
  const purchaseStr = equipment.purchasePrice != null
    ? Number(equipment.purchasePrice).toLocaleString('vi-VN') + ' đ'
    : '';
  const now = new Date();
  const day = now.getDate();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  w.document.write(`<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Biên bản thanh lý ${esc(equipment.code)}</title>
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
  table.info td.lbl { font-weight: bold; width: 28%; background: #fafafa; white-space: nowrap; }
  .multiline { min-height: 60px; }
  .amount-big { font-size: 14pt; font-weight: bold; color: #b91c1c; }

  .date-line { text-align: right; font-style: italic; margin-top: 12px; }
  .date-line .dash { display: inline-block; min-width: 35px; border-bottom: 1px dotted #000; text-align: center; font-style: normal; }

  table.signs { width: 100%; margin-top: 10px; border-collapse: collapse; }
  table.signs td { width: 50%; text-align: center; vertical-align: top; padding: 6px 4px; }
  .sign-title { font-weight: bold; text-transform: uppercase; font-size: 11.5pt; }
  .sign-note { font-style: italic; font-size: 10.5pt; }
  .sign-space { height: 80px; }

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

  <div class="title">Biên bản thanh lý thiết bị</div>
  <div class="code-line">Mã thiết bị: <span class="code-value">${esc(equipment.code)}</span></div>

  <div class="section">I. Thông tin thiết bị</div>
  <table class="info">
    <tr><td class="lbl">Tên thiết bị:</td><td>${esc(equipment.name)}</td></tr>
    <tr><td class="lbl">Loại thiết bị:</td><td>${esc(equipment.equipTypeName)}</td></tr>
    <tr><td class="lbl">Vị trí quản lý:</td><td>${esc(equipment.buildingName)}</td></tr>
    ${purchaseStr ? `<tr><td class="lbl">Giá trị mua ban đầu:</td><td>${purchaseStr}</td></tr>` : ''}
  </table>

  <div class="section">II. Lý do thanh lý</div>
  <table class="info">
    <tr>
      <td class="multiline" style="white-space: pre-wrap;">${esc(equipment.disposalReason)}</td>
    </tr>
  </table>

  <div class="section">III. Thông tin thanh lý</div>
  <table class="info">
    <tr>
      <td class="lbl">Ngày thanh lý:</td>
      <td>${fmtVnDate(equipment.disposalDate)}</td>
    </tr>
    <tr>
      <td class="lbl">Giá trị thu hồi:</td>
      <td class="amount-big">${valueStr}</td>
    </tr>
  </table>

  <div class="section">IV. Xác nhận</div>
  <div class="date-line">
    Đà Nẵng, ngày <span class="dash">${day}</span> tháng <span class="dash">${month}</span> năm <span class="dash">${year}</span>
  </div>

  <table class="signs">
    <tr>
      <td>
        <div class="sign-title">Người lập biên bản</div>
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
