package com.datn.backend.scheduler;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.datn.backend.entity.BorrowRequest;
import com.datn.backend.enums.BorrowStatus;
import com.datn.backend.enums.NotificationType;
import com.datn.backend.repository.BorrowRequestRepository;
import com.datn.backend.service.NotificationService;

// Scheduler nhắc trả + cảnh báo quá hạn — chỉ gửi cho user mượn.
// 3 vòng lặp:
//  1) Mỗi 5 phút: nhắc "sắp đến hạn" với lead time động (1/4 thời lượng, cap 1h) — chạy cho mọi đơn APPROVED.
//  2) Mỗi giờ: nhắc trước 1 ngày — chỉ áp dụng đơn dài (duration >= 1 ngày).
//  3) Mỗi 5 phút: chuyển APPROVED → OVERDUE khi quá hạn + gửi alert đầu tiên.
//     Mỗi sáng 08:00: nhắc lại các đơn OVERDUE chưa trả (cách 24h).
@Component
public class BorrowReminderScheduler {

    private static final Logger log = LoggerFactory.getLogger(BorrowReminderScheduler.class);

    private static final long HOUR_LEAD_CAP_MINUTES = 60;
    private static final long DAY_LEAD_MINUTES = 24 * 60;
    private static final long LONG_BORROW_THRESHOLD_MINUTES = 24 * 60;

    private final BorrowRequestRepository borrowRepo;
    private final NotificationService notificationService;

    public BorrowReminderScheduler(BorrowRequestRepository borrowRepo,
                                   NotificationService notificationService) {
        this.borrowRepo = borrowRepo;
        this.notificationService = notificationService;
    }

    // Mỗi 5 phút — nhắc sắp đến hạn (lead time động).
    // Lead = min(60p, duration/4). Đơn 30p → nhắc trước ~7p; đơn dài → trước 1h.
    @Scheduled(cron = "0 */5 * * * *")
    @Transactional
    public void sendHourReminders() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime until = now.plusMinutes(HOUR_LEAD_CAP_MINUTES);
        List<BorrowRequest> candidates = borrowRepo.findPendingHourReminders(BorrowStatus.APPROVED, now, until);
        if (candidates.isEmpty()) return;

        int sent = 0;
        for (BorrowRequest b : candidates) {
            long durationMinutes = Duration.between(b.getBorrowDateTime(), b.getReturnDateTime()).toMinutes();
            long leadMinutes = Math.min(HOUR_LEAD_CAP_MINUTES, Math.max(1, durationMinutes / 4));
            LocalDateTime triggerTime = b.getReturnDateTime().minusMinutes(leadMinutes);

            // Chưa đến thời điểm trigger hoặc đã quá hạn (handled bởi overdue scheduler)
            if (now.isBefore(triggerTime) || !now.isBefore(b.getReturnDateTime())) continue;

            notificationService.create(
                    b.getUser().getId(),
                    NotificationType.RETURN_REMINDER,
                    "Sắp đến hạn trả thiết bị",
                    "Thiết bị " + b.getEquipment().getName() + " cần được trả trong " + leadMinutes + " phút nữa."
            );
            b.setHourReminderSentAt(now);
            sent++;
        }
        if (sent > 0) log.info("Đã gửi {} nhắc trước-1h (kiểm tra {} đơn)", sent, candidates.size());
    }

    // Mỗi giờ — nhắc trước 1 ngày, chỉ áp dụng đơn có thời lượng >= 1 ngày
    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void sendDayReminders() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime until = now.plusMinutes(DAY_LEAD_MINUTES);
        List<BorrowRequest> candidates = borrowRepo.findPendingDayReminders(BorrowStatus.APPROVED, now, until);
        if (candidates.isEmpty()) return;

        int sent = 0;
        for (BorrowRequest b : candidates) {
            long durationMinutes = Duration.between(b.getBorrowDateTime(), b.getReturnDateTime()).toMinutes();
            if (durationMinutes < LONG_BORROW_THRESHOLD_MINUTES) continue;  // đơn ngắn — không nhắc trước 1 ngày

            notificationService.create(
                    b.getUser().getId(),
                    NotificationType.RETURN_REMINDER,
                    "Thiết bị sắp đến hạn trả",
                    "Thiết bị " + b.getEquipment().getName() + " cần được trả trong 1 ngày nữa."
            );
            b.setDayReminderSentAt(now);
            sent++;
        }
        if (sent > 0) log.info("Đã gửi {} nhắc trước-1-ngày (kiểm tra {} đơn)", sent, candidates.size());
    }

    // Mỗi 5 phút — chuyển APPROVED quá hạn → OVERDUE + gửi alert lần đầu
    @Scheduled(cron = "0 */5 * * * *")
    @Transactional
    public void transitionOverdue() {
        LocalDateTime now = LocalDateTime.now();
        List<BorrowRequest> overdue = borrowRepo.findByStatusAndReturnDateTimeBefore(BorrowStatus.APPROVED, now);
        if (overdue.isEmpty()) return;

        for (BorrowRequest b : overdue) {
            b.setStatus(BorrowStatus.OVERDUE);
            b.setLastOverdueAlertAt(now);
            notificationService.create(
                    b.getUser().getId(),
                    NotificationType.OVERDUE_ALERT,
                    "Đơn mượn đã quá hạn",
                    "Thiết bị " + b.getEquipment().getName()
                            + " đã quá hạn trả. Vui lòng liên hệ Admin để hoàn tất việc trả."
            );
        }
        log.info("Đã chuyển {} đơn sang OVERDUE", overdue.size());
    }

    // Mỗi sáng 08:00 — nhắc lại các đơn đã OVERDUE chưa trả (cách 24h kể từ lần nhắc trước)
    @Scheduled(cron = "0 0 8 * * *")
    @Transactional
    public void remindOverdueDaily() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime cutoff = now.minusHours(20);  // 20h buffer — đảm bảo không skip ngày
        List<BorrowRequest> overdue = borrowRepo.findOverdueNeedingAlert(BorrowStatus.OVERDUE, cutoff);
        if (overdue.isEmpty()) return;

        for (BorrowRequest b : overdue) {
            long daysOverdue = Math.max(1, Duration.between(b.getReturnDateTime(), now).toDays());
            notificationService.create(
                    b.getUser().getId(),
                    NotificationType.OVERDUE_ALERT,
                    "Thiết bị quá hạn " + daysOverdue + " ngày",
                    "Thiết bị " + b.getEquipment().getName() + " đã quá hạn trả "
                            + daysOverdue + " ngày. Vui lòng trả ngay."
            );
            b.setLastOverdueAlertAt(now);
        }
        log.info("Đã nhắc lại {} đơn OVERDUE", overdue.size());
    }
}
