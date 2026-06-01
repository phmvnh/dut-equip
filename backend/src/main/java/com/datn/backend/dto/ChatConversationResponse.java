package com.datn.backend.dto;

import java.time.LocalDateTime;

import com.datn.backend.entity.ChatConversation;
import com.datn.backend.entity.ChatMessage;
import com.datn.backend.entity.User;
import com.datn.backend.enums.MessageType;

// Một dòng trong danh sách hội thoại (chủ yếu cho trang Admin).
public class ChatConversationResponse {

    private Long id;
    private Long userId;
    private String userFullName;
    private String userEmail;
    private String userAvatarUrl;
    private String userFaculty;
    private LocalDateTime lastMessageAt;
    private String lastMessageContent;
    private MessageType lastMessageType;
    private long unreadCount; // tin chưa đọc tới phía người gọi API

    public static ChatConversationResponse from(ChatConversation conv,
                                                ChatMessage lastMessage,
                                                long unreadCount) {
        ChatConversationResponse r = new ChatConversationResponse();
        User u = conv.getUser();
        r.id            = conv.getId();
        r.userId        = u.getId();
        r.userFullName  = u.getFullName();
        r.userEmail     = u.getEmail();
        r.userAvatarUrl = u.getAvatarUrl();
        r.userFaculty   = u.getFaculty();
        r.lastMessageAt = conv.getLastMessageAt();
        r.unreadCount   = unreadCount;
        if (lastMessage != null) {
            r.lastMessageContent = lastMessage.getContent();
            r.lastMessageType    = lastMessage.getType();
        }
        return r;
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public String getUserFullName() { return userFullName; }
    public String getUserEmail() { return userEmail; }
    public String getUserAvatarUrl() { return userAvatarUrl; }
    public String getUserFaculty() { return userFaculty; }
    public LocalDateTime getLastMessageAt() { return lastMessageAt; }
    public String getLastMessageContent() { return lastMessageContent; }
    public MessageType getLastMessageType() { return lastMessageType; }
    public long getUnreadCount() { return unreadCount; }
}
