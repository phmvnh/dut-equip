package com.datn.backend.enums;

public enum CompensationStatus {
    PENDING,   // Chờ giảng viên nộp tiền
    PAID,      // Admin xác nhận đã nhận tiền
    CANCELLED  // Admin hủy (vd: chấp nhận khiếu nại)
}
