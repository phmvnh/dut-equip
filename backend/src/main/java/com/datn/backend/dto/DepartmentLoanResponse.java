package com.datn.backend.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

import com.datn.backend.entity.DepartmentLoan;

public class DepartmentLoanResponse {

    private Long id;
    private String code;

    private Long equipmentId;
    private String equipmentCode;
    private String equipmentName;
    private String equipmentStatus;
    private String buildingName;

    private String departmentName;
    private String contactPerson;
    private String contactPhone;
    private String purpose;
    private String approverName;

    private LocalDate startDate;
    private LocalDate expectedReturnDate;
    private String note;
    private String requestFileUrl;
    private java.util.List<String> imageUrls;

    private String status;

    private LocalDate actualReturnDate;
    private String conditionAtReturn;

    private Long createdById;
    private String createdByName;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static DepartmentLoanResponse from(DepartmentLoan d) {
        DepartmentLoanResponse r = new DepartmentLoanResponse();
        r.id              = d.getId();
        r.code            = d.getCode();

        r.equipmentId     = d.getEquipment().getId();
        r.equipmentCode   = d.getEquipmentCode();
        r.equipmentName   = d.getEquipmentName();
        r.equipmentStatus = d.getEquipment().getStatus().name();
        r.buildingName    = d.getEquipment().getBuilding() != null
                           ? d.getEquipment().getBuilding().getName() : null;

        r.departmentName     = d.getDepartmentName();
        r.contactPerson      = d.getContactPerson();
        r.contactPhone       = d.getContactPhone();
        r.purpose            = d.getPurpose();
        r.approverName       = d.getApproverName();

        r.startDate          = d.getStartDate();
        r.expectedReturnDate = d.getExpectedReturnDate();
        r.note               = d.getNote();
        r.requestFileUrl     = d.getRequestFileUrl();
        r.imageUrls          = d.getImageUrlsRaw() != null && !d.getImageUrlsRaw().isBlank()
                               ? java.util.Arrays.asList(d.getImageUrlsRaw().split(","))
                               : java.util.List.of();

        r.status             = d.getStatus().name();

        r.actualReturnDate   = d.getActualReturnDate();
        r.conditionAtReturn  = d.getConditionAtReturn();

        r.createdById   = d.getCreatedBy().getId();
        r.createdByName = d.getCreatedBy().getFullName();

        r.createdAt  = d.getCreatedAt();
        r.updatedAt  = d.getUpdatedAt();
        return r;
    }

    public Long getId() { return id; }
    public String getCode() { return code; }
    public Long getEquipmentId() { return equipmentId; }
    public String getEquipmentCode() { return equipmentCode; }
    public String getEquipmentName() { return equipmentName; }
    public String getEquipmentStatus() { return equipmentStatus; }
    public String getBuildingName() { return buildingName; }
    public String getDepartmentName() { return departmentName; }
    public String getContactPerson() { return contactPerson; }
    public String getContactPhone() { return contactPhone; }
    public String getPurpose() { return purpose; }
    public String getApproverName() { return approverName; }
    public LocalDate getStartDate() { return startDate; }
    public LocalDate getExpectedReturnDate() { return expectedReturnDate; }
    public String getNote() { return note; }
    public String getRequestFileUrl() { return requestFileUrl; }
    public java.util.List<String> getImageUrls() { return imageUrls; }
    public String getStatus() { return status; }
    public LocalDate getActualReturnDate() { return actualReturnDate; }
    public String getConditionAtReturn() { return conditionAtReturn; }
    public Long getCreatedById() { return createdById; }
    public String getCreatedByName() { return createdByName; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
