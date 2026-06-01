package com.datn.backend.controller;

import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.datn.backend.dto.ChatConversationResponse;
import com.datn.backend.dto.ChatMessageResponse;
import com.datn.backend.dto.SendChatMessageRequest;
import com.datn.backend.entity.User;
import com.datn.backend.exception.ResourceNotFoundException;
import com.datn.backend.repository.UserRepository;
import com.datn.backend.service.ChatService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/chat")
public class ChatController {

    private final ChatService chatService;
    private final UserRepository userRepository;

    public ChatController(ChatService chatService, UserRepository userRepository) {
        this.chatService    = chatService;
        this.userRepository = userRepository;
    }

    // GET /api/v1/chat/messages?otherUserId=&page=&size=
    // - USER: bỏ otherUserId; server tự dùng conversation của mình.
    // - ADMIN: bắt buộc kèm otherUserId của giảng viên.
    @GetMapping("/messages")
    public ResponseEntity<Page<ChatMessageResponse>> messages(
            @RequestParam(required = false) Long otherUserId,
            @PageableDefault(size = 30, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(chatService.getMessages(currentUserId(), otherUserId, pageable));
    }

    // POST /api/v1/chat/messages
    @PostMapping("/messages")
    public ResponseEntity<ChatMessageResponse> send(@RequestBody @Valid SendChatMessageRequest req) {
        return ResponseEntity.ok(chatService.sendMessage(currentUserId(), req));
    }

    // PATCH /api/v1/chat/read?otherUserId=
    @PatchMapping("/read")
    public ResponseEntity<Map<String, Integer>> markRead(@RequestParam(required = false) Long otherUserId) {
        int updated = chatService.markConversationRead(currentUserId(), otherUserId);
        return ResponseEntity.ok(Map.of("updated", updated));
    }

    // GET /api/v1/chat/unread-count
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> unreadCount() {
        return ResponseEntity.ok(Map.of("count", chatService.getUnreadCount(currentUserId())));
    }

    // GET /api/v1/chat/conversations — admin only
    @GetMapping("/conversations")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ChatConversationResponse>> listConversations() {
        return ResponseEntity.ok(chatService.listConversationsForAdmin());
    }

    // GET /api/v1/chat/my-conversation — user only (lấy/tạo conversation của mình)
    @GetMapping("/my-conversation")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<ChatConversationResponse> myConversation() {
        return ResponseEntity.ok(chatService.getOrCreateForUser(currentUserId()));
    }

    private Long currentUserId() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));
        return user.getId();
    }
}
