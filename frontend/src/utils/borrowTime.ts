// Helper thời gian cho form mượn — dùng cho giao diện mobile (MobileBorrowSheet).
// Quy tắc khớp BorrowFormModal desktop: khung giờ 07:00–16:30 (mượn) / 07:00–17:00 (trả), tối đa 7 ngày.

// Khung giờ làm việc — mượn trễ nhất 16:30 để còn ≥30p sử dụng trước khi đóng cửa 17:00
function makeSlots(maxHour: number, maxMinute: number): string[] {
  const out: string[] = [];
  for (let h = 7; h <= maxHour; h++) {
    out.push(`${String(h).padStart(2, '0')}:00`);
    if (h < maxHour || maxMinute >= 30) out.push(`${String(h).padStart(2, '0')}:30`);
  }
  return out;
}

export const BORROW_TIME_SLOTS: string[] = makeSlots(16, 30); // ['07:00',...,'16:30']
export const RETURN_TIME_SLOTS: string[] = makeSlots(17, 0); // ['07:00',...,'17:00']

const FIRST_SLOT = BORROW_TIME_SLOTS[0]; // '07:00'
const LAST_BORROW_MINUTES = 16 * 60 + 30; // 16:30
const FIRST_MINUTES = 7 * 60; // 07:00

export function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function nowDatetimeLocal(): string {
  return toDatetimeLocal(new Date());
}

export function todayDateStr(): string {
  return toDatetimeLocal(new Date()).split('T')[0];
}

export function splitDatetime(dt: string): { date: string; time: string } {
  const [date, time = FIRST_SLOT] = dt.split('T');
  return { date, time: time.slice(0, 5) };
}

export function joinDatetime(date: string, time: string): string {
  return `${date}T${time}`;
}

export function addDays(datetimeLocalStr: string, days: number): string {
  const d = new Date(datetimeLocalStr);
  d.setDate(d.getDate() + days);
  return toDatetimeLocal(d);
}

// Default mượn: hôm nay, làm tròn LÊN slot 30p kế tiếp, cap 16:30
export function defaultBorrowDatetime(): string {
  const d = new Date();
  const minutesNow = d.getHours() * 60 + d.getMinutes();

  if (minutesNow < FIRST_MINUTES) {
    d.setHours(7, 0, 0, 0);
  } else if (minutesNow >= LAST_BORROW_MINUTES) {
    d.setHours(16, 30, 0, 0);
  } else {
    if (d.getMinutes() === 0) {
      d.setMinutes(30, 0, 0);
    } else {
      d.setHours(d.getHours() + 1, 0, 0, 0);
    }
    if (d.getHours() * 60 + d.getMinutes() > LAST_BORROW_MINUTES) {
      d.setHours(16, 30, 0, 0);
    }
  }
  return toDatetimeLocal(d);
}

// Default trả = mượn + 3 tiếng cùng ngày, cap 17:00
export function defaultReturnFromBorrow(borrowDatetime: string): string {
  const { date, time } = splitDatetime(borrowDatetime);
  const [hStr, mStr] = time.split(':');
  let h = parseInt(hStr, 10) + 3;
  let m = parseInt(mStr, 10);
  if (h > 17 || (h === 17 && m > 0)) {
    h = 17;
    m = 0;
  }
  const newTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  return joinDatetime(date, newTime);
}
