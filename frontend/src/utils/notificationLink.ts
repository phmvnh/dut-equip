import type { NotificationType } from '../types/notification';

// Trả URL điều hướng khi click vào notification; null nghĩa là không điều hướng.
// Query `?tab=...` sẽ được BorrowPage đọc để mở đúng tab thay vì PENDING mặc định.
export function getNotificationLink(type: NotificationType): string | null {
  switch (type) {
    // ===== Admin notifications =====
    case 'NEW_BORROW_REQUEST':
    case 'BORROW_APPROVAL_REMINDER':
      return '/admin/borrow?tab=PENDING';
    case 'EQUIPMENT_BROKEN':
      // User chỉ báo hỏng được khi đơn APPROVED hoặc OVERDUE — mặc định mở tab Đã duyệt
      return '/admin/borrow?tab=APPROVED';
    case 'BORROW_RETURNED':
      return '/admin/borrow?tab=RETURNED';

    // ===== User notifications =====
    case 'BORROW_APPROVED':
    case 'BORROW_REJECTED':
    case 'RETURN_CONFIRMED':
    case 'RETURN_REMINDER':
    case 'OVERDUE_ALERT':
      return '/account/my-devices';

    // ===== Compensation =====
    case 'COMPENSATION_COMPLAINT_RECEIVED':
    case 'COMPENSATION_PROOF_SUBMITTED':
      return '/admin/compensations';
    case 'COMPENSATION_REQUIRED':
    case 'COMPENSATION_CONFIRMED':
    case 'COMPENSATION_COMPLAINT_RESOLVED':
      return '/account/compensations';

    default:
      return null;
  }
}
