package com.datn.backend.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import com.datn.backend.entity.CompensationClaim;

public class CompensationResponse {

    private Long id;
    private String code;
    private Long borrowId;
    private Long userId;
    private String userName;
    private String userEmail;
    private String userPhone;
    private String userFaculty;
    private Long equipmentId;
    private String equipmentCode;
    private String equipmentName;
    private String equipmentImageUrl;
    private String buildingName;          // snapshot khu thiết bị hiện tại
    private LocalDateTime borrowDateTime;
    private LocalDateTime actualReturnDateTime;
    private BigDecimal amount;
    private String reason;
    private String preBorrowConditionNote;
    private String damageDescription;
    private String status;
    private LocalDateTime paidAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Khiếu nại
    private boolean hasComplaint;
    private String complaintReason;
    private List<String> complaintImageUrls;
    private LocalDateTime complaintCreatedAt;
    private String complaintStatus;
    private LocalDateTime complaintResolvedAt;
    private String complaintResolution;

    public static CompensationResponse from(CompensationClaim c) {
        CompensationResponse dto = new CompensationResponse();
        dto.id                   = c.getId();
        dto.code                 = c.getCode();
        dto.borrowId             = c.getBorrow() != null ? c.getBorrow().getId() : null;
        dto.userId               = c.getUser() != null ? c.getUser().getId() : null;
        // Hiển thị từ snapshot — không phụ thuộc User hiện tại
        dto.userName             = c.getBorrowerName();
        dto.userEmail            = c.getBorrowerEmail();
        dto.userPhone            = c.getBorrowerPhone();
        dto.userFaculty          = c.getBorrowerFaculty();
        dto.equipmentId          = c.getEquipment() != null ? c.getEquipment().getId() : null;
        dto.equipmentCode        = c.getEquipmentCode();
        dto.equipmentName        = c.getEquipmentName();
        dto.equipmentImageUrl    = c.getEquipment() != null ? c.getEquipment().getMainImageUrl() : null;
        dto.buildingName         = (c.getEquipment() != null && c.getEquipment().getBuilding() != null)
                ? c.getEquipment().getBuilding().getName() : null;
        dto.borrowDateTime       = c.getBorrow() != null ? c.getBorrow().getBorrowDateTime() : null;
        dto.actualReturnDateTime = c.getBorrow() != null ? c.getBorrow().getActualReturnDateTime() : null;
        dto.amount               = c.getAmount();
        dto.reason               = c.getReason();
        dto.preBorrowConditionNote = c.getPreBorrowConditionNote();
        dto.damageDescription    = c.getDamageDescription();
        dto.status               = c.getStatus().name();
        dto.paidAt               = c.getPaidAt();
        dto.createdAt            = c.getCreatedAt();
        dto.updatedAt            = c.getUpdatedAt();

        dto.hasComplaint         = c.isHasComplaint();
        dto.complaintReason      = c.getComplaintReason();
        dto.complaintImageUrls   = c.getComplaintImageUrls();
        dto.complaintCreatedAt   = c.getComplaintCreatedAt();
        dto.complaintStatus      = c.getComplaintStatus() != null ? c.getComplaintStatus().name() : null;
        dto.complaintResolvedAt  = c.getComplaintResolvedAt();
        dto.complaintResolution  = c.getComplaintResolution();

        return dto;
    }

    public Long getId() { return id; }
    public String getCode() { return code; }
    public Long getBorrowId() { return borrowId; }
    public Long getUserId() { return userId; }
    public String getUserName() { return userName; }
    public String getUserEmail() { return userEmail; }
    public String getUserPhone() { return userPhone; }
    public String getUserFaculty() { return userFaculty; }
    public Long getEquipmentId() { return equipmentId; }
    public String getEquipmentCode() { return equipmentCode; }
    public String getEquipmentName() { return equipmentName; }
    public String getEquipmentImageUrl() { return equipmentImageUrl; }
    public String getBuildingName() { return buildingName; }
    public LocalDateTime getBorrowDateTime() { return borrowDateTime; }
    public LocalDateTime getActualReturnDateTime() { return actualReturnDateTime; }
    public BigDecimal getAmount() { return amount; }
    public String getReason() { return reason; }
    public String getPreBorrowConditionNote() { return preBorrowConditionNote; }
    public String getDamageDescription() { return damageDescription; }
    public String getStatus() { return status; }
    public LocalDateTime getPaidAt() { return paidAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public boolean isHasComplaint() { return hasComplaint; }
    public String getComplaintReason() { return complaintReason; }
    public List<String> getComplaintImageUrls() { return complaintImageUrls; }
    public LocalDateTime getComplaintCreatedAt() { return complaintCreatedAt; }
    public String getComplaintStatus() { return complaintStatus; }
    public LocalDateTime getComplaintResolvedAt() { return complaintResolvedAt; }
    public String getComplaintResolution() { return complaintResolution; }
}
