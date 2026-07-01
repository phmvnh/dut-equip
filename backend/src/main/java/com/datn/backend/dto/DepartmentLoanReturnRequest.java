package com.datn.backend.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class DepartmentLoanReturnRequest {

    @NotNull(message = "Ngày trả không được để trống")
    private LocalDate actualReturnDate;

    private String conditionAtReturn;

    // Trạng thái thiết bị sau khi khoa trả: AVAILABLE | MAINTENANCE | BROKEN
    @NotBlank(message = "Vui lòng chọn tình trạng thiết bị sau khi trả")
    private String equipmentStatus;

    public LocalDate getActualReturnDate() { return actualReturnDate; }
    public void setActualReturnDate(LocalDate actualReturnDate) { this.actualReturnDate = actualReturnDate; }
    public String getConditionAtReturn() { return conditionAtReturn; }
    public void setConditionAtReturn(String conditionAtReturn) { this.conditionAtReturn = conditionAtReturn; }
    public String getEquipmentStatus() { return equipmentStatus; }
    public void setEquipmentStatus(String equipmentStatus) { this.equipmentStatus = equipmentStatus; }
}
