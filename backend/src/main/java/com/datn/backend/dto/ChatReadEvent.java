package com.datn.backend.dto;

import java.time.LocalDateTime;

import com.datn.backend.enums.UserRole;

// Khi một phía đánh dấu đã đọc, đẩy event sang phía còn lại để cập nhật UI.
public class ChatReadEvent {

    private Long conversationId;
    private UserRole readerRole;   // vai trò người vừa đọc
    private LocalDateTime readAt;

    public ChatReadEvent() {}

    public ChatReadEvent(Long conversationId, UserRole readerRole, LocalDateTime readAt) {
        this.conversationId = conversationId;
        this.readerRole     = readerRole;
        this.readAt         = readAt;
    }

    public Long getConversationId() { return conversationId; }
    public void setConversationId(Long conversationId) { this.conversationId = conversationId; }

    public UserRole getReaderRole() { return readerRole; }
    public void setReaderRole(UserRole readerRole) { this.readerRole = readerRole; }

    public LocalDateTime getReadAt() { return readAt; }
    public void setReadAt(LocalDateTime readAt) { this.readAt = readAt; }
}
