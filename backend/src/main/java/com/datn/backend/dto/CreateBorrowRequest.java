package com.datn.backend.dto;

import java.time.LocalDateTime;

import com.datn.backend.enums.PurposeType;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class CreateBorrowRequest {

    @NotNull(message = "Thiết bị không được để trống")
    private Long equipmentId;

    @NotNull(message = "Vui lòng chọn khu sử dụng")
    private Long buildingId;

    @NotBlank(message = "Vui lòng nhập phòng sử dụng")
    @Size(max = 100)
    private String room;

    @NotNull(message = "Vui lòng chọn ngày giờ mượn")
    private LocalDateTime borrowDateTime;

    @NotNull(message = "Vui lòng chọn ngày giờ trả")
    private LocalDateTime returnDateTime;

    @NotNull(message = "Vui lòng chọn mục đích sử dụng")
    private PurposeType purpose;

    // Bắt buộc khi purpose = OTHER — validate trong Service
    private String purposeNote;

    private String note;

    @AssertTrue(message = "Vui lòng xác nhận cam kết sử dụng thiết bị")
    private Boolean confirmed;

    // true khi user đã thấy cảnh báo trùng giờ và xác nhận muốn đặt tiếp
    private boolean confirmedOverlap;

    public Long getEquipmentId() { return equipmentId; }
    public void setEquipmentId(Long equipmentId) { this.equipmentId = equipmentId; }

    public Long getBuildingId() { return buildingId; }
    public void setBuildingId(Long buildingId) { this.buildingId = buildingId; }

    public String getRoom() { return room; }
    public void setRoom(String room) { this.room = room; }

    public LocalDateTime getBorrowDateTime() { return borrowDateTime; }
    public void setBorrowDateTime(LocalDateTime borrowDateTime) { this.borrowDateTime = borrowDateTime; }

    public LocalDateTime getReturnDateTime() { return returnDateTime; }
    public void setReturnDateTime(LocalDateTime returnDateTime) { this.returnDateTime = returnDateTime; }

    public PurposeType getPurpose() { return purpose; }
    public void setPurpose(PurposeType purpose) { this.purpose = purpose; }

    public String getPurposeNote() { return purposeNote; }
    public void setPurposeNote(String purposeNote) { this.purposeNote = purposeNote; }

    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }

    public Boolean getConfirmed() { return confirmed; }
    public void setConfirmed(Boolean confirmed) { this.confirmed = confirmed; }

    public boolean isConfirmedOverlap() { return confirmedOverlap; }
    public void setConfirmedOverlap(boolean confirmedOverlap) { this.confirmedOverlap = confirmedOverlap; }
}
