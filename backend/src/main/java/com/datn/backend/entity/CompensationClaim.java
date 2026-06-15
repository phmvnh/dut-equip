package com.datn.backend.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import com.datn.backend.enums.ComplaintStatus;
import com.datn.backend.enums.CompensationStatus;
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

// Phiếu yêu cầu bồi thường thiết bị do user làm hỏng
@Entity
@Table(name = "compensation_claims")
public class CompensationClaim {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Mã phiếu 6 ký tự A-Z + 0-9 (có cả chữ và số), sinh tự động khi tạo
    @Column(unique = true, length = 6)
    private String code;

    // Đơn mượn nguồn — 1 đơn mượn chỉ có 1 phiếu bồi thường
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "borrow_id", nullable = false, unique = true)
    private BorrowRequest borrow;

    // Giảng viên phải bồi thường (link, không dùng để hiển thị — dùng snapshot bên dưới)
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // Thiết bị (link)
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "equipment_id", nullable = false)
    private Equipment equipment;

    // Snapshot thông tin giảng viên tại lúc tạo phiếu — giữ tính pháp lý nếu user đổi profile/xóa
    @Column(name = "borrower_name", length = 255)
    private String borrowerName;

    @Column(name = "borrower_email", length = 255)
    private String borrowerEmail;

    @Column(name = "borrower_phone", length = 20)
    private String borrowerPhone;

    @Column(name = "borrower_faculty", length = 255)
    private String borrowerFaculty;

    // Snapshot thông tin thiết bị
    @Column(name = "equipment_code", length = 50)
    private String equipmentCode;

    @Column(name = "equipment_name", length = 255)
    private String equipmentName;

    // Số tiền bồi thường (VND)
    @Column(nullable = false, precision = 15, scale = 0)
    private BigDecimal amount;

    // Lý do bồi thường (do admin nhập, giải thích tại sao là lỗi user)
    @Column(columnDefinition = "TEXT", nullable = false)
    private String reason;

    // Snapshot tình trạng thiết bị trước khi mượn (từ borrow.preBorrowConditionNote tại thời điểm tạo phiếu)
    // Dùng làm bằng chứng so sánh trong PDF + dialog xử lý khiếu nại
    @Column(name = "pre_borrow_condition_note", columnDefinition = "TEXT")
    private String preBorrowConditionNote;

    // Snapshot báo hỏng của user (nếu có)
    @Column(name = "damage_description", columnDefinition = "TEXT")
    private String damageDescription;

    // Trạng thái: PENDING | PAID | CANCELLED
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CompensationStatus status = CompensationStatus.PENDING;

    // Thời điểm admin xác nhận đã nhận tiền
    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    // === Minh chứng đã bồi thường (giảng viên nộp ảnh hóa đơn/biên lai đã nộp Phòng Kế toán) ===

    // URL ảnh hóa đơn đã nộp tiền — null = chưa nộp minh chứng
    @Column(name = "payment_proof_url", length = 500)
    private String paymentProofUrl;

    // Thời điểm giảng viên nộp minh chứng
    @Column(name = "payment_proof_submitted_at")
    private LocalDateTime paymentProofSubmittedAt;

    // === Khiếu nại (nested 1-1 — mỗi phiếu tối đa 1 khiếu nại) ===

    @Column(name = "has_complaint", nullable = false)
    private boolean hasComplaint = false;

    @Column(name = "complaint_reason", columnDefinition = "TEXT")
    private String complaintReason;

    // Danh sách URL ảnh minh chứng khiếu nại (tối đa 3) — lưu JSON
    @Convert(converter = JsonStringListConverter.class)
    @Column(name = "complaint_image_urls", columnDefinition = "TEXT")
    private List<String> complaintImageUrls;

    @Column(name = "complaint_created_at")
    private LocalDateTime complaintCreatedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "complaint_status", length = 20)
    private ComplaintStatus complaintStatus;

    @Column(name = "complaint_resolved_at")
    private LocalDateTime complaintResolvedAt;

    // Ghi chú admin khi resolve khiếu nại
    @Column(name = "complaint_resolution", columnDefinition = "TEXT")
    private String complaintResolution;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

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

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public BorrowRequest getBorrow() { return borrow; }
    public void setBorrow(BorrowRequest borrow) { this.borrow = borrow; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public Equipment getEquipment() { return equipment; }
    public void setEquipment(Equipment equipment) { this.equipment = equipment; }

    public String getBorrowerName() { return borrowerName; }
    public void setBorrowerName(String borrowerName) { this.borrowerName = borrowerName; }

    public String getBorrowerEmail() { return borrowerEmail; }
    public void setBorrowerEmail(String borrowerEmail) { this.borrowerEmail = borrowerEmail; }

    public String getBorrowerPhone() { return borrowerPhone; }
    public void setBorrowerPhone(String borrowerPhone) { this.borrowerPhone = borrowerPhone; }

    public String getBorrowerFaculty() { return borrowerFaculty; }
    public void setBorrowerFaculty(String borrowerFaculty) { this.borrowerFaculty = borrowerFaculty; }

    public String getEquipmentCode() { return equipmentCode; }
    public void setEquipmentCode(String equipmentCode) { this.equipmentCode = equipmentCode; }

    public String getEquipmentName() { return equipmentName; }
    public void setEquipmentName(String equipmentName) { this.equipmentName = equipmentName; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getPreBorrowConditionNote() { return preBorrowConditionNote; }
    public void setPreBorrowConditionNote(String preBorrowConditionNote) { this.preBorrowConditionNote = preBorrowConditionNote; }

    public String getDamageDescription() { return damageDescription; }
    public void setDamageDescription(String damageDescription) { this.damageDescription = damageDescription; }

    public CompensationStatus getStatus() { return status; }
    public void setStatus(CompensationStatus status) { this.status = status; }

    public LocalDateTime getPaidAt() { return paidAt; }
    public void setPaidAt(LocalDateTime paidAt) { this.paidAt = paidAt; }

    public String getPaymentProofUrl() { return paymentProofUrl; }
    public void setPaymentProofUrl(String paymentProofUrl) { this.paymentProofUrl = paymentProofUrl; }

    public LocalDateTime getPaymentProofSubmittedAt() { return paymentProofSubmittedAt; }
    public void setPaymentProofSubmittedAt(LocalDateTime paymentProofSubmittedAt) { this.paymentProofSubmittedAt = paymentProofSubmittedAt; }

    public boolean isHasComplaint() { return hasComplaint; }
    public void setHasComplaint(boolean hasComplaint) { this.hasComplaint = hasComplaint; }

    public String getComplaintReason() { return complaintReason; }
    public void setComplaintReason(String complaintReason) { this.complaintReason = complaintReason; }

    public List<String> getComplaintImageUrls() { return complaintImageUrls; }
    public void setComplaintImageUrls(List<String> complaintImageUrls) { this.complaintImageUrls = complaintImageUrls; }

    public LocalDateTime getComplaintCreatedAt() { return complaintCreatedAt; }
    public void setComplaintCreatedAt(LocalDateTime complaintCreatedAt) { this.complaintCreatedAt = complaintCreatedAt; }

    public ComplaintStatus getComplaintStatus() { return complaintStatus; }
    public void setComplaintStatus(ComplaintStatus complaintStatus) { this.complaintStatus = complaintStatus; }

    public LocalDateTime getComplaintResolvedAt() { return complaintResolvedAt; }
    public void setComplaintResolvedAt(LocalDateTime complaintResolvedAt) { this.complaintResolvedAt = complaintResolvedAt; }

    public String getComplaintResolution() { return complaintResolution; }
    public void setComplaintResolution(String complaintResolution) { this.complaintResolution = complaintResolution; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
