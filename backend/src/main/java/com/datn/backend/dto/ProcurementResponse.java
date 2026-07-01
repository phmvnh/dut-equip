package com.datn.backend.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import com.datn.backend.entity.ProcurementItem;
import com.datn.backend.entity.ProcurementRequest;

public class ProcurementResponse {

    private Long id;
    private String code;
    private String title;
    private String requestedByName;
    private String reason;
    private String supplier;
    private String note;
    private String status;

    private String decisionNo;
    private LocalDate decisionDate;
    private String approverName;
    private String decisionFileUrl;
    private String approvedByName;
    private LocalDateTime approvedAt;
    private String rejectReason;
    private LocalDateTime completedAt;

    private int totalItems;
    private int totalQuantity;
    private BigDecimal estimatedTotal;

    private LocalDateTime createdAt;
    private List<ItemInfo> items;

    public static ProcurementResponse from(ProcurementRequest r, boolean includeItems) {
        ProcurementResponse dto = new ProcurementResponse();
        dto.id              = r.getId();
        dto.code            = r.getCode();
        dto.title           = r.getTitle();
        dto.requestedByName = r.getRequestedBy().getFullName();
        dto.reason          = r.getReason();
        dto.supplier        = r.getSupplier();
        dto.note            = r.getNote();
        dto.status          = r.getStatus().name();
        dto.decisionNo      = r.getDecisionNo();
        dto.decisionDate    = r.getDecisionDate();
        dto.approverName    = r.getApproverName();
        dto.decisionFileUrl = r.getDecisionFileUrl();
        dto.approvedByName  = r.getApprovedBy() != null ? r.getApprovedBy().getFullName() : null;
        dto.approvedAt      = r.getApprovedAt();
        dto.rejectReason    = r.getRejectReason();
        dto.completedAt     = r.getCompletedAt();
        dto.createdAt       = r.getCreatedAt();

        List<ProcurementItem> allItems = r.getItems();
        dto.totalItems    = allItems.size();
        dto.totalQuantity = allItems.stream().mapToInt(i -> i.getQuantity() != null ? i.getQuantity() : 0).sum();
        dto.estimatedTotal = allItems.stream()
                .filter(i -> i.getUnitPrice() != null && i.getQuantity() != null)
                .map(i -> i.getUnitPrice().multiply(BigDecimal.valueOf(i.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (includeItems) {
            dto.items = allItems.stream().map(ItemInfo::from).collect(Collectors.toList());
        }
        return dto;
    }

    public static class ItemInfo {
        private Long id;
        private Long equipTypeId;
        private String equipTypeName;
        private String name;
        private String specifications;
        private Integer quantity;
        private BigDecimal unitPrice;
        private Integer warrantyMonths;
        private Integer usefulLifeYears;
        private Long targetBuildingId;
        private String targetBuildingName;
        private List<String> receivedCodes;

        public static ItemInfo from(ProcurementItem i) {
            ItemInfo info = new ItemInfo();
            info.id                 = i.getId();
            info.equipTypeId        = i.getEquipType().getId();
            info.equipTypeName      = i.getEquipType().getName();
            info.name               = i.getName();
            info.specifications     = i.getSpecifications();
            info.quantity           = i.getQuantity();
            info.unitPrice          = i.getUnitPrice();
            info.warrantyMonths     = i.getWarrantyMonths();
            info.usefulLifeYears    = i.getUsefulLifeYears();
            info.targetBuildingId   = i.getTargetBuilding().getId();
            info.targetBuildingName = i.getTargetBuilding().getName();
            info.receivedCodes      = i.getReceivedCodes();
            return info;
        }

        public Long getId() { return id; }
        public Long getEquipTypeId() { return equipTypeId; }
        public String getEquipTypeName() { return equipTypeName; }
        public String getName() { return name; }
        public String getSpecifications() { return specifications; }
        public Integer getQuantity() { return quantity; }
        public BigDecimal getUnitPrice() { return unitPrice; }
        public Integer getWarrantyMonths() { return warrantyMonths; }
        public Integer getUsefulLifeYears() { return usefulLifeYears; }
        public Long getTargetBuildingId() { return targetBuildingId; }
        public String getTargetBuildingName() { return targetBuildingName; }
        public List<String> getReceivedCodes() { return receivedCodes; }
    }

    public Long getId() { return id; }
    public String getCode() { return code; }
    public String getTitle() { return title; }
    public String getRequestedByName() { return requestedByName; }
    public String getReason() { return reason; }
    public String getSupplier() { return supplier; }
    public String getNote() { return note; }
    public String getStatus() { return status; }
    public String getDecisionNo() { return decisionNo; }
    public LocalDate getDecisionDate() { return decisionDate; }
    public String getApproverName() { return approverName; }
    public String getDecisionFileUrl() { return decisionFileUrl; }
    public String getApprovedByName() { return approvedByName; }
    public LocalDateTime getApprovedAt() { return approvedAt; }
    public String getRejectReason() { return rejectReason; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public int getTotalItems() { return totalItems; }
    public int getTotalQuantity() { return totalQuantity; }
    public BigDecimal getEstimatedTotal() { return estimatedTotal; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public List<ItemInfo> getItems() { return items; }
}
