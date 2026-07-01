package com.datn.backend.dto;

import java.time.LocalDateTime;

public class AiPredictionResponse {
    private Long equipmentId;
    private String equipmentCode;
    private String equipmentName;
    private String equipTypeName;
    private String buildingName;
    private String riskLevel;        // HIGH | MEDIUM | LOW
    private Integer riskScore;       // 0..100
    private Integer daysToMaintenance;
    private boolean willFailIn7d;
    private String reason;
    private String lastMaintenanceText;  // VD: "90 ngày trước"
    private LocalDateTime generatedAt;
    private Long generatedAtEpochMillis;

    public Long getEquipmentId() { return equipmentId; }
    public void setEquipmentId(Long v) { this.equipmentId = v; }
    public String getEquipmentCode() { return equipmentCode; }
    public void setEquipmentCode(String v) { this.equipmentCode = v; }
    public String getEquipmentName() { return equipmentName; }
    public void setEquipmentName(String v) { this.equipmentName = v; }
    public String getEquipTypeName() { return equipTypeName; }
    public void setEquipTypeName(String v) { this.equipTypeName = v; }
    public String getBuildingName() { return buildingName; }
    public void setBuildingName(String v) { this.buildingName = v; }
    public String getRiskLevel() { return riskLevel; }
    public void setRiskLevel(String v) { this.riskLevel = v; }
    public Integer getRiskScore() { return riskScore; }
    public void setRiskScore(Integer v) { this.riskScore = v; }
    public Integer getDaysToMaintenance() { return daysToMaintenance; }
    public void setDaysToMaintenance(Integer v) { this.daysToMaintenance = v; }
    public boolean isWillFailIn7d() { return willFailIn7d; }
    public void setWillFailIn7d(boolean v) { this.willFailIn7d = v; }
    public String getReason() { return reason; }
    public void setReason(String v) { this.reason = v; }
    public String getLastMaintenanceText() { return lastMaintenanceText; }
    public void setLastMaintenanceText(String v) { this.lastMaintenanceText = v; }
    public LocalDateTime getGeneratedAt() { return generatedAt; }
    public void setGeneratedAt(LocalDateTime v) { this.generatedAt = v; }
    public Long getGeneratedAtEpochMillis() { return generatedAtEpochMillis; }
    public void setGeneratedAtEpochMillis(Long v) { this.generatedAtEpochMillis = v; }
}
