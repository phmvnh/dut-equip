package com.datn.backend.dto;

import com.datn.backend.enums.MessageType;

import jakarta.validation.constraints.Size;

// Body khi gửi tin nhắn — admin phải kèm targetUserId; user thì bỏ qua, server dùng auth.
public class SendChatMessageRequest {

    // Admin: bắt buộc — id của giảng viên nhận tin. User: bỏ trống.
    private Long targetUserId;

    private MessageType type = MessageType.TEXT;

    @Size(max = 5000, message = "Tin nhắn quá dài (tối đa 5000 ký tự)")
    private String content;

    @Size(max = 500)
    private String attachmentUrl;

    @Size(max = 255)
    private String attachmentName;

    private Long attachmentSize;

    public Long getTargetUserId() { return targetUserId; }
    public void setTargetUserId(Long targetUserId) { this.targetUserId = targetUserId; }

    public MessageType getType() { return type; }
    public void setType(MessageType type) { this.type = type; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getAttachmentUrl() { return attachmentUrl; }
    public void setAttachmentUrl(String attachmentUrl) { this.attachmentUrl = attachmentUrl; }

    public String getAttachmentName() { return attachmentName; }
    public void setAttachmentName(String attachmentName) { this.attachmentName = attachmentName; }

    public Long getAttachmentSize() { return attachmentSize; }
    public void setAttachmentSize(Long attachmentSize) { this.attachmentSize = attachmentSize; }
}
