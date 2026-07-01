package com.datn.backend.entity;

import java.time.LocalDate;
import java.time.LocalDateTime;

import com.datn.backend.enums.DepartmentLoanStatus;

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

// Phiếu cho khoa/đơn vị mượn thiết bị dài hạn.
// Khác BorrowRequest (cá nhân, có khung giờ): đây là đơn vị mượn theo ngày, vô thời hạn hoặc có ngày trả dự kiến.
// Phê duyệt diễn ra ngoài hệ thống (trưởng khoa/lãnh đạo ký) — admin ghi nhận tên người phê duyệt.
@Entity
@Table(name = "department_loans")
public class DepartmentLoan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Auto-gen dạng DM-YYYY-001
    @Column(nullable = false, unique = true, length = 20)
    private String code;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "equipment_id", nullable = false)
    private Equipment equipment;

    // Snapshot tại lúc tạo phiếu — giữ tính pháp lý khi thiết bị bị đổi tên/mã
    @Column(name = "equipment_code", length = 50)
    private String equipmentCode;

    @Column(name = "equipment_name", length = 255)
    private String equipmentName;

    @Column(name = "department_name", nullable = false, length = 255)
    private String departmentName;

    @Column(name = "contact_person", nullable = false, length = 255)
    private String contactPerson;

    @Column(name = "contact_phone", length = 20)
    private String contactPhone;

    @Column(columnDefinition = "TEXT")
    private String purpose;

    // Tên người ký phê duyệt (text, không cần FK vì không có tài khoản trong hệ thống)
    @Column(name = "approver_name", length = 255)
    private String approverName;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    // Nullable = mượn vô thời hạn
    @Column(name = "expected_return_date")
    private LocalDate expectedReturnDate;

    // URL file đơn mượn từ khoa (ảnh scan hoặc PDF), lưu trên Cloudinary
    @Column(name = "request_file_url", length = 1000)
    private String requestFileUrl;

    // Ảnh đính kèm — nhiều ảnh, lưu dạng URL phân cách bằng dấu phẩy
    @Column(name = "image_urls", columnDefinition = "TEXT")
    private String imageUrlsRaw;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DepartmentLoanStatus status = DepartmentLoanStatus.ACTIVE;

    // Điền khi ghi nhận trả
    @Column(name = "actual_return_date")
    private LocalDate actualReturnDate;

    @Column(name = "condition_at_return", columnDefinition = "TEXT")
    private String conditionAtReturn;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

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
    public String getDepartmentName() { return departmentName; }
    public void setDepartmentName(String departmentName) { this.departmentName = departmentName; }
    public String getContactPerson() { return contactPerson; }
    public void setContactPerson(String contactPerson) { this.contactPerson = contactPerson; }
    public String getContactPhone() { return contactPhone; }
    public void setContactPhone(String contactPhone) { this.contactPhone = contactPhone; }
    public String getPurpose() { return purpose; }
    public void setPurpose(String purpose) { this.purpose = purpose; }
    public String getApproverName() { return approverName; }
    public void setApproverName(String approverName) { this.approverName = approverName; }
    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
    public LocalDate getExpectedReturnDate() { return expectedReturnDate; }
    public void setExpectedReturnDate(LocalDate expectedReturnDate) { this.expectedReturnDate = expectedReturnDate; }
    public String getRequestFileUrl() { return requestFileUrl; }
    public void setRequestFileUrl(String requestFileUrl) { this.requestFileUrl = requestFileUrl; }
    public String getImageUrlsRaw() { return imageUrlsRaw; }
    public void setImageUrlsRaw(String imageUrlsRaw) { this.imageUrlsRaw = imageUrlsRaw; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public DepartmentLoanStatus getStatus() { return status; }
    public void setStatus(DepartmentLoanStatus status) { this.status = status; }
    public LocalDate getActualReturnDate() { return actualReturnDate; }
    public void setActualReturnDate(LocalDate actualReturnDate) { this.actualReturnDate = actualReturnDate; }
    public String getConditionAtReturn() { return conditionAtReturn; }
    public void setConditionAtReturn(String conditionAtReturn) { this.conditionAtReturn = conditionAtReturn; }
    public User getCreatedBy() { return createdBy; }
    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
