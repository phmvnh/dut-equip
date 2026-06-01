package com.datn.backend.entity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import com.datn.backend.enums.EquipmentStatus;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

// Thiết bị — bảng chính của hệ thống
@Entity
@Table(name = "equipments")
public class Equipment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Mã thiết bị do Admin đặt, VD: TB-001
    @Column(nullable = false, unique = true, length = 50)
    private String code;

    // Tên thiết bị
    @Column(nullable = false)
    private String name;

    // Loại thiết bị (FK tới equip_types)
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "equip_type_id", nullable = false)
    private EquipType equipType;

    // Khu đặt thiết bị (FK tới buildings)
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "building_id", nullable = false)
    private Building building;

    // Trạng thái: AVAILABLE | BORROWED | MAINTENANCE | BROKEN
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EquipmentStatus status = EquipmentStatus.AVAILABLE;

    // Thông số kỹ thuật (text dài)
    @Column(columnDefinition = "TEXT")
    private String specifications;

    // Mô tả chung
    @Column(columnDefinition = "TEXT")
    private String description;

    // Ảnh chính của thiết bị
    @Column(length = 500)
    private String mainImageUrl;

    // Giá trị thiết bị khi mua (VND, có thể null)
    @Column(precision = 15, scale = 0)
    private BigDecimal purchasePrice;

    // Hạn bảo hành (có thể null)
    private LocalDate warrantyUntil;

    // Ẩn khỏi HomePage (user không thấy) — Admin có thể bật/tắt bất kỳ lúc nào.
    // Khác với status: hidden là cờ orthogonal, không thay đổi vòng đời thiết bị.
    @Column(nullable = false)
    private boolean hidden = false;

    // Thông tin thanh lý — chỉ điền khi status = DISPOSED
    @Column(columnDefinition = "TEXT")
    private String disposalReason;

    private LocalDate disposalDate;

    @Column(precision = 15, scale = 0)
    private BigDecimal disposalValue;

    // Thời gian thêm và cập nhật thiết bị
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = this.createdAt;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public EquipType getEquipType() {
        return equipType;
    }

    public void setEquipType(EquipType equipType) {
        this.equipType = equipType;
    }

    public Building getBuilding() {
        return building;
    }

    public void setBuilding(Building building) {
        this.building = building;
    }

    public EquipmentStatus getStatus() {
        return status;
    }

    public void setStatus(EquipmentStatus status) {
        this.status = status;
    }

    public String getSpecifications() {
        return specifications;
    }

    public void setSpecifications(String specifications) {
        this.specifications = specifications;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getMainImageUrl() {
        return mainImageUrl;
    }

    public void setMainImageUrl(String mainImageUrl) {
        this.mainImageUrl = mainImageUrl;
    }

    public BigDecimal getPurchasePrice() {
        return purchasePrice;
    }

    public void setPurchasePrice(BigDecimal purchasePrice) {
        this.purchasePrice = purchasePrice;
    }

    public LocalDate getWarrantyUntil() {
        return warrantyUntil;
    }

    public void setWarrantyUntil(LocalDate warrantyUntil) {
        this.warrantyUntil = warrantyUntil;
    }

    public boolean isHidden() {
        return hidden;
    }

    public void setHidden(boolean hidden) {
        this.hidden = hidden;
    }

    public String getDisposalReason() {
        return disposalReason;
    }

    public void setDisposalReason(String disposalReason) {
        this.disposalReason = disposalReason;
    }

    public LocalDate getDisposalDate() {
        return disposalDate;
    }

    public void setDisposalDate(LocalDate disposalDate) {
        this.disposalDate = disposalDate;
    }

    public BigDecimal getDisposalValue() {
        return disposalValue;
    }

    public void setDisposalValue(BigDecimal disposalValue) {
        this.disposalValue = disposalValue;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
