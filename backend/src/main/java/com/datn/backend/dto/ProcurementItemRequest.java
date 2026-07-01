package com.datn.backend.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

// Một dòng hàng trong đề nghị mua sắm
public class ProcurementItemRequest {

    @NotNull(message = "Vui lòng chọn loại thiết bị")
    private Long equipTypeId;

    @NotBlank(message = "Tên thiết bị không được để trống")
    private String name;

    private String specifications;

    @NotNull(message = "Vui lòng nhập số lượng")
    @Min(value = 1, message = "Số lượng tối thiểu là 1")
    private Integer quantity;

    private BigDecimal unitPrice;
    private Integer warrantyMonths;
    private Integer usefulLifeYears;

    @NotNull(message = "Vui lòng chọn khu/tòa sẽ đặt thiết bị")
    private Long targetBuildingId;

    public Long getEquipTypeId() { return equipTypeId; }
    public void setEquipTypeId(Long equipTypeId) { this.equipTypeId = equipTypeId; }
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
    public Long getTargetBuildingId() { return targetBuildingId; }
    public void setTargetBuildingId(Long targetBuildingId) { this.targetBuildingId = targetBuildingId; }
}
