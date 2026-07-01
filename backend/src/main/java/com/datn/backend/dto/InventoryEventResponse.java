package com.datn.backend.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import com.datn.backend.entity.InventoryEvent;
import com.datn.backend.entity.InventoryItem;

public class InventoryEventResponse {

    private Long id;
    private String code;
    private String title;
    private String description;
    private LocalDate startDate;
    private LocalDate endDate;
    private String status;
    private String createdByName;
    private int totalItems;
    private int checkedItems;
    private int foundItems;
    private LocalDateTime createdAt;
    private List<ItemInfo> items;

    public static InventoryEventResponse from(InventoryEvent e, boolean includeItems) {
        InventoryEventResponse dto = new InventoryEventResponse();
        dto.id            = e.getId();
        dto.code          = e.getCode();
        dto.title         = e.getTitle();
        dto.description   = e.getDescription();
        dto.startDate     = e.getStartDate();
        dto.endDate       = e.getEndDate();
        dto.status        = e.getStatus();
        dto.createdByName = e.getCreatedBy().getFullName();
        dto.createdAt     = e.getCreatedAt();

        List<InventoryItem> allItems = e.getItems();
        dto.totalItems   = allItems.size();
        dto.checkedItems = (int) allItems.stream().filter(i -> i.getCheckedAt() != null).count();
        dto.foundItems   = (int) allItems.stream().filter(InventoryItem::isFound).count();

        if (includeItems) {
            dto.items = allItems.stream().map(ItemInfo::from).collect(Collectors.toList());
        }
        return dto;
    }

    public static class ItemInfo {
        private Long id;
        private Long equipmentId;
        private String equipmentCode;
        private String equipmentName;
        private String equipmentType;
        private String expectedLocation;
        private String expectedStatus;
        private String actualLocation;
        private String actualCondition;
        private boolean found;
        private String discrepancyNote;
        private String checkedByName;
        private LocalDateTime checkedAt;

        public static ItemInfo from(InventoryItem i) {
            ItemInfo info = new ItemInfo();
            info.id               = i.getId();
            info.equipmentId      = i.getEquipment().getId();
            info.equipmentCode    = i.getEquipment().getCode();
            info.equipmentName    = i.getEquipment().getName();
            info.equipmentType    = i.getEquipment().getEquipType().getName();
            info.expectedLocation = i.getExpectedLocation();
            info.expectedStatus   = i.getExpectedStatus();
            info.actualLocation   = i.getActualLocation();
            info.actualCondition  = i.getActualCondition();
            info.found            = i.isFound();
            info.discrepancyNote  = i.getDiscrepancyNote();
            info.checkedByName    = i.getCheckedBy() != null ? i.getCheckedBy().getFullName() : null;
            info.checkedAt        = i.getCheckedAt();
            return info;
        }

        public Long getId() { return id; }
        public Long getEquipmentId() { return equipmentId; }
        public String getEquipmentCode() { return equipmentCode; }
        public String getEquipmentName() { return equipmentName; }
        public String getEquipmentType() { return equipmentType; }
        public String getExpectedLocation() { return expectedLocation; }
        public String getExpectedStatus() { return expectedStatus; }
        public String getActualLocation() { return actualLocation; }
        public String getActualCondition() { return actualCondition; }
        public boolean isFound() { return found; }
        public String getDiscrepancyNote() { return discrepancyNote; }
        public String getCheckedByName() { return checkedByName; }
        public LocalDateTime getCheckedAt() { return checkedAt; }
    }

    public Long getId() { return id; }
    public String getCode() { return code; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public LocalDate getStartDate() { return startDate; }
    public LocalDate getEndDate() { return endDate; }
    public String getStatus() { return status; }
    public String getCreatedByName() { return createdByName; }
    public int getTotalItems() { return totalItems; }
    public int getCheckedItems() { return checkedItems; }
    public int getFoundItems() { return foundItems; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public List<ItemInfo> getItems() { return items; }
}
