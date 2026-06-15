import { useEffect, useState } from 'react';
import type { Equipment } from '../types/equipment';
import { useAuthStore } from '../store/authStore';
import { useToastStore } from '../store/toastStore';
import { buildingApi, type BuildingResponse } from '../api/buildingApi';
import { borrowApi, type PurposeType } from '../api/borrowApi';
import StatusPill from './StatusPill';
import EquipmentScheduleList from './EquipmentScheduleList';

interface Props {
  equipment: Equipment;
  onClose: () => void;
  onShowDetail?: (equipment: Equipment) => void;
  onSuccess?: () => void;
}

const PURPOSES: { label: string; value: PurposeType }[] = [
  { label: 'Giảng dạy',                             value: 'TEACHING' },
  { label: 'Thực hành',                             value: 'PRACTICE' },
  { label: 'Hội thảo',                              value: 'CONFERENCE' },
  { label: 'Nghiên cứu khoa học',                   value: 'RESEARCH' },
  { label: 'Hoạt động ngoại khóa / Sự kiện trường', value: 'EXTRACURRICULAR' },
  { label: 'Khác (ghi rõ)',                         value: 'OTHER' },
];

// Khung giờ làm việc — Borrow: 07:00–16:30 (20 slot), Return: 07:00–17:00 (21 slot)
// Mượn trễ nhất 16:30 để còn ít nhất 30p sử dụng trước khi đóng cửa lúc 17:00
function makeSlots(maxHour: number, maxMinute: number): string[] {
  const out: string[] = [];
  for (let h = 7; h <= maxHour; h++) {
    out.push(`${String(h).padStart(2, '0')}:00`);
    if (h < maxHour || maxMinute >= 30) out.push(`${String(h).padStart(2, '0')}:30`);
  }
  return out;
}
const BORROW_TIME_SLOTS: string[] = makeSlots(16, 30);  // ['07:00',...,'16:30']
const RETURN_TIME_SLOTS: string[] = makeSlots(17, 0);   // ['07:00',...,'17:00']

const FIRST_SLOT = BORROW_TIME_SLOTS[0];                       // '07:00'
const LAST_BORROW_MINUTES = 16 * 60 + 30;                      // 16:30
const FIRST_MINUTES = 7 * 60;                                  // 07:00

// Default time: luôn ngày hôm nay. Làm tròn LÊN slot 30p kế tiếp, cap 16:30 nếu vượt.
// Nếu đã quá 16:30 hoặc trước 07:00 — vẫn giữ hôm nay, user tự sửa ngày nếu cần.
function defaultBorrowDatetime() {
  const d = new Date();
  const minutesNow = d.getHours() * 60 + d.getMinutes();

  if (minutesNow < FIRST_MINUTES) {
    d.setHours(7, 0, 0, 0);
  } else if (minutesNow >= LAST_BORROW_MINUTES) {
    d.setHours(16, 30, 0, 0);
  } else {
    // Trong giờ — làm tròn lên slot 30p kế tiếp
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

function addDays(datetimeLocalStr: string, days: number) {
  const d = new Date(datetimeLocalStr);
  d.setDate(d.getDate() + days);
  return toDatetimeLocal(d);
}

// Default return ban đầu = borrow + 3 tiếng cùng ngày, cap 17:00 nếu vượt khung
function defaultReturnFromBorrow(borrowDatetime: string) {
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

function toDatetimeLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function nowDatetimeLocal() {
  return toDatetimeLocal(new Date());
}

function splitDatetime(dt: string): { date: string; time: string } {
  const [date, time = FIRST_SLOT] = dt.split('T');
  return { date, time: time.slice(0, 5) };
}

function joinDatetime(date: string, time: string) {
  return `${date}T${time}`;
}

function todayDateStr() {
  return toDatetimeLocal(new Date()).split('T')[0];
}

interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

function Field({ label, required, error, children, className }: FieldProps) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

const inputCls = (error?: string) =>
  `w-full h-9 px-3 rounded-lg border text-sm text-gray-800 bg-white transition-colors outline-none focus:ring-2 focus:ring-blue-500/20 ${
    error
      ? 'border-red-300 focus:border-red-400'
      : 'border-gray-200 focus:border-blue-400'
  }`;

export default function BorrowFormModal({ equipment, onClose, onShowDetail, onSuccess }: Props) {
  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.show);

  const defaultBorrow = defaultBorrowDatetime();
  const defaultReturn = defaultReturnFromBorrow(defaultBorrow);

  const [buildings, setBuildings] = useState<BuildingResponse[]>([]);

  const [form, setForm] = useState({
    fullName:      user?.fullName ?? '',
    email:         user?.email ?? '',
    phone:         user?.phone ?? '',
    buildingId:    '',
    room:          '',
    borrowDatetime: defaultBorrow,
    returnDatetime: defaultReturn,
    purpose:       '',
    purposeNote:   '',
    note:          '',
    agreed:        false,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof typeof form | 'submit', string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [limitReached, setLimitReached] = useState<string | null>(null);

  useEffect(() => {
    buildingApi.getAll()
      .then(setBuildings)
      .catch(() => showToast('Không tải được danh sách khu, vui lòng thử lại', 'error'));
  }, [showToast]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  useEffect(() => {
    if (!submitted) return;
    const t = setTimeout(onClose, 2500);
    return () => clearTimeout(t);
  }, [submitted, onClose]);

  // Khi ngày giờ mượn thay đổi: giữ nguyên ngày trả — user tự quản lý
  function handleBorrowDatetimeChange(val: string) {
    setForm((f) => ({ ...f, borrowDatetime: val }));
    setErrors((e) => ({ ...e, borrowDatetime: undefined }));
  }

  function maxReturnDatetime() {
    return addDays(form.borrowDatetime, 7);
  }

  function set<K extends keyof typeof form>(key: K, val: typeof form[K]) {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate() {
    const e: typeof errors = {};
    if (!form.fullName.trim())     e.fullName = 'Vui lòng nhập họ tên';
    if (!form.email.trim())        e.email = 'Vui lòng nhập email';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email không hợp lệ';
    if (!form.buildingId)          e.buildingId = 'Vui lòng chọn khu sử dụng';
    if (!form.room.trim())         e.room = 'Vui lòng nhập phòng sử dụng';
    if (!form.borrowDatetime)      e.borrowDatetime = 'Vui lòng chọn ngày giờ mượn';
    else if (form.borrowDatetime < nowDatetimeLocal()) e.borrowDatetime = 'Ngày mượn phải từ thời điểm hiện tại';
    if (!form.returnDatetime)      e.returnDatetime = 'Vui lòng chọn ngày giờ trả';
    else if (form.returnDatetime <= form.borrowDatetime) e.returnDatetime = 'Ngày trả phải sau ngày mượn';
    else if (form.returnDatetime > maxReturnDatetime()) e.returnDatetime = 'Tối đa 7 ngày kể từ ngày mượn';
    if (!form.purpose)             e.purpose = 'Vui lòng chọn mục đích sử dụng';
    if (form.purpose === 'OTHER' && !form.purposeNote.trim())
                                   e.purposeNote = 'Vui lòng ghi rõ mục đích';
    if (!form.agreed)              e.agreed = 'Vui lòng xác nhận cam kết trước khi gửi';
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSubmitting(true);
    try {
      await borrowApi.create({
        equipmentId:    equipment.id,
        buildingId:     Number(form.buildingId),
        room:           form.room.trim(),
        borrowDateTime: form.borrowDatetime,
        returnDateTime: form.returnDatetime,
        purpose:        form.purpose as PurposeType,
        purposeNote:    form.purpose === 'OTHER' ? form.purposeNote.trim() : undefined,
        note:           form.note.trim() || undefined,
        confirmed:      form.agreed,
      });
      onSuccess?.();
      setSubmitted(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (msg && (msg.startsWith('Bạn đang mượn tối đa')
               || msg.startsWith('Bạn đã có một đơn mượn đang xử lý')
               || msg.startsWith('Khung giờ này đã có người đặt')
               || msg.startsWith('Thiết bị đang quá hạn'))) {
        setLimitReached(msg);
      } else {
        setErrors({ submit: msg || 'Gửi đơn thất bại. Vui lòng thử lại.' });
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Popup cảnh báo — hiện khi backend trả lỗi vượt giới hạn mượn hoặc trùng đơn cùng thiết bị
  if (limitReached) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Không thể tạo đơn mượn</h3>
            <p className="text-sm text-gray-600 whitespace-pre-line">{limitReached}</p>
          </div>
         
        </div>
      </div>
    );
  }

  // Success screen
  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Đơn mượn đã được gửi!</h3>
            <p className="text-sm text-gray-500">
              Đơn của bạn đang chờ Admin phê duyệt. Bạn sẽ nhận thông báo khi có kết quả.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Đăng ký mượn thiết bị</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 space-y-4">

            {/* Thiết bị — bấm vào để xem lại chi tiết */}
            <button
              type="button"
              onClick={() => onShowDetail?.(equipment)}
              disabled={!onShowDetail}
              className="w-full flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2.5 text-left transition-colors enabled:hover:bg-blue-100/60 enabled:hover:border-blue-200 enabled:cursor-pointer disabled:cursor-default"
              title={onShowDetail ? 'Bấm để xem chi tiết thiết bị' : undefined}
            >
              <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 overflow-hidden">
                {equipment.mainImageUrl ? (
                  <img src={equipment.mainImageUrl} alt={equipment.name} className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path strokeLinecap="round" d="M8 21h8M12 17v4" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{equipment.name}</p>
                <p className="text-[11px] text-gray-400">{equipment.code}</p>
              </div>
              <StatusPill status={equipment.status} />
              {onShowDetail && (
                <svg className="w-4 h-4 text-blue-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              )}
            </button>

            {/* 2 cột: Người mượn (2/7) | Thông tin sử dụng (5/7) */}
            <div className="grid grid-cols-1 md:grid-cols-7 gap-5">
              {/* Cột trái: Người mượn — panel xám, read-only */}
              <div className="md:col-span-2 bg-gray-50 rounded-xl border border-gray-100 p-3.5">
                <div className="flex items-center justify-between mb-2.5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Người mượn
                  </p>
                  <span className="text-[11px] text-gray-400 inline-flex items-center gap-1">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5" y="11" width="14" height="10" rx="2" />
                      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                    </svg>
                    Lấy từ tài khoản
                  </span>
                </div>
                <div className="space-y-2.5">
                  <Field label="Họ và tên" error={errors.fullName}>
                    <input
                      type="text"
                      value={form.fullName}
                      readOnly
                      tabIndex={-1}
                      className={`${inputCls(errors.fullName)} bg-white text-gray-600 cursor-not-allowed`}
                    />
                  </Field>
                  <Field label="Email" error={errors.email}>
                    <input
                      type="email"
                      value={form.email}
                      readOnly
                      tabIndex={-1}
                      className={`${inputCls(errors.email)} bg-white text-gray-600 cursor-not-allowed`}
                    />
                  </Field>
                  <Field label="Số điện thoại" error={errors.phone}>
                    <input
                      type="tel"
                      value={form.phone}
                      readOnly
                      tabIndex={-1}
                      className={`${inputCls(errors.phone)} bg-white text-gray-600 cursor-not-allowed`}
                    />
                  </Field>
                </div>
              </div>

              {/* Cột phải: Thông tin sử dụng */}
              <div className="md:col-span-5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
                  Thông tin sử dụng
                </p>
                <div className="space-y-2.5">
                  <div className="grid grid-cols-3 gap-2.5">
                    <Field label="Khu sử dụng" required error={errors.buildingId} className="col-span-2">
                      <select
                        value={form.buildingId}
                        onChange={(e) => set('buildingId', e.target.value)}
                        className={`${inputCls(errors.buildingId)} cursor-pointer`}
                      >
                        <option value="">-- Chọn khu --</option>
                        {buildings.map((b) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Phòng" required error={errors.room}>
                      <input
                        type="text"
                        value={form.room}
                        onChange={(e) => set('room', e.target.value)}
                        className={inputCls(errors.room)}
                        placeholder="VD: F101"
                      />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <Field label="Ngày giờ mượn" required error={errors.borrowDatetime}>
                      <div className="grid grid-cols-[1fr,auto] gap-1.5">
                        <input
                          type="date"
                          value={splitDatetime(form.borrowDatetime).date}
                          min={todayDateStr()}
                          onChange={(e) => {
                            const newDate = e.target.value;
                            const borrowTime = splitDatetime(form.borrowDatetime).time;
                            const returnTime = splitDatetime(form.returnDatetime).time;
                            setForm((f) => ({
                              ...f,
                              borrowDatetime: joinDatetime(newDate, borrowTime),
                              returnDatetime: joinDatetime(newDate, returnTime),
                            }));
                            setErrors((er) => ({ ...er, borrowDatetime: undefined, returnDatetime: undefined }));
                          }}
                          className={inputCls(errors.borrowDatetime)}
                        />
                        <select
                          value={splitDatetime(form.borrowDatetime).time}
                          onChange={(e) => {
                            const date = splitDatetime(form.borrowDatetime).date;
                            handleBorrowDatetimeChange(joinDatetime(date, e.target.value));
                          }}
                          className={`${inputCls(errors.borrowDatetime)} w-24 cursor-pointer`}
                        >
                          {BORROW_TIME_SLOTS.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    </Field>
                    <Field label="Ngày giờ trả" required error={errors.returnDatetime}>
                      <div className="grid grid-cols-[1fr,auto] gap-1.5">
                        <input
                          type="date"
                          value={splitDatetime(form.returnDatetime).date}
                          max={splitDatetime(maxReturnDatetime()).date}
                          onChange={(e) => {
                            const time = splitDatetime(form.returnDatetime).time;
                            set('returnDatetime', joinDatetime(e.target.value, time));
                          }}
                          className={inputCls(errors.returnDatetime)}
                        />
                        <select
                          value={splitDatetime(form.returnDatetime).time}
                          onChange={(e) => {
                            const date = splitDatetime(form.returnDatetime).date;
                            set('returnDatetime', joinDatetime(date, e.target.value));
                          }}
                          className={`${inputCls(errors.returnDatetime)} w-24 cursor-pointer`}
                        >
                          {RETURN_TIME_SLOTS.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    </Field>
                  </div>
                  <EquipmentScheduleList equipmentId={equipment.id} />
                  <Field label="Mục đích sử dụng" required error={errors.purpose}>
                    <select
                      value={form.purpose}
                      onChange={(e) => set('purpose', e.target.value)}
                      className={`${inputCls(errors.purpose)} cursor-pointer`}
                    >
                      <option value="">-- Chọn mục đích --</option>
                      {PURPOSES.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </Field>
                  {form.purpose === 'OTHER' && (
                    <Field label="Ghi rõ mục đích" required error={errors.purposeNote}>
                      <input
                        type="text"
                        value={form.purposeNote}
                        onChange={(e) => set('purposeNote', e.target.value)}
                        className={inputCls(errors.purposeNote)}
                        placeholder="Mô tả mục đích sử dụng..."
                        autoFocus
                      />
                    </Field>
                  )}
                </div>
              </div>
            </div>

            {/* Ghi chú */}
            <Field label="Ghi chú" error={errors.note}>
              <textarea
                value={form.note}
                onChange={(e) => set('note', e.target.value)}
                rows={2}
                className={`w-full px-3 py-2 rounded-lg border text-sm text-gray-800 bg-white resize-none transition-colors outline-none focus:ring-2 focus:ring-blue-500/20 ${
                  errors.note ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-blue-400'
                }`}
                placeholder="Ghi chú thêm nếu cần (không bắt buộc)..."
              />
            </Field>

            {/* Cam kết */}
            <div>
              <label
                className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                  errors.agreed
                    ? 'border-red-300 bg-red-50'
                    : form.agreed
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.agreed}
                  onChange={(e) => set('agreed', e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded accent-blue-600 shrink-0 cursor-pointer"
                />
                <span className="text-xs text-gray-600 leading-snug">
                  Tôi cam kết sử dụng thiết bị đúng mục đích đã đăng ký, bảo quản cẩn thận và{' '}
                  <span className="font-semibold text-gray-700">
                    chịu trách nhiệm bồi thường theo quy định nếu làm hỏng hoặc mất thiết bị
                  </span>
                  .
                </span>
              </label>
              {errors.agreed && (
                <p className="mt-1 text-xs text-red-500">{errors.agreed}</p>
              )}
            </div>

            {/* Submit error */}
            {errors.submit && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {errors.submit}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-lg bg-gray-100 text-gray-700 border border-gray-300 text-sm hover:bg-gray-200 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-9 px-5 rounded-lg bg-blue-100 text-blue-700 border border-blue-300 text-sm font-semibold hover:bg-blue-200 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                  </svg>
                  Đang gửi...
                </span>
              ) : (
                'Gửi yêu cầu'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
