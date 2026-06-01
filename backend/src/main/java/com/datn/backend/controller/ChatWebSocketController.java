package com.datn.backend.controller;

import java.security.Principal;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

import com.datn.backend.dto.ChatTypingEvent;
import com.datn.backend.service.ChatService;

// Xử lý STOMP frame ephemeral — chỉ typing event đi qua đây.
// Gửi tin chính thức dùng REST POST /api/v1/chat/messages để có validation đầy đủ.
@Controller
public class ChatWebSocketController {

    private final ChatService chatService;

    public ChatWebSocketController(ChatService chatService) {
        this.chatService = chatService;
    }

    // Client SEND tới /app/chat.typing — payload kèm targetUserId (admin) hoặc bỏ trống (user)
    @MessageMapping("/chat.typing")
    public void typing(@Payload ChatTypingEvent event, Principal principal) {
        if (principal == null) return;
        Long senderId = Long.valueOf(principal.getName());
        chatService.broadcastTyping(senderId, event.getTargetUserId(), event.isTyping());
    }
}
