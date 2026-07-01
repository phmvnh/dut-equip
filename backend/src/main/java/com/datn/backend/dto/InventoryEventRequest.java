package com.datn.backend.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;

public class InventoryEventRequest {

    @NotBlank(message = "Tiêu đề đợt kiểm kê không được để trống")
    private String title;

    private String description;
    private LocalDate startDate;
    private LocalDate endDate;

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
}
