package com.datn.backend.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import com.datn.backend.entity.BorrowRequest;
import com.datn.backend.enums.PurposeType;

public class BorrowResponse {

    private Long id;
    private Long equipmentId;
    private String equipmentName;
    private String equipmentCode;
    // Snapshot trạng thái thiết bị tại lúc trả response — FE dùng để quyết định hiện nút "Tạo phiếu BT"
    private String equipmentStatus;
    // Snapshot giá thiết bị — FE pre-fill số tiền bồi thường khi admin xác nhận trả với "Do người dùng"
    private BigDecimal equipmentPurchasePrice;
    private Long userId;
    private String userName;
    private String userEmail;
    private String userPhone;
    private String buildingName;
    private String room;
    private LocalDateTime borrowDateTime;
    private LocalDateTime returnDateTime;
    private LocalDateTime actualReturnDateTime;
    private String purpose;
    private String purposeNote;
    private String note;
    private String status;
    private String rejectReason;
    private String preBorrowConditionNote;
    private LocalDateTime createdAt;

    // Báo hỏng — null/false nếu chưa báo
    private boolean damageReported;
    private String damageSeverity;
    private String damageDescription;
    private List<String> damageImageUrls;
    private LocalDateTime damageReportedAt;

    private static final Map<PurposeType, String> PURPOSE_LABELS = Map.of(
        PurposeType.TEACHING,        "Giảng dạy",
        PurposeType.PRACTICE,        "Thực hành",
        PurposeType.CONFERENCE,      "Hội thảo",
        PurposeType.RESEARCH,        "Nghiên cứu khoa học",
        PurposeType.EXTRACURRICULAR, "Hoạt động ngoại khóa / Sự kiện trường",
        PurposeType.OTHER,           "Khác"
    );

    public static BorrowResponse from(BorrowRequest r) {
        BorrowResponse dto = new BorrowResponse();
        dto.id                  = r.getId();
        dto.equipmentId         = r.getEquipment().getId();
        dto.equipmentName       = r.getEquipment().getName();
        dto.equipmentCode       = r.getEquipment().getCode();
        dto.equipmentStatus     = r.getEquipment().getStatus().name();
        dto.equipmentPurchasePrice = r.getEquipment().getPurchasePrice();
        dto.userId              = r.getUser().getId();
        // Đọc snapshot — phản ánh đúng thông tin người mượn tại thời điểm tạo đơn
        dto.userName            = r.getBorrowerName();
        dto.userEmail           = r.getBorrowerEmail();
        dto.userPhone           = r.getBorrowerPhone();
        dto.buildingName        = r.getBuilding() != null ? r.getBuilding().getName() : null;
        dto.room                = r.getRoom();
        dto.borrowDateTime      = r.getBorrowDateTime();
        dto.returnDateTime      = r.getReturnDateTime();
        dto.actualReturnDateTime = r.getActualReturnDateTime();
        dto.purpose             = r.getPurpose() != null ? PURPOSE_LABELS.get(r.getPurpose()) : null;
        dto.purposeNote         = r.getPurposeNote();
        dto.note                = r.getNote();
        dto.status              = r.getStatus().name();
        dto.rejectReason        = r.getRejectReason();
        dto.preBorrowConditionNote = r.getPreBorrowConditionNote();
        dto.createdAt           = r.getCreatedAt();
        dto.damageReported      = r.isDamageReported();
        dto.damageSeverity      = r.getDamageSeverity() != null ? r.getDamageSeverity().name() : null;
        dto.damageDescription   = r.getDamageDescription();
        dto.damageImageUrls     = r.getDamageImageUrls();
        dto.damageReportedAt    = r.getDamageReportedAt();
        return dto;
    }

    public Long getId() { return id; }
    public Long getEquipmentId() { return equipmentId; }
    public String getEquipmentName() { return equipmentName; }
    public String getEquipmentCode() { return equipmentCode; }
    public String getEquipmentStatus() { return equipmentStatus; }
    public BigDecimal getEquipmentPurchasePrice() { return equipmentPurchasePrice; }
    public Long getUserId() { return userId; }
    public String getUserName() { return userName; }
    public String getUserEmail() { return userEmail; }
    public String getUserPhone() { return userPhone; }
    public String getBuildingName() { return buildingName; }
    public String getRoom() { return room; }
    public LocalDateTime getBorrowDateTime() { return borrowDateTime; }
    public LocalDateTime getReturnDateTime() { return returnDateTime; }
    public LocalDateTime getActualReturnDateTime() { return actualReturnDateTime; }
    public String getPurpose() { return purpose; }
    public String getPurposeNote() { return purposeNote; }
    public String getNote() { return note; }
    public String getStatus() { return status; }
    public String getRejectReason() { return rejectReason; }
    public String getPreBorrowConditionNote() { return preBorrowConditionNote; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public boolean isDamageReported() { return damageReported; }
    public String getDamageSeverity() { return damageSeverity; }
    public String getDamageDescription() { return damageDescription; }
    public List<String> getDamageImageUrls() { return damageImageUrls; }
    public LocalDateTime getDamageReportedAt() { return damageReportedAt; }
}
