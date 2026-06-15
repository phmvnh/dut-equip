package com.datn.backend.service;

public interface EmailService {

    // Gửi 1 email thông báo (chạy bất đồng bộ, lỗi được nuốt — không phá luồng thông báo in-app)
    void sendNotification(String to, String title, String message);
}
