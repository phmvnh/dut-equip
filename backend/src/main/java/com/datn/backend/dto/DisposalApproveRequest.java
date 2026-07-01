package com.datn.backend.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

// Ghi nhận phê duyệt thanh lý (lãnh đạo ký tay ngoài hệ thống)
public class DisposalApproveRequest {

    @NotBlank(message = "Vui lòng nhập số quyết định thanh lý đã ký")
    private String decisionNo;

    @NotNull(message = "Vui lòng nhập ngày quyết định")
    private LocalDate decisionDate;

    @NotBlank(message = "Vui lòng nhập tên người duyệt/ký")
    private String approverName;

    private String decisionFileUrl;

    public String getDecisionNo() { return decisionNo; }
    public void setDecisionNo(String decisionNo) { this.decisionNo = decisionNo; }
    public LocalDate getDecisionDate() { return decisionDate; }
    public void setDecisionDate(LocalDate decisionDate) { this.decisionDate = decisionDate; }
    public String getApproverName() { return approverName; }
    public void setApproverName(String approverName) { this.approverName = approverName; }
    public String getDecisionFileUrl() { return decisionFileUrl; }
    public void setDecisionFileUrl(String decisionFileUrl) { this.decisionFileUrl = decisionFileUrl; }
}
