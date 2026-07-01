package com.datn.backend.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
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

// Kết quả kiểm kê từng thiết bị trong 1 đợt kiểm kê
@Entity
@Table(name = "inventory_items")
public class InventoryItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "event_id", nullable = false)
    private InventoryEvent event;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "equipment_id", nullable = false)
    private Equipment equipment;

    // Vị trí & trạng thái kỳ vọng (lấy từ DB lúc tạo đợt kiểm kê)
    private String expectedLocation;
    private String expectedStatus;

    // Kết quả thực tế — điền khi kiểm kê viên xác nhận
    private String actualLocation;

    @Column(columnDefinition = "TEXT")
    private String actualCondition;

    // true = tìm thấy đúng vị trí; false = không tìm thấy / sai vị trí
    @Column(nullable = false)
    private boolean isFound = false;

    @Column(columnDefinition = "TEXT")
    private String discrepancyNote;

    // Ai xác nhận và lúc nào
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "checked_by")
    private User checkedBy;

    private LocalDateTime checkedAt;

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
    public InventoryEvent getEvent() { return event; }
    public void setEvent(InventoryEvent event) { this.event = event; }
    public Equipment getEquipment() { return equipment; }
    public void setEquipment(Equipment equipment) { this.equipment = equipment; }
    public String getExpectedLocation() { return expectedLocation; }
    public void setExpectedLocation(String expectedLocation) { this.expectedLocation = expectedLocation; }
    public String getExpectedStatus() { return expectedStatus; }
    public void setExpectedStatus(String expectedStatus) { this.expectedStatus = expectedStatus; }
    public String getActualLocation() { return actualLocation; }
    public void setActualLocation(String actualLocation) { this.actualLocation = actualLocation; }
    public String getActualCondition() { return actualCondition; }
    public void setActualCondition(String actualCondition) { this.actualCondition = actualCondition; }
    public boolean isFound() { return isFound; }
    public void setFound(boolean found) { isFound = found; }
    public String getDiscrepancyNote() { return discrepancyNote; }
    public void setDiscrepancyNote(String discrepancyNote) { this.discrepancyNote = discrepancyNote; }
    public User getCheckedBy() { return checkedBy; }
    public void setCheckedBy(User checkedBy) { this.checkedBy = checkedBy; }
    public LocalDateTime getCheckedAt() { return checkedAt; }
    public void setCheckedAt(LocalDateTime checkedAt) { this.checkedAt = checkedAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
