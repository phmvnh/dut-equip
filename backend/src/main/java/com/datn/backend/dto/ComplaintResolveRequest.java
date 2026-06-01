package com.datn.backend.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.NotNull;

// Payload admin xử lý khiếu nại — PUT /api/v1/compensations/{id}/complaint/resolve
public class ComplaintResolveRequest {

    public enum Action { ACCEPT, REJECT, ADJUST }

    @NotNull(message = "Vui lòng chọn hành động xử lý")
    private Action action;

    // Bắt buộc khi action = ADJUST (số tiền mới); ignored khi ACCEPT/REJECT
    private BigDecimal newAmount;

    // Ghi chú của admin khi resolve (optional)
    private String note;

    public Action getAction() { return action; }
    public void setAction(Action action) { this.action = action; }

    public BigDecimal getNewAmount() { return newAmount; }
    public void setNewAmount(BigDecimal newAmount) { this.newAmount = newAmount; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
}
