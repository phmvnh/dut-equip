package com.datn.backend.dto;

import java.time.LocalDateTime;

import com.datn.backend.entity.Notification;

public class NotificationResponse {

    private Long id;
    private String type;
    private String title;
    private String message;
    private boolean isRead;
    private LocalDateTime createdAt;

    public static NotificationResponse from(Notification n) {
        NotificationResponse dto = new NotificationResponse();
        dto.id        = n.getId();
        dto.type      = n.getType().name();
        dto.title     = n.getTitle();
        dto.message   = n.getMessage();
        dto.isRead    = n.isRead();
        dto.createdAt = n.getCreatedAt();
        return dto;
    }

    public Long getId() { return id; }
    public String getType() { return type; }
    public String getTitle() { return title; }
    public String getMessage() { return message; }
    public boolean isRead() { return isRead; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
