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
import com.datn.backend.entity.DepartmentLoan;
import com.datn.backend.entity.DisposalRequest;
import com.datn.backend.entity.Equipment;
import com.datn.backend.entity.MaintenanceLog;
import com.datn.backend.entity.ProcurementRequest;
import com.datn.backend.entity.User;
import com.datn.backend.enums.BorrowStatus;
import com.datn.backend.enums.CompensationStatus;
import com.datn.backend.enums.DepartmentLoanStatus;
import com.datn.backend.enums.DisposalStatus;
import com.datn.backend.enums.EquipmentStatus;
import com.datn.backend.enums.MaintenanceStatus;
import com.datn.backend.enums.ProcurementStatus;
import com.datn.backend.enums.UserRole;
import com.datn.backend.repository.BorrowRequestRepository;
import com.datn.backend.repository.CompensationClaimRepository;
import com.datn.backend.repository.DepartmentLoanRepository;
import com.datn.backend.repository.DisposalRequestRepository;
import com.datn.backend.repository.EquipmentRepository;
import com.datn.backend.repository.MaintenanceLogRepository;
import com.datn.backend.repository.ProcurementRequestRepository;
import com.datn.backend.repository.UserRepository;
import com.datn.backend.service.ActivityLogService;

@Service
@Transactional(readOnly = true)
public class ActivityLogServiceImpl implements ActivityLogService {

    private final BorrowRequestRepository      borrowRepo;
    private final MaintenanceLogRepository     maintenanceRepo;
    private final CompensationClaimRepository  compensationRepo;
    private final EquipmentRepository          equipmentRepo;
    private final UserRepository               userRepo;
    private final ProcurementRequestRepository procurementRepo;
    private final DisposalRequestRepository    disposalRepo;
    private final DepartmentLoanRepository     departmentLoanRepo;

    public ActivityLogServiceImpl(BorrowRequestRepository borrowRepo,
                                  MaintenanceLogRepository maintenanceRepo,
                                  CompensationClaimRepository compensationRepo,
                                  EquipmentRepository equipmentRepo,
                                  UserRepository userRepo,
                                  ProcurementRequestRepository procurementRepo,
                                  DisposalRequestRepository disposalRepo,
                                  DepartmentLoanRepository departmentLoanRepo) {
        this.borrowRepo          = borrowRepo;
        this.maintenanceRepo     = maintenanceRepo;
        this.compensationRepo    = compensationRepo;
        this.equipmentRepo       = equipmentRepo;
        this.userRepo            = userRepo;
        this.procurementRepo     = procurementRepo;
        this.disposalRepo        = disposalRepo;
        this.departmentLoanRepo  = departmentLoanRepo;
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

        // --- ProcurementRequest (mua sắm) ---
        for (ProcurementRequest p : procurementRepo.findAll()) {
            String info = "Đề nghị " + p.getCode() + " — \"" + p.getTitle() + "\""
                    + " — Người lập: " + p.getRequestedBy().getFullName();

            all.add(new ActivityLogResponse(
                    "PROCUREMENT_CREATED",
                    "Đã lập đề nghị mua sắm " + p.getCode(),
                    info,
                    p.getCreatedAt(),
                    "PROCUREMENT", p.getId()));

            if (p.getApprovedAt() != null) {
                all.add(new ActivityLogResponse(
                        "PROCUREMENT_APPROVED",
                        "Đã duyệt đề nghị mua sắm " + p.getCode(),
                        info + (p.getDecisionNo() != null ? " — QĐ: " + p.getDecisionNo() : ""),
                        p.getApprovedAt(),
                        "PROCUREMENT", p.getId()));
            }
            if (p.getStatus() == ProcurementStatus.COMPLETED) {
                all.add(new ActivityLogResponse(
                        "PROCUREMENT_COMPLETED",
                        "Đã nghiệm thu nhập kho đề nghị " + p.getCode(),
                        info,
                        p.getCompletedAt() != null ? p.getCompletedAt() : p.getUpdatedAt(),
                        "PROCUREMENT", p.getId()));
            } else if (p.getStatus() == ProcurementStatus.REJECTED) {
                all.add(new ActivityLogResponse(
                        "PROCUREMENT_REJECTED",
                        "Đã từ chối đề nghị mua sắm " + p.getCode(),
                        info,
                        p.getUpdatedAt(),
                        "PROCUREMENT", p.getId()));
            }
        }

        // --- DisposalRequest (thanh lý) ---
        for (DisposalRequest d : disposalRepo.findAll()) {
            String info = "Đề nghị " + d.getCode() + " — thiết bị " + d.getEquipmentName()
                    + " (" + d.getEquipmentCode() + ")";

            all.add(new ActivityLogResponse(
                    "DISPOSAL_CREATED",
                    "Đã lập đề nghị thanh lý " + d.getCode(),
                    info,
                    d.getCreatedAt(),
                    "DISPOSAL", d.getId()));

            if (d.getApprovedAt() != null) {
                all.add(new ActivityLogResponse(
                        "DISPOSAL_APPROVED",
                        "Đã duyệt đề nghị thanh lý " + d.getCode(),
                        info + (d.getDecisionNo() != null ? " — QĐ: " + d.getDecisionNo() : ""),
                        d.getApprovedAt(),
                        "DISPOSAL", d.getId()));
            }
            if (d.getStatus() == DisposalStatus.COMPLETED) {
                all.add(new ActivityLogResponse(
                        "DISPOSAL_COMPLETED",
                        "Đã thực hiện thanh lý " + d.getCode(),
                        info,
                        d.getCompletedAt() != null ? d.getCompletedAt() : d.getUpdatedAt(),
                        "DISPOSAL", d.getId()));
            } else if (d.getStatus() == DisposalStatus.REJECTED) {
                all.add(new ActivityLogResponse(
                        "DISPOSAL_REJECTED",
                        "Đã từ chối đề nghị thanh lý " + d.getCode(),
                        info,
                        d.getUpdatedAt(),
                        "DISPOSAL", d.getId()));
            }
        }

        // --- DepartmentLoan (cho khoa mượn dài hạn) ---
        for (DepartmentLoan dl : departmentLoanRepo.findAll()) {
            String info = "Phiếu " + dl.getCode() + " — " + dl.getEquipmentName()
                    + " (" + dl.getEquipmentCode() + ") — Khoa: " + dl.getDepartmentName();

            all.add(new ActivityLogResponse(
                    "DEPT_LOAN_CREATED",
                    "Đã tạo phiếu mượn khoa " + dl.getCode(),
                    info,
                    dl.getCreatedAt(),
                    "DEPT_LOAN", dl.getId()));

            if (dl.getStatus() == DepartmentLoanStatus.RETURNED && dl.getActualReturnDate() != null) {
                all.add(new ActivityLogResponse(
                        "DEPT_LOAN_RETURNED",
                        "Đã ghi nhận trả phiếu mượn khoa " + dl.getCode(),
                        info,
                        toDateTime(dl.getActualReturnDate(), dl.getUpdatedAt()),
                        "DEPT_LOAN", dl.getId()));
            }
            if (dl.getStatus() == DepartmentLoanStatus.CANCELLED) {
                all.add(new ActivityLogResponse(
                        "DEPT_LOAN_CANCELLED",
                        "Đã hủy phiếu mượn khoa " + dl.getCode(),
                        info,
                        dl.getUpdatedAt(),
                        "DEPT_LOAN", dl.getId()));
            }
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
