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
    NEW_BORROW_REQUEST,   // User tạo đơn mới chờ duyệt
    BORROW_RETURNED,      // User xác nhận đã trả

    // Liên quan đến bảo trì — gửi cho ADMIN
    MAINTENANCE_REMINDER, // Thiết bị sắp đến hạn bảo trì
    MAINTENANCE_DONE,     // Bảo trì hoàn thành → thiết bị sẵn sàng

    // Liên quan đến thiết bị — gửi cho ADMIN
    EQUIPMENT_BROKEN,     // Thiết bị báo hỏng
    WARRANTY_EXPIRING,    // Bảo hành sắp hết hạn (30 ngày)

    // Liên quan đến bồi thường
    COMPENSATION_REQUIRED,           // Gửi USER khi admin tạo phiếu bồi thường
    COMPENSATION_CONFIRMED,          // Gửi USER khi admin xác nhận đã nhận tiền
    COMPENSATION_COMPLAINT_RECEIVED, // Gửi ADMIN khi user khiếu nại
    COMPENSATION_COMPLAINT_RESOLVED  // Gửi USER khi admin xử lý khiếu nại
}