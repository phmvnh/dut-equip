package com.datn.backend.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class DepartmentLoanCreateRequest {

    @NotNull(message = "Thiết bị không được để trống")
    private Long equipmentId;

    @NotBlank(message = "Tên khoa/đơn vị không được để trống")
    @Size(max = 255)
    private String departmentName;

    @NotBlank(message = "Tên người đại diện không được để trống")
    @Size(max = 255)
    private String contactPerson;

    @Size(max = 20)
    private String contactPhone;

    private String purpose;

    @Size(max = 255)
    private String approverName;

    @NotNull(message = "Ngày bàn giao không được để trống")
    private LocalDate startDate;

    // Nullable — vô thời hạn nếu không điền
    private LocalDate expectedReturnDate;

    private String note;

    // URL file đơn mượn từ khoa (PDF bắt buộc, ảnh scan chấp nhận)
    @NotBlank(message = "Vui lòng đính kèm file đơn mượn từ khoa")
    private String requestFileUrl;

    // Ảnh đính kèm bổ sung (không bắt buộc)
    private java.util.List<String> imageUrls;

    public Long getEquipmentId() { return equipmentId; }
    public void setEquipmentId(Long equipmentId) { this.equipmentId = equipmentId; }
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
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public String getRequestFileUrl() { return requestFileUrl; }
    public void setRequestFileUrl(String requestFileUrl) { this.requestFileUrl = requestFileUrl; }
    public java.util.List<String> getImageUrls() { return imageUrls; }
    public void setImageUrls(java.util.List<String> imageUrls) { this.imageUrls = imageUrls; }
}
