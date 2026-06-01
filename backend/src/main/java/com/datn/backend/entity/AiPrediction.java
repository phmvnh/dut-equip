package com.datn.backend.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.Immutable;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

// Bảng do AI service (Python) ghi vào. Backend chỉ ĐỌC để tránh xung đột ddl-auto.
@Entity
@Immutable
@Table(name = "ai_predictions")
public class AiPrediction {

    @Id
    @Column(name = "equipment_id")
    private Long equipmentId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "equipment_id", insertable = false, updatable = false)
    private Equipment equipment;

    @Column(name = "risk_level", nullable = false, length = 10)
    private String riskLevel;

    @Column(name = "risk_score", nullable = false)
    private Integer riskScore;

    @Column(name = "days_to_maintenance")
    private Integer daysToMaintenance;

    @Column(name = "will_fail_in_7d", nullable = false)
    private boolean willFailIn7d;

    @Column(name = "reason", columnDefinition = "TEXT", nullable = false)
    private String reason;

    @Column(name = "generated_at", nullable = false)
    private LocalDateTime generatedAt;

    public Long getEquipmentId() { return equipmentId; }
    public Equipment getEquipment() { return equipment; }
    public String getRiskLevel() { return riskLevel; }
    public Integer getRiskScore() { return riskScore; }
    public Integer getDaysToMaintenance() { return daysToMaintenance; }
    public boolean isWillFailIn7d() { return willFailIn7d; }
    public String getReason() { return reason; }
    public LocalDateTime getGeneratedAt() { return generatedAt; }
}
