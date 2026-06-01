package com.datn.backend.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

// Payload tạo phiếu bồi thường — POST /api/v1/compensations
public class CompensationCreateRequest {

    @NotNull(message = "Vui lòng chọn đơn mượn")
    private Long borrowId;

    @NotNull(message = "Vui lòng nhập số tiền bồi thường")
    @Positive(message = "Số tiền phải lớn hơn 0")
    private BigDecimal amount;

    @NotBlank(message = "Vui lòng nhập lý do bồi thường")
    private String reason;

    public Long getBorrowId() { return borrowId; }
    public void setBorrowId(Long borrowId) { this.borrowId = borrowId; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
