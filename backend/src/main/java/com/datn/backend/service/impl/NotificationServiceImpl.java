package com.datn.backend.service.impl;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.datn.backend.dto.NotificationResponse;
import com.datn.backend.entity.Notification;
import com.datn.backend.entity.User;
import com.datn.backend.enums.NotificationType;
import com.datn.backend.exception.BadRequestException;
import com.datn.backend.exception.ResourceNotFoundException;
import com.datn.backend.repository.NotificationRepository;
import com.datn.backend.repository.UserRepository;
import com.datn.backend.service.NotificationService;

@Service
@Transactional
public class NotificationServiceImpl implements NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationServiceImpl.class);
    private static final String USER_QUEUE = "/queue/notifications";

    private final NotificationRepository notificationRepo;
    private final UserRepository userRepo;
    private final SimpMessagingTemplate messagingTemplate;

    public NotificationServiceImpl(NotificationRepository notificationRepo,
                                   UserRepository userRepo,
                                   SimpMessagingTemplate messagingTemplate) {
        this.notificationRepo  = notificationRepo;
        this.userRepo          = userRepo;
        this.messagingTemplate = messagingTemplate;
    }

    @Override
    public void create(Long userId, NotificationType type, String title, String message) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        Notification n = new Notification();
        n.setUser(user);
        n.setType(type);
        n.setTitle(title);
        n.setMessage(message);
        Notification saved = notificationRepo.save(n);

        // Push qua STOMP — userId.toString() khớp với StompPrincipal.getName()
        // Spring sẽ tự thêm prefix /user → client subscribe /user/queue/notifications
        messagingTemplate.convertAndSendToUser(
                userId.toString(),
                USER_QUEUE,
                NotificationResponse.from(saved)
        );
        log.debug("Đã gửi notification {} đến user {}", type, userId);
    }

    @Override
    public void createForAllAdmins(NotificationType type, String title, String message) {
        userRepo.findAllActiveAdminIds()
                .forEach(adminId -> create(adminId, type, title, message));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<NotificationResponse> getMyNotifications(Long userId, NotificationType type, Pageable pageable) {
        Page<Notification> page = (type == null)
                ? notificationRepo.findByUserIdOrderByCreatedAtDesc(userId, pageable)
                : notificationRepo.findByUserIdAndTypeOrderByCreatedAtDesc(userId, type, pageable);
        return page.map(NotificationResponse::from);
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        return notificationRepo.countByUserIdAndIsReadFalse(userId);
    }

    @Override
    public void markAsRead(Long userId, Long notificationId) {
        Notification n = notificationRepo.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông báo"));
        if (!n.getUser().getId().equals(userId)) {
            throw new BadRequestException("Không có quyền với thông báo này");
        }
        if (!n.isRead()) {
            n.setRead(true);
        }
    }

    @Override
    public void markAllAsRead(Long userId) {
        notificationRepo.markAllAsRead(userId);
    }
}
