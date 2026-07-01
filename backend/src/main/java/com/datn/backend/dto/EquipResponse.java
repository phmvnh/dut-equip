package com.datn.backend.dto;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import com.datn.backend.entity.Equipment;
import com.datn.backend.entity.EquipmentImage;

public class EquipResponse {

    private Long id;
    private String code;
    private String name;
    private Long equipTypeId;
    private String equipTypeName;
    private Long buildingId;
    private String buildingName;
    private String status;
    private String specifications;
    private String description;
    private String mainImageUrl;
    // Danh sách ảnh phụ — chỉ load ở getById/getByCode/upload, list view để rỗng
    private List<ImageInfo> images = Collections.emptyList();
    private BigDecimal purchasePrice;
    private LocalDate warrantyUntil;
    private Integer usefulLifeYears;
    private LocalDate acquisitionDate;
    // Khấu hao đường thẳng — tính khi trả dữ liệu ra API, không lưu DB
    private BigDecimal annualDepreciation;
    private BigDecimal currentBookValue;
    private boolean hidden;
    private String disposalReason;
    private LocalDate disposalDate;
    private BigDecimal disposalValue;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    // Số lần đã/đang sử dụng (đơn APPROVED + OVERDUE + RETURNED)
    private long usageCount;

    public static EquipResponse from(Equipment e) {
        return from(e, 0L, null);
    }

    public static EquipResponse from(Equipment e, long usageCount) {
        return from(e, usageCount, null);
    }

    public static EquipResponse from(Equipment e, long usageCount, List<EquipmentImage> images) {
        EquipResponse dto = new EquipResponse();
        dto.id            = e.getId();
        dto.code          = e.getCode();
        dto.name          = e.getName();
        dto.equipTypeId   = e.getEquipType().getId();
        dto.equipTypeName = e.getEquipType().getName();
        dto.buildingId    = e.getBuilding().getId();
        dto.buildingName  = e.getBuilding().getName();
        dto.status        = e.getStatus().name();
        dto.specifications = e.getSpecifications();
        dto.description   = e.getDescription();
        dto.mainImageUrl  = e.getMainImageUrl();
        dto.purchasePrice    = e.getPurchasePrice();
        dto.warrantyUntil    = e.getWarrantyUntil();
        dto.usefulLifeYears  = e.getUsefulLifeYears();
        dto.acquisitionDate  = e.getAcquisitionDate();
        dto.annualDepreciation = computeAnnualDepreciation(e);
        dto.currentBookValue   = computeCurrentBookValue(e);
        dto.hidden         = e.isHidden();
        dto.disposalReason = e.getDisposalReason();
        dto.disposalDate   = e.getDisposalDate();
        dto.disposalValue  = e.getDisposalValue();
        dto.createdAt     = e.getCreatedAt();
        dto.updatedAt     = e.getUpdatedAt();
        dto.usageCount    = usageCount;
        dto.images        = images == null
                ? Collections.emptyList()
                : images.stream().map(ImageInfo::from).collect(Collectors.toList());
        return dto;
    }

    // Mỗi năm khấu hao = nguyên giá / số năm sử dụng hữu ích
    private static BigDecimal computeAnnualDepreciation(Equipment e) {
        if (e.getPurchasePrice() == null || e.getUsefulLifeYears() == null || e.getUsefulLifeYears() <= 0) {
            return null;
        }
        return e.getPurchasePrice().divide(BigDecimal.valueOf(e.getUsefulLifeYears()), 0, RoundingMode.HALF_UP);
    }

    // Giá trị còn lại = nguyên giá - khấu hao đã dùng, không cho âm
    private static BigDecimal computeCurrentBookValue(Equipment e) {
        if (e.getPurchasePrice() == null || e.getUsefulLifeYears() == null || e.getUsefulLifeYears() <= 0
                || e.getAcquisitionDate() == null) {
            return null;
        }
        long yearsUsed = java.time.temporal.ChronoUnit.YEARS.between(e.getAcquisitionDate(), LocalDate.now());
        if (yearsUsed < 0) yearsUsed = 0;
        BigDecimal annual = computeAnnualDepreciation(e);
        if (annual == null) return null;
        BigDecimal depreciated = annual.multiply(BigDecimal.valueOf(yearsUsed));
        BigDecimal remaining = e.getPurchasePrice().subtract(depreciated);
        return remaining.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : remaining;
    }

    public List<ImageInfo> getImages() { return images; }

    public static class ImageInfo {
        private Long id;
        private String url;

        public static ImageInfo from(EquipmentImage img) {
            ImageInfo info = new ImageInfo();
            info.id  = img.getId();
            info.url = img.getImageUrl();
            return info;
        }

        public Long getId() { return id; }
        public String getUrl() { return url; }
    }

    public Long getId() { return id; }
    public String getCode() { return code; }
    public String getName() { return name; }
    public Long getEquipTypeId() { return equipTypeId; }
    public String getEquipTypeName() { return equipTypeName; }
    public Long getBuildingId() { return buildingId; }
    public String getBuildingName() { return buildingName; }
    public String getStatus() { return status; }
    public String getSpecifications() { return specifications; }
    public String getDescription() { return description; }
    public String getMainImageUrl() { return mainImageUrl; }
    public BigDecimal getPurchasePrice() { return purchasePrice; }
    public LocalDate getWarrantyUntil() { return warrantyUntil; }
    public Integer getUsefulLifeYears() { return usefulLifeYears; }
    public LocalDate getAcquisitionDate() { return acquisitionDate; }
    public BigDecimal getAnnualDepreciation() { return annualDepreciation; }
    public BigDecimal getCurrentBookValue() { return currentBookValue; }
    public boolean isHidden() { return hidden; }
    public String getDisposalReason() { return disposalReason; }
    public LocalDate getDisposalDate() { return disposalDate; }
    public BigDecimal getDisposalValue() { return disposalValue; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public long getUsageCount() { return usageCount; }
}
