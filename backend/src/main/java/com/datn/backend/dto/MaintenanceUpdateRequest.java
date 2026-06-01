package com.datn.backend.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

// Payload sửa phiếu bảo trì — dùng cho PUT /api/v1/maintenance/{id}
// Không cho đổi equipment giữa các phiếu
public class MaintenanceUpdateRequest {

    @Size(max = 200, message = "Tên người thực hiện tối đa 200 ký tự")
    private String technicianName;

    @NotNull(message = "Vui lòng chọn ngày bắt đầu")
    private LocalDate startDate;

    private LocalDate endDate;

    @NotBlank(message = "Vui lòng nhập mô tả nội dung bảo trì")
    private String description;

    @PositiveOrZero(message = "Chi phí phải là số không âm")
    private BigDecimal cost;

    public String getTechnicianName() { return technicianName; }
    public void setTechnicianName(String technicianName) { this.technicianName = technicianName; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public BigDecimal getCost() { return cost; }
    public void setCost(BigDecimal cost) { this.cost = cost; }
}
