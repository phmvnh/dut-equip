package com.datn.backend.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

// Payload Admin gửi khi thanh lý thiết bị — POST /api/v1/equips/{id}/dispose
public class DisposeRequest {

    @NotBlank(message = "Vui lòng nhập lý do thanh lý")
    private String reason;

    @NotNull(message = "Vui lòng chọn ngày thanh lý")
    private LocalDate disposalDate;

    // Giá trị thu hồi khi thanh lý (VND, có thể null nếu tiêu hủy không thu hồi)
    @DecimalMin(value = "0", message = "Giá trị thanh lý không hợp lệ")
    private BigDecimal value;

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public LocalDate getDisposalDate() { return disposalDate; }
    public void setDisposalDate(LocalDate disposalDate) { this.disposalDate = disposalDate; }

    public BigDecimal getValue() { return value; }
    public void setValue(BigDecimal value) { this.value = value; }
}
