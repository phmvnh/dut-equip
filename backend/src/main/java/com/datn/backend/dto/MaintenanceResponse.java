package com.datn.backend.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import com.datn.backend.entity.MaintenanceLog;

public class MaintenanceResponse {

    private Long id;
    private String code;
    private Long equipmentId;
    private String equipmentCode;
    private String equipmentName;
    private String equipmentImageUrl;
    // Snapshot vị trí (Khu) hiện tại của thiết bị — FE dùng để hiển thị "Khu hiện tại" trong dialog Hoàn thành BT
    private Long equipmentBuildingId;
    private String equipmentBuildingName;
    // Snapshot trạng thái thiết bị tại thời điểm trả response — FE dùng cho các check như "có cho phép tạo phiếu mới không"
    private String equipmentStatus;
    private String technicianName;
    private LocalDate startDate;
    private LocalDate endDate;
    private String description;
    private BigDecimal cost;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static MaintenanceResponse from(MaintenanceLog log) {
        MaintenanceResponse dto = new MaintenanceResponse();
        dto.id              = log.getId();
        dto.code            = log.getCode();
        dto.equipmentId     = log.getEquipment().getId();
        dto.equipmentCode     = log.getEquipment().getCode();
        dto.equipmentName     = log.getEquipment().getName();
        dto.equipmentImageUrl    = log.getEquipment().getMainImageUrl();
        dto.equipmentBuildingId  = log.getEquipment().getBuilding() != null ? log.getEquipment().getBuilding().getId() : null;
        dto.equipmentBuildingName= log.getEquipment().getBuilding() != null ? log.getEquipment().getBuilding().getName() : null;
        dto.equipmentStatus      = log.getEquipment().getStatus().name();
        dto.technicianName  = log.getTechnicianName();
        dto.startDate       = log.getStartDate();
        dto.endDate         = log.getEndDate();
        dto.description     = log.getDescription();
        dto.cost            = log.getCost();
        dto.status          = log.getStatus().name();
        dto.createdAt       = log.getCreatedAt();
        dto.updatedAt       = log.getUpdatedAt();
        return dto;
    }

    public Long getId() { return id; }
    public String getCode() { return code; }
    public Long getEquipmentId() { return equipmentId; }
    public String getEquipmentCode() { return equipmentCode; }
    public String getEquipmentName() { return equipmentName; }
    public String getEquipmentImageUrl() { return equipmentImageUrl; }
    public Long getEquipmentBuildingId() { return equipmentBuildingId; }
    public String getEquipmentBuildingName() { return equipmentBuildingName; }
    public String getEquipmentStatus() { return equipmentStatus; }
    public String getTechnicianName() { return technicianName; }
    public LocalDate getStartDate() { return startDate; }
    public LocalDate getEndDate() { return endDate; }
    public String getDescription() { return description; }
    public BigDecimal getCost() { return cost; }
    public String getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
