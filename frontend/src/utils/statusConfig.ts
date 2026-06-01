import type { EquipmentStatus } from '../types/equipment';

export const statusConfig: Record<EquipmentStatus, { label: string; color: string }> = {
  AVAILABLE: { label: 'Sẵn sàng', color: 'bg-green-100 text-green-700' },
  BORROWED: { label: 'Đang mượn', color: 'bg-amber-100 text-amber-700' },
  MAINTENANCE: { label: 'Bảo trì', color: 'bg-purple-100 text-purple-700' },
  BROKEN: { label: 'Hỏng', color: 'bg-red-100 text-red-700' },
  DISPOSED: { label: 'Đã thanh lý', color: 'bg-gray-200 text-gray-600' },
};
