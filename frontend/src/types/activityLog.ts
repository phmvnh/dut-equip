export type ActivityType =
  | 'BORROW_APPROVED'
  | 'BORROW_REJECTED'
  | 'BORROW_RETURN_CONFIRMED'
  | 'MAINTENANCE_CREATED'
  | 'MAINTENANCE_COMPLETED'
  | 'MAINTENANCE_CANCELLED'
  | 'COMPENSATION_CREATED'
  | 'COMPENSATION_PAID'
  | 'COMPENSATION_CANCELLED'
  | 'COMPLAINT_RESOLVED'
  | 'EQUIPMENT_ADDED'
  | 'EQUIPMENT_DISPOSED'
  | 'USER_CREATED';

export type ActivityTargetType = 'BORROW' | 'MAINTENANCE' | 'COMPENSATION' | 'EQUIPMENT' | 'USER';

export interface ActivityLogItem {
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  targetType: ActivityTargetType;
  targetId: number;
}

export type ActivityPeriod = 'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'ALL';
