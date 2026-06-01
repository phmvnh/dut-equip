package com.datn.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.datn.backend.entity.ChatConversation;

public interface ChatConversationRepository extends JpaRepository<ChatConversation, Long> {

    Optional<ChatConversation> findByUserId(Long userId);

    // Sắp xếp theo last_message_at giảm dần — cuộc trò chuyện hoạt động gần nhất lên đầu.
    // Cuộc mới tạo chưa có tin (last_message_at NULL) sẽ xuống cuối.
    @Query("SELECT c FROM ChatConversation c " +
           "JOIN FETCH c.user u " +
           "ORDER BY CASE WHEN c.lastMessageAt IS NULL THEN 1 ELSE 0 END, c.lastMessageAt DESC")
    List<ChatConversation> findAllOrderByLastMessage();
}
