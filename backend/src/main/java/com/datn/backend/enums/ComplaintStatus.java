package com.datn.backend.enums;

public enum ComplaintStatus {
    PENDING_REVIEW, // User vừa gửi, admin chưa xử lý
    ACCEPTED,       // Admin chấp nhận → phiếu BT bị CANCELLED
    REJECTED,       // Admin từ chối → phiếu BT giữ nguyên PENDING
    ADJUSTED        // Admin điều chỉnh số tiền → phiếu BT vẫn PENDING với amount mới
}
