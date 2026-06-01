package com.datn.backend.dto;

import java.time.LocalDateTime;

// Một item trong feed Lịch sử hoạt động của Admin
// Tổng hợp từ BorrowRequest / MaintenanceLog / CompensationClaim / Equipment / User
public class ActivityLogResponse {

    private String type;        // BORROW_APPROVED, MAINTENANCE_CREATED, ...
    private String title;       // "Đã duyệt đơn mượn #123"
    private String description; // "Thiết bị: Laptop Dell — Người mượn: Nguyễn Văn A"
    private LocalDateTime timestamp;
    private String targetType;  // BORROW | MAINTENANCE | COMPENSATION | EQUIPMENT | USER
    private Long targetId;

    public ActivityLogResponse() {}

    public ActivityLogResponse(String type, String title, String description,
                               LocalDateTime timestamp, String targetType, Long targetId) {
        this.type = type;
        this.title = title;
        this.description = description;
        this.timestamp = timestamp;
        this.targetType = targetType;
        this.targetId = targetId;
    }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public LocalDateTime getTimestamp() { return timestamp; }
    public void setTimestamp(LocalDateTime timestamp) { this.timestamp = timestamp; }

    public String getTargetType() { return targetType; }
    public void setTargetType(String targetType) { this.targetType = targetType; }

    public Long getTargetId() { return targetId; }
    public void setTargetId(Long targetId) { this.targetId = targetId; }
}
