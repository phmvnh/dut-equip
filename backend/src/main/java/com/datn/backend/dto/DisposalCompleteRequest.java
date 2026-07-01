package com.datn.backend.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.datn.backend.enums.DisposalMethod;

import jakarta.validation.constraints.NotNull;

// Thực hiện thanh lý (ghi giảm) — thiết bị chuyển DISPOSED
public class DisposalCompleteRequest {

    @NotNull(message = "Vui lòng chọn hình thức thanh lý thực tế")
    private DisposalMethod actualMethod;

    // Số tiền thu được (nếu bán) — tùy chọn
    private BigDecimal proceeds;

    @NotNull(message = "Vui lòng nhập ngày thực hiện thanh lý")
    private LocalDate disposalDate;

    public DisposalMethod getActualMethod() { return actualMethod; }
    public void setActualMethod(DisposalMethod actualMethod) { this.actualMethod = actualMethod; }
    public BigDecimal getProceeds() { return proceeds; }
    public void setProceeds(BigDecimal proceeds) { this.proceeds = proceeds; }
    public LocalDate getDisposalDate() { return disposalDate; }
    public void setDisposalDate(LocalDate disposalDate) { this.disposalDate = disposalDate; }
}
