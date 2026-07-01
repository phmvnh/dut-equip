package com.datn.backend.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import com.datn.backend.enums.ProcurementStatus;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

// Đề nghị mua sắm/trang bị thiết bị — đầu vòng đời tài sản.
// Quy trình: PENDING → (in tờ trình, trình ký) → APPROVED (ghi nhận quyết định) → COMPLETED (nghiệm thu, sinh thiết bị).
@Entity
@Table(name = "procurement_requests")
public class ProcurementRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Mã đề nghị — auto gen dạng MS-YYYY-001
    @Column(nullable = false, unique = true, length = 20)
    private String code;

    @Column(nullable = false)
    private String title;

    // Người lập đề nghị (cán bộ quản lý tài sản)
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "requested_by", nullable = false)
    private User requestedBy;

    // Lý do/mục đích trang bị
    @Column(columnDefinition = "TEXT")
    private String reason;

    // Nhà cung cấp dự kiến (tùy chọn)
    @Column(length = 255)
    private String supplier;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ProcurementStatus status = ProcurementStatus.PENDING;

    // === Ghi nhận phê duyệt diễn ra NGOÀI hệ thống (trưởng ban/lãnh đạo ký tay) ===
    @Column(name = "decision_no", length = 100)
    private String decisionNo;          // số quyết định/tờ trình đã ký

    @Column(name = "decision_date")
    private LocalDate decisionDate;

    @Column(name = "approver_name", length = 255)
    private String approverName;        // tên người ký duyệt

    @Column(name = "decision_file_url", length = 500)
    private String decisionFileUrl;     // ảnh scan bản đã ký (tùy chọn)

    // Admin đã ghi nhận phê duyệt (audit — không phải người ký)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    private User approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "reject_reason", columnDefinition = "TEXT")
    private String rejectReason;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @OneToMany(mappedBy = "request", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ProcurementItem> items = new ArrayList<>();

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
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public User getRequestedBy() { return requestedBy; }
    public void setRequestedBy(User requestedBy) { this.requestedBy = requestedBy; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public String getSupplier() { return supplier; }
    public void setSupplier(String supplier) { this.supplier = supplier; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public ProcurementStatus getStatus() { return status; }
    public void setStatus(ProcurementStatus status) { this.status = status; }
    public String getDecisionNo() { return decisionNo; }
    public void setDecisionNo(String decisionNo) { this.decisionNo = decisionNo; }
    public LocalDate getDecisionDate() { return decisionDate; }
    public void setDecisionDate(LocalDate decisionDate) { this.decisionDate = decisionDate; }
    public String getApproverName() { return approverName; }
    public void setApproverName(String approverName) { this.approverName = approverName; }
    public String getDecisionFileUrl() { return decisionFileUrl; }
    public void setDecisionFileUrl(String decisionFileUrl) { this.decisionFileUrl = decisionFileUrl; }
    public User getApprovedBy() { return approvedBy; }
    public void setApprovedBy(User approvedBy) { this.approvedBy = approvedBy; }
    public LocalDateTime getApprovedAt() { return approvedAt; }
    public void setApprovedAt(LocalDateTime approvedAt) { this.approvedAt = approvedAt; }
    public String getRejectReason() { return rejectReason; }
    public void setRejectReason(String rejectReason) { this.rejectReason = rejectReason; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
    public List<ProcurementItem> getItems() { return items; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
