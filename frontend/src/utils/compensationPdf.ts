import type { Compensation } from '../types/compensation';

// Mở cửa sổ mới với HTML phiếu bồi thường rồi gọi window.print()
// Layout theo style template PHIẾU YÊU CẦU BỒI THƯỜNG THIẾT BỊ — admin in & user cầm qua Phòng Kế toán
export function printCompensationPDF(c: Compensation) {
  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) {
    alert('Trình duyệt chặn cửa sổ pop-up. Vui lòng cho phép pop-up để xuất PDF.');
    return;
  }
  const esc = (s?: string | number | null) => String(s ?? '').replace(/[&<>"']/g, (ch) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string));
  const fmtVnDate = (iso?: string) => iso ? new Date(iso).toLocaleDateString('vi-VN') : '';
  const fmtVnDateTime = (iso?: string) => iso ? new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '';
  const amountStr = c.amount != null ? Number(c.amount).toLocaleString('vi-VN') : '';
  const now = new Date();
  const day = now.getDate();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  w.document.write(`<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>Phiếu yêu cầu bồi thường ${esc(c.code)}</title>
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
  .code-line .code-value { display: inline-block; min-width: 220px; border-bottom: 1px solid #000; padding: 0 8px; font-weight: bold; font-family: Consolas, monospace; letter-spacing: 2px; }

  .section { font-weight: bold; text-transform: uppercase; font-size: 12pt; margin: 14px 0 6px; }

  table.info { width: 100%; border-collapse: collapse; }
  table.info td { border: 1px solid #000; padding: 6px 8px; vertical-align: top; font-size: 12pt; }
  table.info td.lbl { font-weight: bold; width: 30%; background: #fafafa; white-space: nowrap; }
  .amount-big { font-size: 14pt; font-weight: bold; color: #b91c1c; }
  .multiline { min-height: 60px; }

  .date-line { text-align: right; font-style: italic; margin-top: 12px; }
  .date-line .dash { display: inline-block; min-width: 35px; border-bottom: 1px dotted #000; text-align: center; font-style: normal; }

  table.signs { width: 100%; margin-top: 10px; border-collapse: collapse; }
  table.signs td { width: 33.33%; text-align: center; vertical-align: top; padding: 6px 4px; }
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

  <div class="title">Phiếu yêu cầu bồi thường thiết bị</div>
  <div class="code-line">Mã phiếu: <span class="code-value">${esc(c.code)}</span></div>

  <div class="section">I. Thông tin người phải bồi thường</div>
  <table class="info">
    <tr><td class="lbl">Họ và tên:</td><td>${esc(c.userName)}</td></tr>
    <tr><td class="lbl">Khoa / Đơn vị:</td><td>${esc(c.userFaculty)}</td></tr>
    <tr><td class="lbl">Email:</td><td>${esc(c.userEmail)}</td></tr>
    <tr><td class="lbl">Số điện thoại:</td><td>${esc(c.userPhone)}</td></tr>
  </table>

  <div class="section">II. Thông tin thiết bị</div>
  <table class="info">
    <tr><td class="lbl">Mã thiết bị:</td><td>${esc(c.equipmentCode)}</td></tr>
    <tr><td class="lbl">Tên thiết bị:</td><td>${esc(c.equipmentName)}</td></tr>
    <tr><td class="lbl">Đơn vị quản lý:</td><td>${esc(c.buildingName)}</td></tr>
  </table>

  <div class="section">III. Đơn mượn liên quan</div>
  <table class="info">
    <tr><td class="lbl">Mã đơn mượn:</td><td>#${esc(c.borrowId)}</td></tr>
    <tr><td class="lbl">Ngày mượn:</td><td>${fmtVnDateTime(c.borrowDateTime)}</td></tr>
    <tr><td class="lbl">Ngày trả thực tế:</td><td>${fmtVnDateTime(c.actualReturnDateTime)}</td></tr>
    <tr>
      <td class="lbl">Tình trạng trước khi mượn:</td>
      <td class="multiline" style="white-space: pre-wrap;">${esc(c.preBorrowConditionNote)}</td>
    </tr>
    <tr>
      <td class="lbl">Báo hỏng của người mượn:</td>
      <td class="multiline" style="white-space: pre-wrap;">${esc(c.damageDescription) || '<em style="color:#666">User không báo hỏng — admin tự phát hiện</em>'}</td>
    </tr>
  </table>

  <div class="section">IV. Chi tiết bồi thường</div>
  <table class="info">
    <tr>
      <td class="lbl">Số tiền (VNĐ):</td>
      <td class="amount-big">${amountStr} đ</td>
    </tr>
    <tr>
      <td class="lbl">Lý do:</td>
      <td class="multiline" style="white-space: pre-wrap;">${esc(c.reason)}</td>
    </tr>
    <tr>
      <td class="lbl">Ngày tạo phiếu:</td>
      <td>${fmtVnDate(c.createdAt)}</td>
    </tr>
  </table>

  <div class="section">V. Xác nhận</div>
  <div class="date-line">
    Đà Nẵng, ngày <span class="dash">${day}</span> tháng <span class="dash">${month}</span> năm <span class="dash">${year}</span>
  </div>

  <table class="signs">
    <tr>
      <td>
        <div class="sign-title">Người nộp tiền</div>
        <div class="sign-note">(Ký, ghi rõ họ tên)</div>
        <div class="sign-space"></div>
      </td>
      <td>
        <div class="sign-title">Phòng Kế toán Tài chính</div>
        <div class="sign-note">(Ký, đóng dấu)</div>
        <div class="sign-space"></div>
      </td>
      <td>
        <div class="sign-title">Phòng QL Tài sản công</div>
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
