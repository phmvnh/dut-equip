package com.datn.backend.entity;

import java.time.LocalDateTime;
import java.util.List;

import com.datn.backend.enums.BorrowStatus;
import com.datn.backend.enums.DamageSeverity;
import com.datn.backend.enums.PurposeType;
import com.datn.backend.util.JsonStringListConverter;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

// Đơn mượn thiết bị — tối đa 7 ngày, mỗi user tối đa 5 đơn PENDING/APPROVED cùng lúc
@Entity
@Table(name = "borrow_requests")
public class BorrowRequest {

    // Khóa chính, tự tăng
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Giảng viên gửi đơn mượn (FK — dùng để link, không phải nguồn hiển thị)
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // Snapshot họ tên người mượn lúc tạo đơn — không refresh khi user đổi profile
    @Column(name = "borrower_name", length = 255)
    private String borrowerName;

    // Snapshot email người mượn lúc tạo đơn
    @Column(name = "borrower_email", length = 255)
    private String borrowerEmail;

    // Snapshot SĐT người mượn lúc tạo đơn
    @Column(name = "borrower_phone", length = 20)
    private String borrowerPhone;

    // Thiết bị được mượn
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "equipment_id", nullable = false)
    private Equipment equipment;

    // Khu/tòa 
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "building_id")
    private Building building;

    // Số phòng
    @Column(length = 100)
    private String room;

    // Ngày giờ bắt đầu mượn 
    @Column(name = "borrow_date_time", nullable = false)
    private LocalDateTime borrowDateTime;

    // Ngày giờ dự kiến trả (tối đa 7 ngày kể từ borrowDateTime)
    @Column(name = "return_date_time", nullable = false)
    private LocalDateTime returnDateTime;

    // Ngày giờ thực tế trả thiết bị (chỉ ghi nhận khi Admin xác nhận trả)
    @Column(name = "actual_return_date_time")
    private LocalDateTime actualReturnDateTime;

    // Trạng thái đơn: PENDING → APPROVED/REJECTED → RETURNED, hoặc OVERDUE/CANCELLED
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private BorrowStatus status = BorrowStatus.PENDING;

    // Mục đích sử dụng: TEACHING/PRACTICE/CONFERENCE/RESEARCH/EXTRACURRICULAR/OTHER
    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private PurposeType purpose;

    // Mô tả chi tiết mục đích — chỉ bắt buộc khi purpose = OTHER
    @Column(length = 255)
    private String purposeNote;

    // Ghi chú thêm của giảng viên (tùy chọn)
    @Column(columnDefinition = "TEXT")
    private String note;

    // Lý do Admin từ chối đơn — chỉ điền khi status = REJECTED
    @Column(length = 500)
    private String rejectReason;

    // Tình trạng thiết bị do Admin ghi nhận lúc duyệt đơn (bàn giao cho giảng viên).
    // Bắt buộc khi approve — làm baseline để so sánh khi giảng viên trả.
    @Column(name = "pre_borrow_condition_note", columnDefinition = "TEXT")
    private String preBorrowConditionNote;

    // === Báo hỏng thiết bị (user gửi trong khi đang mượn) ===

    // Cờ: đơn này đã được user báo hỏng hay chưa. 1 đơn chỉ báo 1 lần.
    @Column(name = "damage_reported", nullable = false)
    private boolean damageReported = false;

    // Mức độ hỏng: LIGHT / MEDIUM / SEVERE
    @Enumerated(EnumType.STRING)
    @Column(name = "damage_severity", length = 20)
    private DamageSeverity damageSeverity;

    // Mô tả lỗi do user nhập (bắt buộc khi báo, min 10 ký tự — validate ở DTO)
    @Column(name = "damage_description", columnDefinition = "TEXT")
    private String damageDescription;

    // Danh sách URL ảnh minh chứng (tối đa 3) — lưu JSON trong cột TEXT
    @Convert(converter = JsonStringListConverter.class)
    @Column(name = "damage_image_urls", columnDefinition = "TEXT")
    private List<String> damageImageUrls;

    // Thời điểm user gửi báo hỏng
    @Column(name = "damage_reported_at")
    private LocalDateTime damageReportedAt;

    // === Scheduler tracking — đánh dấu đã gửi nhắc/cảnh báo lần nào, tránh spam ===

    // Đã gửi nhắc trước 1 giờ (mọi đơn) — null = chưa gửi
    @Column(name = "hour_reminder_sent_at")
    private LocalDateTime hourReminderSentAt;

    // Đã gửi nhắc trước 1 ngày (chỉ đơn dài >= 1 ngày) — null = chưa gửi
    @Column(name = "day_reminder_sent_at")
    private LocalDateTime dayReminderSentAt;

    // Lần gửi cảnh báo OVERDUE_ALERT gần nhất — dùng để cách 24h mới nhắc lại
    @Column(name = "last_overdue_alert_at")
    private LocalDateTime lastOverdueAlertAt;

    // Đã nhắc admin "đơn PENDING sắp đến giờ mượn" — null = chưa gửi
    @Column(name = "approval_reminder_sent_at")
    private LocalDateTime approvalReminderSentAt;

    // Thời điểm tạo đơn — set 1 lần khi insert
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // Thời điểm cập nhật cuối cùng — tự refresh mỗi lần save
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = this.createdAt;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public String getBorrowerName() { return borrowerName; }
    public void setBorrowerName(String borrowerName) { this.borrowerName = borrowerName; }

    public String getBorrowerEmail() { return borrowerEmail; }
    public void setBorrowerEmail(String borrowerEmail) { this.borrowerEmail = borrowerEmail; }

    public String getBorrowerPhone() { return borrowerPhone; }
    public void setBorrowerPhone(String borrowerPhone) { this.borrowerPhone = borrowerPhone; }

    public Equipment getEquipment() { return equipment; }
    public void setEquipment(Equipment equipment) { this.equipment = equipment; }

    public Building getBuilding() { return building; }
    public void setBuilding(Building building) { this.building = building; }

    public String getRoom() { return room; }
    public void setRoom(String room) { this.room = room; }

    public LocalDateTime getBorrowDateTime() { return borrowDateTime; }
    public void setBorrowDateTime(LocalDateTime borrowDateTime) { this.borrowDateTime = borrowDateTime; }

    public LocalDateTime getReturnDateTime() { return returnDateTime; }
    public void setReturnDateTime(LocalDateTime returnDateTime) { this.returnDateTime = returnDateTime; }

    public LocalDateTime getActualReturnDateTime() { return actualReturnDateTime; }
    public void setActualReturnDateTime(LocalDateTime actualReturnDateTime) { this.actualReturnDateTime = actualReturnDateTime; }

    public BorrowStatus getStatus() { return status; }
    public void setStatus(BorrowStatus status) { this.status = status; }

    public PurposeType getPurpose() { return purpose; }
    public void setPurpose(PurposeType purpose) { this.purpose = purpose; }

    public String getPurposeNote() { return purposeNote; }
    public void setPurposeNote(String purposeNote) { this.purposeNote = purposeNote; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public String getRejectReason() { return rejectReason; }
    public void setRejectReason(String rejectReason) { this.rejectReason = rejectReason; }

    public String getPreBorrowConditionNote() { return preBorrowConditionNote; }
    public void setPreBorrowConditionNote(String preBorrowConditionNote) { this.preBorrowConditionNote = preBorrowConditionNote; }

    public boolean isDamageReported() { return damageReported; }
    public void setDamageReported(boolean damageReported) { this.damageReported = damageReported; }

    public DamageSeverity getDamageSeverity() { return damageSeverity; }
    public void setDamageSeverity(DamageSeverity damageSeverity) { this.damageSeverity = damageSeverity; }

    public String getDamageDescription() { return damageDescription; }
    public void setDamageDescription(String damageDescription) { this.damageDescription = damageDescription; }

    public List<String> getDamageImageUrls() { return damageImageUrls; }
    public void setDamageImageUrls(List<String> damageImageUrls) { this.damageImageUrls = damageImageUrls; }

    public LocalDateTime getDamageReportedAt() { return damageReportedAt; }
    public void setDamageReportedAt(LocalDateTime damageReportedAt) { this.damageReportedAt = damageReportedAt; }

    public LocalDateTime getHourReminderSentAt() { return hourReminderSentAt; }
    public void setHourReminderSentAt(LocalDateTime hourReminderSentAt) { this.hourReminderSentAt = hourReminderSentAt; }

    public LocalDateTime getDayReminderSentAt() { return dayReminderSentAt; }
    public void setDayReminderSentAt(LocalDateTime dayReminderSentAt) { this.dayReminderSentAt = dayReminderSentAt; }

    public LocalDateTime getLastOverdueAlertAt() { return lastOverdueAlertAt; }
    public void setLastOverdueAlertAt(LocalDateTime lastOverdueAlertAt) { this.lastOverdueAlertAt = lastOverdueAlertAt; }

    public LocalDateTime getApprovalReminderSentAt() { return approvalReminderSentAt; }
    public void setApprovalReminderSentAt(LocalDateTime approvalReminderSentAt) { this.approvalReminderSentAt = approvalReminderSentAt; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
