package com.datn.backend.service.impl;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.datn.backend.dto.ActivityLogResponse;
import com.datn.backend.entity.BorrowRequest;
import com.datn.backend.entity.CompensationClaim;
import com.datn.backend.entity.Equipment;
import com.datn.backend.entity.MaintenanceLog;
import com.datn.backend.entity.User;
import com.datn.backend.enums.BorrowStatus;
import com.datn.backend.enums.CompensationStatus;
import com.datn.backend.enums.EquipmentStatus;
import com.datn.backend.enums.MaintenanceStatus;
import com.datn.backend.enums.UserRole;
import com.datn.backend.repository.BorrowRequestRepository;
import com.datn.backend.repository.CompensationClaimRepository;
import com.datn.backend.repository.EquipmentRepository;
import com.datn.backend.repository.MaintenanceLogRepository;
import com.datn.backend.repository.UserRepository;
import com.datn.backend.service.ActivityLogService;

@Service
@Transactional(readOnly = true)
public class ActivityLogServiceImpl implements ActivityLogService {

    private final BorrowRequestRepository     borrowRepo;
    private final MaintenanceLogRepository    maintenanceRepo;
    private final CompensationClaimRepository compensationRepo;
    private final EquipmentRepository         equipmentRepo;
    private final UserRepository              userRepo;

    public ActivityLogServiceImpl(BorrowRequestRepository borrowRepo,
                                  MaintenanceLogRepository maintenanceRepo,
                                  CompensationClaimRepository compensationRepo,
                                  EquipmentRepository equipmentRepo,
                                  UserRepository userRepo) {
        this.borrowRepo       = borrowRepo;
        this.maintenanceRepo  = maintenanceRepo;
        this.compensationRepo = compensationRepo;
        this.equipmentRepo    = equipmentRepo;
        this.userRepo         = userRepo;
    }

    @Override
    public Page<ActivityLogResponse> getActivities(LocalDateTime from, String keyword, Pageable pageable) {
        List<ActivityLogResponse> all = new ArrayList<>();

        // --- BorrowRequest: chỉ event có sự duyệt/từ chối/xác nhận trả của Admin ---
        for (BorrowRequest b : borrowRepo.findAll()) {
            String eqInfo = "Thiết bị: " + b.getEquipment().getName()
                    + " (" + b.getEquipment().getCode() + ") — Người mượn: " + b.getBorrowerName();

            if (b.getStatus() == BorrowStatus.APPROVED || b.getStatus() == BorrowStatus.OVERDUE
                    || b.getStatus() == BorrowStatus.RETURNED) {
                // Đã từng được duyệt → có 1 event APPROVED tại updatedAt của lần chuyển trạng thái đó
                // (Hệ thống không log riêng nên dùng updatedAt làm best-effort)
                LocalDateTime approveTime = b.getUpdatedAt();
                all.add(new ActivityLogResponse(
                        "BORROW_APPROVED",
                        "Đã duyệt đơn mượn #" + b.getId(),
                        eqInfo,
                        approveTime,
                        "BORROW", b.getId()));
            }
            if (b.getStatus() == BorrowStatus.REJECTED) {
                all.add(new ActivityLogResponse(
                        "BORROW_REJECTED",
                        "Đã từ chối đơn mượn #" + b.getId(),
                        eqInfo + (b.getRejectReason() != null ? " — Lý do: " + b.getRejectReason() : ""),
                        b.getUpdatedAt(),
                        "BORROW", b.getId()));
            }
            if (b.getStatus() == BorrowStatus.RETURNED && b.getActualReturnDateTime() != null) {
                all.add(new ActivityLogResponse(
                        "BORROW_RETURN_CONFIRMED",
                        "Đã xác nhận trả thiết bị (đơn #" + b.getId() + ")",
                        eqInfo,
                        b.getActualReturnDateTime(),
                        "BORROW", b.getId()));
            }
        }

        // --- MaintenanceLog ---
        for (MaintenanceLog m : maintenanceRepo.findAll()) {
            String eqInfo = "Thiết bị: " + m.getEquipment().getName()
                    + " (" + m.getEquipment().getCode() + ")"
                    + (m.getTechnicianName() != null ? " — Người thực hiện: " + m.getTechnicianName() : "");

            // Tạo phiếu — dùng createdAt
            all.add(new ActivityLogResponse(
                    "MAINTENANCE_CREATED",
                    "Đã tạo phiếu bảo trì " + (m.getCode() != null ? m.getCode() : "#" + m.getId()),
                    eqInfo,
                    m.getCreatedAt(),
                    "MAINTENANCE", m.getId()));

            if (m.getStatus() == MaintenanceStatus.COMPLETED) {
                all.add(new ActivityLogResponse(
                        "MAINTENANCE_COMPLETED",
                        "Đã hoàn thành phiếu bảo trì " + (m.getCode() != null ? m.getCode() : "#" + m.getId()),
                        eqInfo,
                        toDateTime(m.getEndDate(), m.getUpdatedAt()),
                        "MAINTENANCE", m.getId()));
            } else if (m.getStatus() == MaintenanceStatus.CANCELLED) {
                all.add(new ActivityLogResponse(
                        "MAINTENANCE_CANCELLED",
                        "Đã hủy phiếu bảo trì " + (m.getCode() != null ? m.getCode() : "#" + m.getId()),
                        eqInfo,
                        m.getUpdatedAt(),
                        "MAINTENANCE", m.getId()));
            }
        }

        // --- CompensationClaim ---
        for (CompensationClaim c : compensationRepo.findAll()) {
            String info = "Phiếu " + (c.getCode() != null ? c.getCode() : "#" + c.getId())
                    + " — " + c.getEquipmentName() + " — " + c.getBorrowerName();

            all.add(new ActivityLogResponse(
                    "COMPENSATION_CREATED",
                    "Đã tạo phiếu bồi thường",
                    info,
                    c.getCreatedAt(),
                    "COMPENSATION", c.getId()));

            if (c.getPaidAt() != null) {
                all.add(new ActivityLogResponse(
                        "COMPENSATION_PAID",
                        "Đã xác nhận nhận tiền bồi thường",
                        info,
                        c.getPaidAt(),
                        "COMPENSATION", c.getId()));
            }
            if (c.getStatus() == CompensationStatus.CANCELLED) {
                all.add(new ActivityLogResponse(
                        "COMPENSATION_CANCELLED",
                        "Đã hủy phiếu bồi thường",
                        info,
                        c.getUpdatedAt(),
                        "COMPENSATION", c.getId()));
            }
            if (c.getComplaintResolvedAt() != null) {
                all.add(new ActivityLogResponse(
                        "COMPLAINT_RESOLVED",
                        "Đã xử lý khiếu nại bồi thường",
                        info,
                        c.getComplaintResolvedAt(),
                        "COMPENSATION", c.getId()));
            }
        }

        // --- Equipment ---
        for (Equipment e : equipmentRepo.findAll()) {
            String eqInfo = e.getName() + " (" + e.getCode() + ")";

            all.add(new ActivityLogResponse(
                    "EQUIPMENT_ADDED",
                    "Đã thêm thiết bị mới",
                    eqInfo,
                    e.getCreatedAt(),
                    "EQUIPMENT", e.getId()));

            if (e.getStatus() == EquipmentStatus.DISPOSED) {
                all.add(new ActivityLogResponse(
                        "EQUIPMENT_DISPOSED",
                        "Đã thanh lý thiết bị",
                        eqInfo + (e.getDisposalReason() != null ? " — Lý do: " + e.getDisposalReason() : ""),
                        toDateTime(e.getDisposalDate(), e.getUpdatedAt()),
                        "EQUIPMENT", e.getId()));
            }
        }

        // --- User (chỉ giảng viên — admin tạo tài khoản) ---
        for (User u : userRepo.findAll()) {
            if (u.getRole() != UserRole.USER) continue;
            all.add(new ActivityLogResponse(
                    "USER_CREATED",
                    "Đã tạo tài khoản giảng viên",
                    u.getFullName() + " (" + u.getEmail() + ")"
                            + (u.getFaculty() != null ? " — " + u.getFaculty() : ""),
                    u.getCreatedAt(),
                    "USER", u.getId()));
        }

        // --- Filter timestamp ---
        if (from != null) {
            all.removeIf(a -> a.getTimestamp() == null || a.getTimestamp().isBefore(from));
        }

        // --- Filter keyword (case-insensitive, match title hoặc description) ---
        if (keyword != null && !keyword.isBlank()) {
            String kw = keyword.trim().toLowerCase();
            all.removeIf(a -> {
                String t = (a.getTitle() == null ? "" : a.getTitle()).toLowerCase();
                String d = (a.getDescription() == null ? "" : a.getDescription()).toLowerCase();
                return !t.contains(kw) && !d.contains(kw);
            });
        }

        // Sort DESC theo timestamp (null timestamp dạt xuống cuối)
        all.sort(Comparator.comparing(
                ActivityLogResponse::getTimestamp,
                Comparator.nullsLast(Comparator.reverseOrder())));

        // Paginate in-memory
        int total = all.size();
        int offset = (int) pageable.getOffset();
        int end = Math.min(offset + pageable.getPageSize(), total);
        List<ActivityLogResponse> pageContent = offset >= total ? List.of() : all.subList(offset, end);

        return new PageImpl<>(pageContent, pageable, total);
    }

    // Helper: ưu tiên LocalDate (set giờ 23:59), fallback updatedAt
    private LocalDateTime toDateTime(LocalDate date, LocalDateTime fallback) {
        if (date != null) return date.atTime(LocalTime.of(23, 59));
        return fallback;
    }
}
