package com.datn.backend.service;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.datn.backend.dto.ChatConversationResponse;
import com.datn.backend.dto.ChatMessageResponse;
import com.datn.backend.dto.SendChatMessageRequest;

public interface ChatService {

    // Gửi tin từ user role hiện tại tới phía bên kia.
    // - USER: targetUserId bị bỏ qua, conversation = của chính user.
    // - ADMIN: bắt buộc kèm targetUserId trong request.
    ChatMessageResponse sendMessage(Long senderId, SendChatMessageRequest req);

    // Lịch sử tin — page=0 là tin mới nhất, đảo ngược ở client để hiện thị từ cũ → mới.
    Page<ChatMessageResponse> getMessages(Long currentUserId, Long otherUserId, Pageable pageable);

    // Đánh dấu mọi tin tới đối diện đã đọc. Trả số tin vừa được mark.
    int markConversationRead(Long currentUserId, Long otherUserId);

    // Tổng tin chưa đọc cho người dùng hiện tại.
    long getUnreadCount(Long currentUserId);

    // Danh sách hội thoại — chỉ admin gọi.
    List<ChatConversationResponse> listConversationsForAdmin();

    // Hội thoại 1-1 hiện tại của user (tạo mới nếu chưa có) — cho widget user.
    ChatConversationResponse getOrCreateForUser(Long userId);

    // Push typing event tới phía bên kia.
    void broadcastTyping(Long senderId, Long targetUserId, boolean typing);
}
