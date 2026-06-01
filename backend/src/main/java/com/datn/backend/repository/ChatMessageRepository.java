package com.datn.backend.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.datn.backend.entity.ChatMessage;
import com.datn.backend.enums.UserRole;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    Page<ChatMessage> findByConversationIdOrderByCreatedAtDesc(Long conversationId, Pageable pageable);

    long countByConversationIdAndSenderRoleAndIsReadFalse(Long conversationId, UserRole senderRole);

    // Tổng số tin chưa đọc mà phía đối diện đã gửi cho user role này
    // (admin xem unread tổng từ phía USER, user xem unread từ phía ADMIN)
    @Query("SELECT COUNT(m) FROM ChatMessage m WHERE m.senderRole = :senderRole AND m.isRead = false")
    long countUnreadFromRole(@Param("senderRole") UserRole senderRole);

    // Đánh dấu đã đọc — chỉ áp dụng cho tin từ vai trò opposite
    @Modifying
    @Query("UPDATE ChatMessage m SET m.isRead = true, m.readAt = CURRENT_TIMESTAMP " +
           "WHERE m.conversation.id = :conversationId AND m.senderRole = :senderRole AND m.isRead = false")
    int markAsReadByRole(@Param("conversationId") Long conversationId,
                         @Param("senderRole") UserRole senderRole);
}
