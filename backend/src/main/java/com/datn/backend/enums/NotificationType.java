package com.datn.backend.enums;

public enum NotificationType {

    // Liên quan đến đơn mượn — gửi cho USER
    BORROW_APPROVED,      // Admin duyệt đơn mượn
    BORROW_REJECTED,      // Admin từ chối đơn mượn
    BORROW_CANCELLED,     // User tự hủy đơn (notify cho Admin biết)
    RETURN_REMINDER,      // Nhắc trả thiết bị (trước 1 ngày)
    OVERDUE_ALERT,        // Quá hạn chưa trả
    RETURN_CONFIRMED,     // Admin xác nhận user đã trả thiết bị

    // Liên quan đến đơn mượn — gửi cho ADMIN
    NEW_BORROW_REQUEST,        // User tạo đơn mới chờ duyệt
    BORROW_APPROVAL_REMINDER,  // Đơn PENDING sắp đến giờ mượn mà chưa được duyệt

    // Liên quan đến bảo trì — gửi cho ADMIN
    MAINTENANCE_DONE,     // Bảo trì hoàn thành → thiết bị sẵn sàng

    // Liên quan đến thiết bị — gửi cho ADMIN
    EQUIPMENT_BROKEN,     // Thiết bị báo hỏng
    WARRANTY_EXPIRING,    // Bảo hành sắp hết hạn (30 ngày)

    // Liên quan đến bồi thường
    COMPENSATION_REQUIRED,            // Gửi USER khi admin tạo phiếu bồi thường
    COMPENSATION_CONFIRMED,           // Gửi USER khi admin xác nhận đã nhận tiền
    COMPENSATION_PROOF_SUBMITTED,     // Gửi ADMIN khi giảng viên nộp minh chứng đã bồi thường
    COMPENSATION_COMPLAINT_RECEIVED,  // Gửi ADMIN khi user khiếu nại
    COMPENSATION_COMPLAINT_RESOLVED,  // Gửi USER khi admin xử lý khiếu nại

    // Liên quan đến mua sắm — gửi cho ADMIN
    PROCUREMENT_SUBMITTED,   // Lập đề nghị mua sắm mới (chờ duyệt)
    PROCUREMENT_APPROVED,    // Đề nghị mua sắm đã được duyệt (ghi nhận quyết định)
    PROCUREMENT_REJECTED,    // Đề nghị mua sắm bị từ chối
    PROCUREMENT_COMPLETED,   // Đã nghiệm thu, nhập kho → sinh thiết bị

    // Liên quan đến thanh lý — gửi cho ADMIN
    DISPOSAL_SUBMITTED,      // Lập đề nghị thanh lý mới (chờ duyệt)
    DISPOSAL_APPROVED,       // Đề nghị thanh lý đã được duyệt (ghi nhận quyết định)
    DISPOSAL_REJECTED,       // Đề nghị thanh lý bị từ chối
    DISPOSAL_COMPLETED       // Đã thực hiện thanh lý → thiết bị ghi giảm (DISPOSED)
}