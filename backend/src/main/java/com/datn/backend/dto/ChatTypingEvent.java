package com.datn.backend.dto;

import com.datn.backend.enums.UserRole;

// Event ephemeral báo "đang gõ" — không lưu DB.
public class ChatTypingEvent {

    private Long conversationId;
    private Long senderId;
    private String senderName;
    private UserRole senderRole;
    private boolean typing;

    public ChatTypingEvent() {}

    public ChatTypingEvent(Long conversationId, Long senderId, String senderName, UserRole senderRole, boolean typing) {
        this.conversationId = conversationId;
        this.senderId       = senderId;
        this.senderName     = senderName;
        this.senderRole     = senderRole;
        this.typing         = typing;
    }

    public Long getConversationId() { return conversationId; }
    public void setConversationId(Long conversationId) { this.conversationId = conversationId; }

    public Long getSenderId() { return senderId; }
    public void setSenderId(Long senderId) { this.senderId = senderId; }

    public String getSenderName() { return senderName; }
    public void setSenderName(String senderName) { this.senderName = senderName; }

    public UserRole getSenderRole() { return senderRole; }
    public void setSenderRole(UserRole senderRole) { this.senderRole = senderRole; }

    public boolean isTyping() { return typing; }
    public void setTyping(boolean typing) { this.typing = typing; }

    // Admin gửi typing chỉ cần targetUserId — không có conversationId trên client
    private Long targetUserId;
    public Long getTargetUserId() { return targetUserId; }
    public void setTargetUserId(Long targetUserId) { this.targetUserId = targetUserId; }
}
