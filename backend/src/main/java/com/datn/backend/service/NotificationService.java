package com.datn.backend.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.datn.backend.dto.NotificationResponse;
import com.datn.backend.enums.NotificationType;

public interface NotificationService {

    // Tạo notification cho 1 user — vừa save DB vừa push qua STOMP
    void create(Long userId, NotificationType type, String title, String message);

    // Fan-out cho tất cả admin đang active
    void createForAllAdmins(NotificationType type, String title, String message);

    Page<NotificationResponse> getMyNotifications(Long userId, NotificationType type, Pageable pageable);

    long getUnreadCount(Long userId);

    void markAsRead(Long userId, Long notificationId);

    void markAllAsRead(Long userId);
}
