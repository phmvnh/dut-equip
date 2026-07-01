package com.datn.backend.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import com.datn.backend.entity.DisposalRequest;

public class DisposalResponse {

    private Long id;
    private String code;
    private Long equipmentId;
    private String equipmentCode;
    private String equipmentName;
    private String requestedByName;
    private String reason;
    private String proposedMethod;
    private BigDecimal estimatedValue;
    private String note;
    private String status;

    private String decisionNo;
    private LocalDate decisionDate;
    private String approverName;
    private String decisionFileUrl;
    private String approvedByName;
    private LocalDateTime approvedAt;
    private String rejectReason;

    private String actualMethod;
    private BigDecimal proceeds;
    private LocalDate disposalDate;
    private LocalDateTime completedAt;

    private LocalDateTime createdAt;

    public static DisposalResponse from(DisposalRequest d) {
        DisposalResponse dto = new DisposalResponse();
        dto.id              = d.getId();
        dto.code            = d.getCode();
        dto.equipmentId     = d.getEquipment().getId();
        dto.equipmentCode   = d.getEquipmentCode();
        dto.equipmentName   = d.getEquipmentName();
        dto.requestedByName = d.getRequestedBy().getFullName();
        dto.reason          = d.getReason();
        dto.proposedMethod  = d.getProposedMethod() != null ? d.getProposedMethod().name() : null;
        dto.estimatedValue  = d.getEstimatedValue();
        dto.note            = d.getNote();
        dto.status          = d.getStatus().name();
        dto.decisionNo      = d.getDecisionNo();
        dto.decisionDate    = d.getDecisionDate();
        dto.approverName    = d.getApproverName();
        dto.decisionFileUrl = d.getDecisionFileUrl();
        dto.approvedByName  = d.getApprovedBy() != null ? d.getApprovedBy().getFullName() : null;
        dto.approvedAt      = d.getApprovedAt();
        dto.rejectReason    = d.getRejectReason();
        dto.actualMethod    = d.getActualMethod() != null ? d.getActualMethod().name() : null;
        dto.proceeds        = d.getProceeds();
        dto.disposalDate    = d.getDisposalDate();
        dto.completedAt     = d.getCompletedAt();
        dto.createdAt       = d.getCreatedAt();
        return dto;
    }

    public Long getId() { return id; }
    public String getCode() { return code; }
    public Long getEquipmentId() { return equipmentId; }
    public String getEquipmentCode() { return equipmentCode; }
    public String getEquipmentName() { return equipmentName; }
    public String getRequestedByName() { return requestedByName; }
    public String getReason() { return reason; }
    public String getProposedMethod() { return proposedMethod; }
    public BigDecimal getEstimatedValue() { return estimatedValue; }
    public String getNote() { return note; }
    public String getStatus() { return status; }
    public String getDecisionNo() { return decisionNo; }
    public LocalDate getDecisionDate() { return decisionDate; }
    public String getApproverName() { return approverName; }
    public String getDecisionFileUrl() { return decisionFileUrl; }
    public String getApprovedByName() { return approvedByName; }
    public LocalDateTime getApprovedAt() { return approvedAt; }
    public String getRejectReason() { return rejectReason; }
    public String getActualMethod() { return actualMethod; }
    public BigDecimal getProceeds() { return proceeds; }
    public LocalDate getDisposalDate() { return disposalDate; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
