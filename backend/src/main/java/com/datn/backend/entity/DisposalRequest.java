package com.datn.backend.entity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import com.datn.backend.enums.DisposalMethod;
import com.datn.backend.enums.DisposalStatus;

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
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

// Đề nghị thanh lý thiết bị — đầu ra vòng đời tài sản.
// Quy trình: PENDING → (in tờ trình, trình ký) → APPROVED (ghi nhận quyết định) → COMPLETED (ghi giảm, thiết bị DISPOSED).
@Entity
@Table(name = "disposal_requests")
public class DisposalRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Mã đề nghị — auto gen dạng TL-YYYY-001
    @Column(nullable = false, unique = true, length = 20)
    private String code;

    // Thiết bị đề nghị thanh lý (link)
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "equipment_id", nullable = false)
    private Equipment equipment;

    // Snapshot thông tin thiết bị tại lúc lập đề nghị — giữ tính pháp lý
    @Column(name = "equipment_code", length = 50)
    private String equipmentCode;

    @Column(name = "equipment_name", length = 255)
    private String equipmentName;

    // Người lập đề nghị (cán bộ quản lý tài sản)
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "requested_by", nullable = false)
    private User requestedBy;

    @Column(columnDefinition = "TEXT")
    private String reason;

    // Hình thức thanh lý đề xuất
    @Enumerated(EnumType.STRING)
    @Column(name = "proposed_method", length = 20)
    private DisposalMethod proposedMethod;

    // Giá trị còn lại ước tính (prefill từ currentBookValue)
    @Column(name = "estimated_value", precision = 15, scale = 0)
    private BigDecimal estimatedValue;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DisposalStatus status = DisposalStatus.PENDING;

    // === Ghi nhận phê duyệt ngoài hệ thống (trưởng ban/lãnh đạo ký tay) ===
    @Column(name = "decision_no", length = 100)
    private String decisionNo;

    @Column(name = "decision_date")
    private LocalDate decisionDate;

    @Column(name = "approver_name", length = 255)
    private String approverName;

    @Column(name = "decision_file_url", length = 500)
    private String decisionFileUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    private User approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "reject_reason", columnDefinition = "TEXT")
    private String rejectReason;

    // === Thực hiện thanh lý (ghi giảm) ===
    @Enumerated(EnumType.STRING)
    @Column(name = "actual_method", length = 20)
    private DisposalMethod actualMethod;

    // Số tiền thu được (nếu bán)
    @Column(precision = 15, scale = 0)
    private BigDecimal proceeds;

    @Column(name = "disposal_date")
    private LocalDate disposalDate;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

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
    public Equipment getEquipment() { return equipment; }
    public void setEquipment(Equipment equipment) { this.equipment = equipment; }
    public String getEquipmentCode() { return equipmentCode; }
    public void setEquipmentCode(String equipmentCode) { this.equipmentCode = equipmentCode; }
    public String getEquipmentName() { return equipmentName; }
    public void setEquipmentName(String equipmentName) { this.equipmentName = equipmentName; }
    public User getRequestedBy() { return requestedBy; }
    public void setRequestedBy(User requestedBy) { this.requestedBy = requestedBy; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public DisposalMethod getProposedMethod() { return proposedMethod; }
    public void setProposedMethod(DisposalMethod proposedMethod) { this.proposedMethod = proposedMethod; }
    public BigDecimal getEstimatedValue() { return estimatedValue; }
    public void setEstimatedValue(BigDecimal estimatedValue) { this.estimatedValue = estimatedValue; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public DisposalStatus getStatus() { return status; }
    public void setStatus(DisposalStatus status) { this.status = status; }
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
    public DisposalMethod getActualMethod() { return actualMethod; }
    public void setActualMethod(DisposalMethod actualMethod) { this.actualMethod = actualMethod; }
    public BigDecimal getProceeds() { return proceeds; }
    public void setProceeds(BigDecimal proceeds) { this.proceeds = proceeds; }
    public LocalDate getDisposalDate() { return disposalDate; }
    public void setDisposalDate(LocalDate disposalDate) { this.disposalDate = disposalDate; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
