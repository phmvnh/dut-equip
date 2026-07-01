package com.datn.backend.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

public class ProcurementCreateRequest {

    @NotBlank(message = "Tiêu đề đề nghị không được để trống")
    private String title;

    private String reason;
    private String supplier;
    private String note;

    @NotEmpty(message = "Đề nghị phải có ít nhất một dòng hàng")
    @Valid
    private List<ProcurementItemRequest> items;

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public String getSupplier() { return supplier; }
    public void setSupplier(String supplier) { this.supplier = supplier; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public List<ProcurementItemRequest> getItems() { return items; }
    public void setItems(List<ProcurementItemRequest> items) { this.items = items; }
}
