package com.datn.backend.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class EquipRequest {

    @NotBlank(message = "Mã thiết bị không được để trống")
    @Size(max = 50)
    private String code;

    @NotBlank(message = "Tên thiết bị không được để trống")
    private String name;

    @NotNull(message = "Vui lòng chọn loại thiết bị")
    private Long equipTypeId;

    @NotNull(message = "Vui lòng chọn khu đặt thiết bị")
    private Long buildingId;

    private String specifications;
    private String description;
    private BigDecimal purchasePrice;
    private LocalDate warrantyUntil;
    private Integer usefulLifeYears;
    private LocalDate acquisitionDate;

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Long getEquipTypeId() { return equipTypeId; }
    public void setEquipTypeId(Long equipTypeId) { this.equipTypeId = equipTypeId; }

    public Long getBuildingId() { return buildingId; }
    public void setBuildingId(Long buildingId) { this.buildingId = buildingId; }

    public String getSpecifications() { return specifications; }
    public void setSpecifications(String specifications) { this.specifications = specifications; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public BigDecimal getPurchasePrice() { return purchasePrice; }
    public void setPurchasePrice(BigDecimal purchasePrice) { this.purchasePrice = purchasePrice; }

    public LocalDate getWarrantyUntil() { return warrantyUntil; }
    public void setWarrantyUntil(LocalDate warrantyUntil) { this.warrantyUntil = warrantyUntil; }

    public Integer getUsefulLifeYears() { return usefulLifeYears; }
    public void setUsefulLifeYears(Integer usefulLifeYears) { this.usefulLifeYears = usefulLifeYears; }

    public LocalDate getAcquisitionDate() { return acquisitionDate; }
    public void setAcquisitionDate(LocalDate acquisitionDate) { this.acquisitionDate = acquisitionDate; }
}
