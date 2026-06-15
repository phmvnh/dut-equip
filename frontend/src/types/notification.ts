export type NotificationType =
  | 'BORROW_APPROVED'
  | 'BORROW_REJECTED'
  | 'BORROW_CANCELLED'
  | 'RETURN_REMINDER'
  | 'OVERDUE_ALERT'
  | 'RETURN_CONFIRMED'
  | 'NEW_BORROW_REQUEST'
  | 'BORROW_APPROVAL_REMINDER'
  | 'BORROW_RETURNED'
  | 'MAINTENANCE_REMINDER'
  | 'MAINTENANCE_DONE'
  | 'EQUIPMENT_BROKEN'
  | 'WARRANTY_EXPIRING'
  | 'COMPENSATION_REQUIRED'
  | 'COMPENSATION_CONFIRMED'
  | 'COMPENSATION_PROOF_SUBMITTED'
  | 'COMPENSATION_COMPLAINT_RECEIVED'
  | 'COMPENSATION_COMPLAINT_RESOLVED';

export interface NotificationItem {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

// Nhãn tiếng Việt cho từng loại thông báo (dùng cho badge / filter)
export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  BORROW_APPROVED:      'Đơn được duyệt',
  BORROW_REJECTED:      'Đơn bị từ chối',
  BORROW_CANCELLED:     'Đơn đã hủy',
  RETURN_REMINDER:      'Nhắc trả thiết bị',
  OVERDUE_ALERT:        'Quá hạn',
  RETURN_CONFIRMED:     'Xác nhận trả thiết bị',
  NEW_BORROW_REQUEST:   'Đơn mượn mới',
  BORROW_APPROVAL_REMINDER: 'Sắp đến giờ bắt đầu mượn thiết bị',
  BORROW_RETURNED:      'Đã trả thiết bị',
  MAINTENANCE_REMINDER: 'Nhắc bảo trì',
  MAINTENANCE_DONE:     'Bảo trì hoàn tất',
  EQUIPMENT_BROKEN:     'Thiết bị hỏng',
  WARRANTY_EXPIRING:    'Sắp hết bảo hành',
  COMPENSATION_REQUIRED:           'Yêu cầu bồi thường',
  COMPENSATION_CONFIRMED:          'Xác nhận bồi thường',
  COMPENSATION_PROOF_SUBMITTED:    'Minh chứng bồi thường',
  COMPENSATION_COMPLAINT_RECEIVED: 'Khiếu nại bồi thường',
  COMPENSATION_COMPLAINT_RESOLVED: 'Xử lý khiếu nại',
};

