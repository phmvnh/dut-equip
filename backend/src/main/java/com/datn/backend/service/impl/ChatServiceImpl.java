package com.datn.backend.service.impl;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.datn.backend.dto.ChatConversationResponse;
import com.datn.backend.dto.ChatMessageResponse;
import com.datn.backend.dto.ChatReadEvent;
import com.datn.backend.dto.ChatTypingEvent;
import com.datn.backend.dto.SendChatMessageRequest;
import com.datn.backend.entity.ChatConversation;
import com.datn.backend.entity.ChatMessage;
import com.datn.backend.entity.User;
import com.datn.backend.enums.MessageType;
import com.datn.backend.enums.UserRole;
import com.datn.backend.exception.BadRequestException;
import com.datn.backend.exception.ResourceNotFoundException;
import com.datn.backend.repository.ChatConversationRepository;
import com.datn.backend.repository.ChatMessageRepository;
import com.datn.backend.repository.UserRepository;
import com.datn.backend.service.ChatService;

@Service
@Transactional
public class ChatServiceImpl implements ChatService {

    private static final Logger log = LoggerFactory.getLogger(ChatServiceImpl.class);

    private static final String QUEUE_MESSAGE = "/queue/chat.message";
    private static final String QUEUE_READ    = "/queue/chat.read";
    private static final String QUEUE_TYPING  = "/queue/chat.typing";

    private final ChatConversationRepository conversationRepo;
    private final ChatMessageRepository messageRepo;
    private final UserRepository userRepo;
    private final SimpMessagingTemplate messaging;

    public ChatServiceImpl(ChatConversationRepository conversationRepo,
                           ChatMessageRepository messageRepo,
                           UserRepository userRepo,
                           SimpMessagingTemplate messaging) {
        this.conversationRepo = conversationRepo;
        this.messageRepo      = messageRepo;
        this.userRepo         = userRepo;
        this.messaging        = messaging;
    }

    @Override
    public ChatMessageResponse sendMessage(Long senderId, SendChatMessageRequest req) {
        User sender = userRepo.findById(senderId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người gửi"));

        // Xác định ai sở hữu conversation (luôn là USER)
        Long ownerUserId;
        if (sender.getRole() == UserRole.USER) {
            ownerUserId = sender.getId();
        } else {
            if (req.getTargetUserId() == null) {
                throw new BadRequestException("Admin phải chọn giảng viên để nhắn tin");
            }
            User target = userRepo.findById(req.getTargetUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giảng viên"));
            if (target.getRole() != UserRole.USER) {
                throw new BadRequestException("Chỉ có thể nhắn tin cho giảng viên");
            }
            ownerUserId = target.getId();
        }

        MessageType type = req.getType() == null ? MessageType.TEXT : req.getType();
        boolean hasText = req.getContent() != null && !req.getContent().isBlank();
        boolean hasAttachment = req.getAttachmentUrl() != null && !req.getAttachmentUrl().isBlank();
        if (type == MessageType.TEXT && !hasText) {
            throw new BadRequestException("Nội dung tin nhắn không được trống");
        }
        if ((type == MessageType.IMAGE || type == MessageType.FILE) && !hasAttachment) {
            throw new BadRequestException("Thiếu file đính kèm");
        }

        ChatConversation conv = conversationRepo.findByUserId(ownerUserId)
                .orElseGet(() -> createConversation(ownerUserId));

        ChatMessage msg = new ChatMessage();
        msg.setConversation(conv);
        msg.setSender(sender);
        msg.setSenderRole(sender.getRole());
        msg.setType(type);
        msg.setContent(hasText ? req.getContent() : null);
        msg.setAttachmentUrl(hasAttachment ? req.getAttachmentUrl() : null);
        msg.setAttachmentName(req.getAttachmentName());
        msg.setAttachmentSize(req.getAttachmentSize());
        ChatMessage saved = messageRepo.save(msg);

        conv.setLastMessageAt(saved.getCreatedAt());

        ChatMessageResponse dto = ChatMessageResponse.from(saved);
        pushToRecipients(sender, ownerUserId, dto);
        log.debug("Chat {} -> conv {} (sender role {})", saved.getId(), conv.getId(), sender.getRole());
        return dto;
    }

    private ChatConversation createConversation(Long ownerUserId) {
        User owner = userRepo.findById(ownerUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giảng viên"));
        if (owner.getRole() != UserRole.USER) {
            throw new BadRequestException("Cuộc trò chuyện phải thuộc về giảng viên");
        }
        ChatConversation c = new ChatConversation();
        c.setUser(owner);
        return conversationRepo.save(c);
    }

    // USER gửi -> fan-out cho mọi admin active. ADMIN gửi -> chỉ user sở hữu hội thoại.
    private void pushToRecipients(User sender, Long ownerUserId, ChatMessageResponse dto) {
        if (sender.getRole() == UserRole.USER) {
            for (Long adminId : userRepo.findAllActiveAdminIds()) {
                messaging.convertAndSendToUser(adminId.toString(), QUEUE_MESSAGE, dto);
            }
        } else {
            messaging.convertAndSendToUser(ownerUserId.toString(), QUEUE_MESSAGE, dto);
            // Echo cho các admin khác cùng cập nhật UI
            for (Long adminId : userRepo.findAllActiveAdminIds()) {
                if (!adminId.equals(sender.getId())) {
                    messaging.convertAndSendToUser(adminId.toString(), QUEUE_MESSAGE, dto);
                }
            }
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ChatMessageResponse> getMessages(Long currentUserId, Long otherUserId, Pageable pageable) {
        User current = userRepo.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));
        Long ownerUserId = (current.getRole() == UserRole.USER) ? current.getId() : otherUserId;
        if (ownerUserId == null) {
            return new PageImpl<>(List.of(), pageable, 0);
        }

        ChatConversation conv = conversationRepo.findByUserId(ownerUserId).orElse(null);
        if (conv == null) {
            return new PageImpl<>(List.of(), pageable, 0);
        }
        return messageRepo
                .findByConversationIdOrderByCreatedAtDesc(conv.getId(), pageable)
                .map(ChatMessageResponse::from);
    }

    @Override
    public int markConversationRead(Long currentUserId, Long otherUserId) {
        User current = userRepo.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));
        Long ownerUserId = (current.getRole() == UserRole.USER) ? current.getId() : otherUserId;
        if (ownerUserId == null) {
            throw new BadRequestException("Thiếu thông tin cuộc trò chuyện");
        }
        ChatConversation conv = conversationRepo.findByUserId(ownerUserId).orElse(null);
        if (conv == null) return 0;

        UserRole oppositeRole = (current.getRole() == UserRole.USER) ? UserRole.ADMIN : UserRole.USER;
        int updated = messageRepo.markAsReadByRole(conv.getId(), oppositeRole);
        if (updated > 0) {
            LocalDateTime now = LocalDateTime.now();
            ChatReadEvent event = new ChatReadEvent(conv.getId(), current.getRole(), now);
            // Báo cho phía đối diện
            if (current.getRole() == UserRole.USER) {
                for (Long adminId : userRepo.findAllActiveAdminIds()) {
                    messaging.convertAndSendToUser(adminId.toString(), QUEUE_READ, event);
                }
            } else {
                messaging.convertAndSendToUser(ownerUserId.toString(), QUEUE_READ, event);
            }
        }
        return updated;
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount(Long currentUserId) {
        User current = userRepo.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));
        if (current.getRole() == UserRole.USER) {
            ChatConversation conv = conversationRepo.findByUserId(current.getId()).orElse(null);
            if (conv == null) return 0;
            return messageRepo.countByConversationIdAndSenderRoleAndIsReadFalse(conv.getId(), UserRole.ADMIN);
        }
        // Admin: tổng số tin USER chưa đọc qua toàn hệ thống
        return messageRepo.countUnreadFromRole(UserRole.USER);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChatConversationResponse> listConversationsForAdmin() {
        List<ChatConversation> list = conversationRepo.findAllOrderByLastMessage();
        List<ChatConversationResponse> out = new ArrayList<>(list.size());
        for (ChatConversation c : list) {
            ChatMessage last = messageRepo
                    .findByConversationIdOrderByCreatedAtDesc(c.getId(), PageRequest.of(0, 1))
                    .stream().findFirst().orElse(null);
            long unread = messageRepo
                    .countByConversationIdAndSenderRoleAndIsReadFalse(c.getId(), UserRole.USER);
            out.add(ChatConversationResponse.from(c, last, unread));
        }
        return out;
    }

    @Override
    public ChatConversationResponse getOrCreateForUser(Long userId) {
        User u = userRepo.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));
        if (u.getRole() != UserRole.USER) {
            throw new BadRequestException("Chỉ giảng viên mới có cuộc trò chuyện cá nhân");
        }
        ChatConversation conv = conversationRepo.findByUserId(userId)
                .orElseGet(() -> createConversation(userId));
        ChatMessage last = messageRepo
                .findByConversationIdOrderByCreatedAtDesc(conv.getId(), PageRequest.of(0, 1))
                .stream().findFirst().orElse(null);
        long unread = messageRepo
                .countByConversationIdAndSenderRoleAndIsReadFalse(conv.getId(), UserRole.ADMIN);
        return ChatConversationResponse.from(conv, last, unread);
    }

    @Override
    public void broadcastTyping(Long senderId, Long targetUserId, boolean typing) {
        User sender = userRepo.findById(senderId).orElse(null);
        if (sender == null) return;

        Long ownerUserId = (sender.getRole() == UserRole.USER) ? sender.getId() : targetUserId;
        if (ownerUserId == null) return;
        ChatConversation conv = conversationRepo.findByUserId(ownerUserId).orElse(null);
        if (conv == null) return;

        ChatTypingEvent event = new ChatTypingEvent(
                conv.getId(), sender.getId(), sender.getFullName(), sender.getRole(), typing);

        if (sender.getRole() == UserRole.USER) {
            for (Long adminId : userRepo.findAllActiveAdminIds()) {
                messaging.convertAndSendToUser(adminId.toString(), QUEUE_TYPING, event);
            }
        } else {
            messaging.convertAndSendToUser(ownerUserId.toString(), QUEUE_TYPING, event);
        }
    }
}
