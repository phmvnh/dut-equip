package com.datn.backend.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import com.datn.backend.util.JsonStringListConverter;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

// Một dòng hàng trong đề nghị mua sắm — mỗi dòng có thể tạo nhiều thiết bị (quantity)
@Entity
@Table(name = "procurement_items")
public class ProcurementItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "request_id", nullable = false)
    private ProcurementRequest request;

    // Loại thiết bị sẽ trang bị
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "equip_type_id", nullable = false)
    private EquipType equipType;

    // Tên thiết bị (đặt cho các thiết bị sẽ sinh ra)
    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String specifications;

    @Column(nullable = false)
    private Integer quantity;

    // Đơn giá dự kiến (VND, tùy chọn)
    @Column(precision = 15, scale = 0)
    private BigDecimal unitPrice;

    // Bảo hành (tháng) — tính warrantyUntil khi nhập kho
    private Integer warrantyMonths;

    // Tuổi thọ hữu ích (năm) — phục vụ khấu hao của thiết bị sinh ra
    private Integer usefulLifeYears;

    // Khu/tòa sẽ đặt thiết bị (bắt buộc — thiết bị sinh ra cần vị trí)
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "target_building_id", nullable = false)
    private Building targetBuilding;

    // Danh sách mã thiết bị đã sinh khi nghiệm thu (traceability) — lưu JSON
    @Convert(converter = JsonStringListConverter.class)
    @Column(name = "received_codes", columnDefinition = "TEXT")
    private List<String> receivedCodes;

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

    public Long getId() { return id; }
    public ProcurementRequest getRequest() { return request; }
    public void setRequest(ProcurementRequest request) { this.request = request; }
    public EquipType getEquipType() { return equipType; }
    public void setEquipType(EquipType equipType) { this.equipType = equipType; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getSpecifications() { return specifications; }
    public void setSpecifications(String specifications) { this.specifications = specifications; }
    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }
    public BigDecimal getUnitPrice() { return unitPrice; }
    public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }
    public Integer getWarrantyMonths() { return warrantyMonths; }
    public void setWarrantyMonths(Integer warrantyMonths) { this.warrantyMonths = warrantyMonths; }
    public Integer getUsefulLifeYears() { return usefulLifeYears; }
    public void setUsefulLifeYears(Integer usefulLifeYears) { this.usefulLifeYears = usefulLifeYears; }
    public Building getTargetBuilding() { return targetBuilding; }
    public void setTargetBuilding(Building targetBuilding) { this.targetBuilding = targetBuilding; }
    public List<String> getReceivedCodes() { return receivedCodes; }
    public void setReceivedCodes(List<String> receivedCodes) { this.receivedCodes = receivedCodes; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
