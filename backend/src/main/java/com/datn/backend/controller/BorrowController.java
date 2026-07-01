package com.datn.backend.controller;

import java.net.URI;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.datn.backend.dto.BorrowResponse;
import com.datn.backend.dto.CreateBorrowRequest;
import com.datn.backend.dto.CurrentBorrowerResponse;
import com.datn.backend.dto.EquipmentScheduleResponse;
import com.datn.backend.dto.ReportDamageRequest;
import com.datn.backend.entity.User;
import com.datn.backend.enums.EquipmentStatus;
import com.datn.backend.exception.BadRequestException;
import com.datn.backend.exception.ResourceNotFoundException;
import com.datn.backend.repository.UserRepository;
import com.datn.backend.service.BorrowService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/borrows")
public class BorrowController {

    private final BorrowService borrowService;
    private final UserRepository userRepository;

    public BorrowController(BorrowService borrowService, UserRepository userRepository) {
        this.borrowService  = borrowService;
        this.userRepository = userRepository;
    }

    // POST /api/v1/borrows — USER + ADMIN
    @PostMapping
    public ResponseEntity<BorrowResponse> create(@RequestBody @Valid CreateBorrowRequest request) {
        Long userId = currentUserId();
        BorrowResponse created = borrowService.create(request, userId);
        return ResponseEntity
                .created(URI.create("/api/v1/borrows/" + created.getId()))
                .body(created);
    }

    // GET /api/v1/borrows/my — USER + ADMIN
    @GetMapping("/my")
    public ResponseEntity<List<BorrowResponse>> getMyBorrows() {
        return ResponseEntity.ok(borrowService.getMyBorrows(currentUserId()));
    }

    // GET /api/v1/borrows/{id} — USER + ADMIN
    @GetMapping("/{id}")
    public ResponseEntity<BorrowResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(borrowService.getById(id));
    }

    // GET /api/v1/borrows?status= — ADMIN only
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<BorrowResponse>> getAll(
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(borrowService.getAll(status));
    }

    // PUT /api/v1/borrows/{id}/approve — ADMIN only
    // Body: { "preBorrowConditionNote": "..." } — bắt buộc, tình trạng thiết bị khi bàn giao
    @PutMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BorrowResponse> approve(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String note = body == null ? null : body.get("preBorrowConditionNote");
        return ResponseEntity.ok(borrowService.approve(id, note));
    }

    // PUT /api/v1/borrows/{id}/reject — ADMIN only
    @PutMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BorrowResponse> reject(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String reason = body.getOrDefault("reason", "");
        return ResponseEntity.ok(borrowService.reject(id, reason));
    }

    // PUT /api/v1/borrows/{id}/return — ADMIN only
    // Body: { "equipmentStatus": "AVAILABLE" | "MAINTENANCE" | "BROKEN" } (optional)
    // Chỉ áp dụng khi đơn có cờ damageReported. Đơn thường → bỏ qua, ép AVAILABLE.
    @PutMapping("/{id}/return")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BorrowResponse> confirmReturn(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        EquipmentStatus status = null;
        if (body != null && body.get("equipmentStatus") != null) {
            try {
                status = EquipmentStatus.valueOf(body.get("equipmentStatus"));
            } catch (IllegalArgumentException ex) {
                throw new BadRequestException("Trạng thái thiết bị không hợp lệ");
            }
        }
        return ResponseEntity.ok(borrowService.confirmReturn(id, status));
    }

    // PUT /api/v1/borrows/{id}/cancel — chỉ chủ đơn mới hủy được, chỉ khi PENDING
    @PutMapping("/{id}/cancel")
    public ResponseEntity<BorrowResponse> cancel(@PathVariable Long id) {
        return ResponseEntity.ok(borrowService.cancel(id, currentUserId()));
    }

    // GET /api/v1/borrows/active-by-equipment/{equipmentId} — ADMIN xem đơn đang giữ thiết bị
    // Trả 204 No Content khi thiết bị không có đơn active → FE dễ phân biệt với lỗi
    @GetMapping("/active-by-equipment/{equipmentId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BorrowResponse> getActiveByEquipment(@PathVariable Long equipmentId) {
        return borrowService.getActiveBorrowByEquipment(equipmentId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    // GET /api/v1/borrows/current-borrower/{equipmentId} — mọi user đăng nhập xem ai đang mượn thiết bị
    // Chỉ trả userName + room + returnDateTime — không kèm email/phone (giữ riêng tư)
    @GetMapping("/current-borrower/{equipmentId}")
    public ResponseEntity<CurrentBorrowerResponse> getCurrentBorrower(@PathVariable Long equipmentId) {
        return borrowService.getActiveBorrowByEquipment(equipmentId)
                .map(b -> new CurrentBorrowerResponse(b.getUserName(), b.getUserPhone(), b.getBuildingName(), b.getRoom(), b.getReturnDateTime()))
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    // GET /api/v1/borrows/schedule-by-equipment/{equipmentId} — các khung giờ đã đặt của thiết bị.
    // Cho mọi user đăng nhập xem (chọn giờ trống khi mượn) — chỉ trả giờ + trạng thái, không kèm PII.
    @GetMapping("/schedule-by-equipment/{equipmentId}")
    public ResponseEntity<List<EquipmentScheduleResponse>> getScheduleByEquipment(@PathVariable Long equipmentId) {
        return ResponseEntity.ok(borrowService.getScheduleByEquipment(equipmentId));
    }

    // POST /api/v1/borrows/{id}/report-damage — chủ đơn báo hỏng (1 lần/đơn)
    @PostMapping("/{id}/report-damage")
    public ResponseEntity<BorrowResponse> reportDamage(
            @PathVariable Long id,
            @RequestBody @Valid ReportDamageRequest request) {
        return ResponseEntity.ok(borrowService.reportDamage(id, request, currentUserId()));
    }

    private Long currentUserId() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));
        return user.getId();
    }
}
