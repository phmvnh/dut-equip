import { useEffect, useState } from 'react';
import type { Equipment } from '../../types/equipment';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import { buildingApi, type BuildingResponse } from '../../api/buildingApi';
import { borrowApi, type PurposeType } from '../../api/borrowApi';
import {
  BORROW_TIME_SLOTS,
  RETURN_TIME_SLOTS,
  addDays,
  defaultBorrowDatetime,
  defaultReturnFromBorrow,
  joinDatetime,
  nowDatetimeLocal,
  splitDatetime,
  todayDateStr,
} from '../../utils/borrowTime';
import MobileSheet from './MobileSheet';
import EquipmentScheduleList from '../EquipmentScheduleList';

interface Props {
  equipment: Equipment;
  onClose: () => void;
  onSuccess?: () => void;
}

const PURPOSES: { label: string; value: PurposeType }[] = [
  { label: 'Giảng dạy', value: 'TEACHING' },
  { label: 'Thực hành', value: 'PRACTICE' },
  { label: 'Hội thảo', value: 'CONFERENCE' },
  { label: 'Nghiên cứu khoa học', value: 'RESEARCH' },
  { label: 'Hoạt động ngoại khóa / Sự kiện trường', value: 'EXTRACURRICULAR' },
  { label: 'Khác (ghi rõ)', value: 'OTHER' },
];

// text-[16px]: iOS không auto-zoom khi focus input < 16px
const fieldCls = (error?: string) =>
  `w-full h-11 px-3 rounded-xl border text-[16px] text-gray-800 bg-white outline-none focus:ring-2 focus:ring-action/20 ${
    error ? 'border-red-300' : 'border-gray-200 focus:border-action'
  }`;

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-gray-500 mb-1.5">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

export default function MobileBorrowSheet({ equipment, onClose, onSuccess }: Props) {
  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.show);

  const defaultBorrow = defaultBorrowDatetime();
  const [buildings, setBuildings] = useState<BuildingResponse[]>([]);
  const [form, setForm] = useState({
    buildingId: '',
    room: '',
    borrowDatetime: defaultBorrow,
    returnDatetime: defaultReturnFromBorrow(defaultBorrow),
    purpose: '',
    purposeNote: '',
    note: '',
    agreed: false,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form | 'submit', string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [limitReached, setLimitReached] = useState<string | null>(null);

  useEffect(() => {
    buildingApi.getAll()
      .then(setBuildings)
      .catch(() => showToast('Không tải được danh sách khu, vui lòng thử lại', 'error'));
  }, [showToast]);

  function set<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: val }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  const maxReturnDatetime = () => addDays(form.borrowDatetime, 7);

  function validate() {
    const e: typeof errors = {};
    if (!form.buildingId) e.buildingId = 'Vui lòng chọn khu sử dụng';
    if (!form.room.trim()) e.room = 'Vui lòng nhập phòng sử dụng';
    if (!form.borrowDatetime) e.borrowDatetime = 'Vui lòng chọn ngày giờ mượn';
    else if (form.borrowDatetime < nowDatetimeLocal()) e.borrowDatetime = 'Ngày mượn phải từ thời điểm hiện tại';
    if (!form.returnDatetime) e.returnDatetime = 'Vui lòng chọn ngày giờ trả';
    else if (form.returnDatetime <= form.borrowDatetime) e.returnDatetime = 'Ngày trả phải sau ngày mượn';
    else if (form.returnDatetime > maxReturnDatetime()) e.returnDatetime = 'Tối đa 7 ngày kể từ ngày mượn';
    if (!form.purpose) e.purpose = 'Vui lòng chọn mục đích sử dụng';
    if (form.purpose === 'OTHER' && !form.purposeNote.trim()) e.purposeNote = 'Vui lòng ghi rõ mục đích';
    if (!form.agreed) e.agreed = 'Vui lòng xác nhận cam kết trước khi gửi';
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    try {
      await borrowApi.create({
        equipmentId: equipment.id,
        buildingId: Number(form.buildingId),
        room: form.room.trim(),
        borrowDateTime: form.borrowDatetime,
        returnDateTime: form.returnDatetime,
        purpose: form.purpose as PurposeType,
        purposeNote: form.purpose === 'OTHER' ? form.purposeNote.trim() : undefined,
        note: form.note.trim() || undefined,
        confirmed: form.agreed,
      });
      onSuccess?.();
      // Đóng sheet ngay rồi báo bằng toast — toast được mount ở trang chủ mobile
      onClose();
      showToast('Đã gửi đơn mượn — chờ Admin duyệt', 'success');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (msg && (msg.startsWith('Bạn đang mượn tối đa') || msg.startsWith('Bạn đã có một đơn mượn đang xử lý'))) {
        setLimitReached(msg);
      } else {
        setErrors({ submit: msg || 'Gửi đơn thất bại. Vui lòng thử lại.' });
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Chạm giới hạn mượn — báo ngay trong sheet kèm nút xác nhận (thành công thì dùng toast)
  if (limitReached) {
    return (
      <MobileSheet onClose={onClose}>
        <div className="px-6 py-10 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-amber-100">
            <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-1">Không thể tạo đơn mượn</h3>
            <p className="text-sm text-gray-500 whitespace-pre-line">{limitReached}</p>
          </div>
          <button onClick={onClose} className="mt-2 h-11 px-6 rounded-xl bg-gray-100 text-gray-700 text-sm font-semibold active:bg-gray-200">
            Đã hiểu
          </button>
        </div>
      </MobileSheet>
    );
  }

  const footer = (
    <button
      type="submit"
      form="mobile-borrow-form"
      disabled={submitting}
      className="w-full h-12 rounded-full bg-action text-white text-[15px] font-semibold active:bg-action-press active:scale-[0.98] transition disabled:opacity-60"
    >
      {submitting ? 'Đang gửi...' : 'Gửi yêu cầu mượn'}
    </button>
  );

  return (
    <MobileSheet title="Đăng ký mượn thiết bị" onClose={onClose} footer={footer}>
      {/* Thiết bị */}
      <div className="mx-5 mt-4 flex items-center gap-3 bg-action/[0.06] border border-action/10 rounded-2xl px-3.5 py-3">
        <div className="w-11 h-11 rounded-xl bg-action/10 flex items-center justify-center shrink-0 overflow-hidden">
          {equipment.mainImageUrl ? (
            <img src={equipment.mainImageUrl} alt={equipment.name} className="w-full h-full object-cover" />
          ) : (
            <svg className="w-6 h-6 text-action" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path strokeLinecap="round" d="M8 21h8M12 17v4" />
            </svg>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{equipment.name}</p>
          <p className="text-[11px] text-gray-400">{equipment.code}</p>
        </div>
      </div>

      <form id="mobile-borrow-form" onSubmit={handleSubmit} noValidate className="px-5 py-4 space-y-4">
        {/* Người mượn — read-only */}
        <div className="bg-gray-50 rounded-2xl px-3.5 py-3">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Người mượn</p>
          <p className="text-sm font-medium text-gray-800">{user?.fullName}</p>
          <p className="text-xs text-gray-500">{user?.email}</p>
          {user?.phone && <p className="text-xs text-gray-500">{user.phone}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label required>Khu sử dụng</Label>
            <select value={form.buildingId} onChange={(e) => set('buildingId', e.target.value)} className={fieldCls(errors.buildingId)}>
              <option value="">-- Chọn khu --</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            {errors.buildingId && <p className="mt-1 text-xs text-red-500">{errors.buildingId}</p>}
          </div>

          <div>
            <Label required>Phòng sử dụng</Label>
            <input
              type="text"
              value={form.room}
              onChange={(e) => set('room', e.target.value)}
              className={fieldCls(errors.room)}
              placeholder="VD: F101"
            />
            {errors.room && <p className="mt-1 text-xs text-red-500">{errors.room}</p>}
          </div>

          <div>
            <Label required>Ngày giờ mượn</Label>
            <div className="grid grid-cols-[1fr,auto] gap-2">
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
                className={fieldCls(errors.borrowDatetime)}
              />
              <select
                value={splitDatetime(form.borrowDatetime).time}
                onChange={(e) => set('borrowDatetime', joinDatetime(splitDatetime(form.borrowDatetime).date, e.target.value))}
                className={`${fieldCls(errors.borrowDatetime)} w-[88px]`}
              >
                {BORROW_TIME_SLOTS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            {errors.borrowDatetime && <p className="mt-1 text-xs text-red-500">{errors.borrowDatetime}</p>}
          </div>

          <div>
            <Label required>Ngày giờ trả</Label>
            <div className="grid grid-cols-[1fr,auto] gap-2">
              <input
                type="date"
                value={splitDatetime(form.returnDatetime).date}
                max={splitDatetime(maxReturnDatetime()).date}
                onChange={(e) => set('returnDatetime', joinDatetime(e.target.value, splitDatetime(form.returnDatetime).time))}
                className={fieldCls(errors.returnDatetime)}
              />
              <select
                value={splitDatetime(form.returnDatetime).time}
                onChange={(e) => set('returnDatetime', joinDatetime(splitDatetime(form.returnDatetime).date, e.target.value))}
                className={`${fieldCls(errors.returnDatetime)} w-[88px]`}
              >
                {RETURN_TIME_SLOTS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            {errors.returnDatetime && <p className="mt-1 text-xs text-red-500">{errors.returnDatetime}</p>}
          </div>

          <EquipmentScheduleList equipmentId={equipment.id} />

          <div>
            <Label required>Mục đích sử dụng</Label>
            <select value={form.purpose} onChange={(e) => set('purpose', e.target.value)} className={fieldCls(errors.purpose)}>
              <option value="">-- Chọn mục đích --</option>
              {PURPOSES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            {errors.purpose && <p className="mt-1 text-xs text-red-500">{errors.purpose}</p>}
          </div>

          {form.purpose === 'OTHER' && (
            <div>
              <Label required>Ghi rõ mục đích</Label>
              <input
                type="text"
                value={form.purposeNote}
                onChange={(e) => set('purposeNote', e.target.value)}
                className={fieldCls(errors.purposeNote)}
                placeholder="Mô tả mục đích sử dụng..."
              />
              {errors.purposeNote && <p className="mt-1 text-xs text-red-500">{errors.purposeNote}</p>}
            </div>
          )}

          <div>
            <Label>Ghi chú</Label>
            <textarea
              value={form.note}
              onChange={(e) => set('note', e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[16px] text-gray-800 bg-white resize-none outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              placeholder="Ghi chú thêm nếu cần (không bắt buộc)..."
            />
          </div>
        </div>

        {/* Cam kết */}
        <label
          className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 ${
            errors.agreed ? 'border-red-300 bg-red-50' : form.agreed ? 'border-action/30 bg-action/[0.06]' : 'border-gray-200 bg-gray-50'
          }`}
        >
          <input
            type="checkbox"
            checked={form.agreed}
            onChange={(e) => set('agreed', e.target.checked)}
            className="mt-0.5 w-5 h-5 rounded accent-action shrink-0"
          />
          <span className="text-xs text-gray-600 leading-snug">
            Tôi cam kết sử dụng thiết bị đúng mục đích, bảo quản cẩn thận và{' '}
            <span className="font-semibold text-gray-700">chịu trách nhiệm bồi thường theo quy định nếu làm hỏng hoặc mất thiết bị</span>.
          </span>
        </label>
        {errors.agreed && <p className="-mt-2 text-xs text-red-500">{errors.agreed}</p>}

        {errors.submit && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2.5 text-xs text-red-600">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {errors.submit}
          </div>
        )}
      </form>
    </MobileSheet>
  );
}
