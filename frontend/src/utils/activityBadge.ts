import type { ActivityTargetType, ActivityType } from '../types/activityLog';

// Màu badge theo nhóm target — đồng bộ với màu pill ở các trang admin tương ứng
export const ACTIVITY_BADGE_CLASS: Record<ActivityTargetType, string> = {
  BORROW:       'bg-blue-100 text-blue-700',
  MAINTENANCE:  'bg-amber-100 text-amber-700',
  COMPENSATION: 'bg-red-100 text-red-700',
  EQUIPMENT:    'bg-emerald-100 text-emerald-700',
  USER:         'bg-slate-100 text-slate-700',
  PROCUREMENT:  'bg-indigo-100 text-indigo-700',
  DISPOSAL:     'bg-rose-100 text-rose-700',
  DEPT_LOAN:    'bg-violet-100 text-violet-700',
};

export const ACTIVITY_TARGET_LABEL: Record<ActivityTargetType, string> = {
  BORROW:       'Đơn mượn',
  MAINTENANCE:  'Bảo trì',
  COMPENSATION: 'Bồi thường',
  EQUIPMENT:    'Thiết bị',
  USER:         'Người dùng',
  PROCUREMENT:  'Mua sắm',
  DISPOSAL:     'Thanh lý',
  DEPT_LOAN:    'Mượn khoa',
};

// Trang đích khi click vào activity item
export function getActivityLink(type: ActivityType): string | undefined {
  if (type.startsWith('BORROW_')) return '/admin/borrow';
  if (type.startsWith('MAINTENANCE_')) return '/admin/maintenance';
  if (type.startsWith('COMPENSATION_') || type === 'COMPLAINT_RESOLVED') return '/admin/compensations';
  if (type.startsWith('EQUIPMENT_')) return '/admin/equipments';
  if (type.startsWith('USER_')) return '/admin/users';
  if (type.startsWith('PROCUREMENT_')) return '/admin/procurements';
  if (type.startsWith('DISPOSAL_')) return '/admin/disposals';
  if (type.startsWith('DEPT_LOAN_')) return '/admin/borrow';
  return undefined;
}
