import { useQuery } from '@tanstack/react-query';
import { borrowApi, type EquipmentScheduleSlot } from '../api/borrowApi';

// Nhãn + màu cho từng trạng thái khung giờ đã đặt
const STATUS_META: Record<EquipmentScheduleSlot['status'], { text: string; cls: string }> = {
  PENDING:  { text: 'Chờ duyệt', cls: 'bg-amber-100 text-amber-700' },
  APPROVED: { text: 'Đang mượn', cls: 'bg-blue-100 text-blue-700' },
  OVERDUE:  { text: 'Quá hạn',   cls: 'bg-red-100 text-red-700' },
};

// "HH:mm dd/MM" — gọn để 1 dòng chứa được cả khoảng giờ
function fmt(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())} ${p(d.getDate())}/${p(d.getMonth() + 1)}`;
}

interface Props {
  equipmentId: number;
  className?: string;
}

/**
 * Danh sách các khung giờ đã có người đặt mượn của 1 thiết bị.
 * Tự ẩn khi thiết bị chưa có khung giờ nào bị đặt. Chỉ hiện giờ + trạng thái (không lộ người mượn).
 */
export default function EquipmentScheduleList({ equipmentId, className }: Props) {
  const { data } = useQuery({
    queryKey: ['equip-schedule', equipmentId],
    queryFn: () => borrowApi.getScheduleByEquipment(equipmentId),
  });

  if (!data || data.length === 0) return null;

  return (
    <div className={className}>
      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
        Khung giờ đã có người đặt
      </h4>
      <ul className="space-y-1.5 max-h-40 overflow-y-auto">
        {data.map((s, i) => {
          const meta = STATUS_META[s.status];
          return (
            <li
              key={i}
              className="flex items-center justify-between gap-2 flex-wrap bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5"
            >
              <span className="text-sm text-gray-700 tabular-nums">
                {fmt(s.borrowDateTime)} → {fmt(s.returnDateTime)}
              </span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${meta.cls}`}>
                {meta.text}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
