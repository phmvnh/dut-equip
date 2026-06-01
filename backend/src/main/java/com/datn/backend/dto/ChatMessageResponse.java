package com.datn.backend.dto;

import java.time.LocalDateTime;

import com.datn.backend.entity.ChatMessage;
import com.datn.backend.enums.MessageType;
import com.datn.backend.enums.UserRole;

public class ChatMessageResponse {

    private Long id;
    private Long conversationId;
    private Long senderId;
    private String senderName;
    private UserRole senderRole;
    private MessageType type;
    private String content;
    private String attachmentUrl;
    private String attachmentName;
    private Long attachmentSize;
    private boolean isRead;
    private LocalDateTime readAt;
    private LocalDateTime createdAt;

    public static ChatMessageResponse from(ChatMessage m) {
        ChatMessageResponse r = new ChatMessageResponse();
        r.id              = m.getId();
        r.conversationId  = m.getConversation().getId();
        r.senderId        = m.getSender().getId();
        r.senderName      = m.getSender().getFullName();
        r.senderRole      = m.getSenderRole();
        r.type            = m.getType();
        r.content         = m.getContent();
        r.attachmentUrl   = m.getAttachmentUrl();
        r.attachmentName  = m.getAttachmentName();
        r.attachmentSize  = m.getAttachmentSize();
        r.isRead          = m.isRead();
        r.readAt          = m.getReadAt();
        r.createdAt       = m.getCreatedAt();
        return r;
    }

    public Long getId() { return id; }
    public Long getConversationId() { return conversationId; }
    public Long getSenderId() { return senderId; }
    public String getSenderName() { return senderName; }
    public UserRole getSenderRole() { return senderRole; }
    public MessageType getType() { return type; }
    public String getContent() { return content; }
    public String getAttachmentUrl() { return attachmentUrl; }
    public String getAttachmentName() { return attachmentName; }
    public Long getAttachmentSize() { return attachmentSize; }
    public boolean isRead() { return isRead; }
    public LocalDateTime getReadAt() { return readAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
