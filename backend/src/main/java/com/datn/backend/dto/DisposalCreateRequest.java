package com.datn.backend.dto;

import java.math.BigDecimal;

import com.datn.backend.enums.DisposalMethod;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class DisposalCreateRequest {

    @NotNull(message = "Vui lòng chọn thiết bị cần thanh lý")
    private Long equipmentId;

    @NotBlank(message = "Vui lòng nhập lý do thanh lý")
    private String reason;

    @NotNull(message = "Vui lòng chọn hình thức thanh lý đề xuất")
    private DisposalMethod proposedMethod;

    private BigDecimal estimatedValue;
    private String note;

    public Long getEquipmentId() { return equipmentId; }
    public void setEquipmentId(Long equipmentId) { this.equipmentId = equipmentId; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public DisposalMethod getProposedMethod() { return proposedMethod; }
    public void setProposedMethod(DisposalMethod proposedMethod) { this.proposedMethod = proposedMethod; }
    public BigDecimal getEstimatedValue() { return estimatedValue; }
    public void setEstimatedValue(BigDecimal estimatedValue) { this.estimatedValue = estimatedValue; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
}
