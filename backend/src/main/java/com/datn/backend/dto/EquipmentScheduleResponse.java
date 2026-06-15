package com.datn.backend.dto;

import java.time.LocalDateTime;

import com.datn.backend.entity.BorrowRequest;

// Khung giờ đã đặt của 1 thiết bị — dùng cho USER xem khi chọn giờ mượn.
// CHỈ trả thời gian + trạng thái, KHÔNG kèm thông tin người mượn (tránh lộ PII).
public class EquipmentScheduleResponse {

    private LocalDateTime borrowDateTime;
    private LocalDateTime returnDateTime;
    private String status;

    public static EquipmentScheduleResponse from(BorrowRequest b) {
        EquipmentScheduleResponse r = new EquipmentScheduleResponse();
        r.borrowDateTime = b.getBorrowDateTime();
        r.returnDateTime = b.getReturnDateTime();
        r.status = b.getStatus().name();
        return r;
    }

    public LocalDateTime getBorrowDateTime() { return borrowDateTime; }
    public LocalDateTime getReturnDateTime() { return returnDateTime; }
    public String getStatus() { return status; }
}
