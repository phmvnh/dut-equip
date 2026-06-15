package com.datn.backend.controller;

import java.net.URI;
import java.util.List;

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

import com.datn.backend.dto.ApiResponse;
import com.datn.backend.dto.CompensationCreateRequest;
import com.datn.backend.dto.CompensationResponse;
import com.datn.backend.dto.ComplaintRequest;
import com.datn.backend.dto.ComplaintResolveRequest;
import com.datn.backend.dto.PaymentProofRequest;
import com.datn.backend.entity.User;
import com.datn.backend.exception.ResourceNotFoundException;
import com.datn.backend.repository.UserRepository;
import com.datn.backend.service.CompensationService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/compensations")
public class CompensationController {

    private final CompensationService compensationService;
    private final UserRepository userRepository;

    public CompensationController(CompensationService compensationService, UserRepository userRepository) {
        this.compensationService = compensationService;
        this.userRepository      = userRepository;
    }

    // GET /api/v1/compensations?status=&userId= — ADMIN
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<CompensationResponse>> getAll(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long userId) {
        return ResponseEntity.ok(compensationService.getAll(status, userId));
    }

    // GET /api/v1/compensations/my — USER + ADMIN xem phiếu của chính mình
    @GetMapping("/my")
    public ResponseEntity<List<CompensationResponse>> getMy() {
        return ResponseEntity.ok(compensationService.getMy(currentUserId()));
    }

    // GET /api/v1/compensations/{id} — ADMIN
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CompensationResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(compensationService.getById(id));
    }

    // POST /api/v1/compensations — ADMIN tạo phiếu
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CompensationResponse> create(@RequestBody @Valid CompensationCreateRequest request) {
        CompensationResponse created = compensationService.create(request);
        return ResponseEntity
                .created(URI.create("/api/v1/compensations/" + created.getId()))
                .body(created);
    }

    // PUT /api/v1/compensations/{id}/confirm-paid — ADMIN xác nhận đã nhận tiền
    @PutMapping("/{id}/confirm-paid")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<CompensationResponse>> confirmPaid(@PathVariable Long id) {
        CompensationResponse updated = compensationService.confirmPaid(id);
        return ResponseEntity.ok(ApiResponse.ok("Đã xác nhận bồi thường", updated));
    }

    // PUT /api/v1/compensations/{id}/cancel — ADMIN hủy phiếu
    @PutMapping("/{id}/cancel")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<CompensationResponse>> cancel(@PathVariable Long id) {
        CompensationResponse updated = compensationService.cancel(id);
        return ResponseEntity.ok(ApiResponse.ok("Đã hủy phiếu bồi thường", updated));
    }

    // POST /api/v1/compensations/{id}/payment-proof — USER (chủ phiếu) nộp minh chứng đã bồi thường
    @PostMapping("/{id}/payment-proof")
    public ResponseEntity<ApiResponse<CompensationResponse>> submitPaymentProof(
            @PathVariable Long id,
            @RequestBody @Valid PaymentProofRequest request) {
        CompensationResponse updated = compensationService.submitPaymentProof(id, request, currentUserId());
        return ResponseEntity.ok(ApiResponse.ok("Đã nộp minh chứng, chờ quản trị viên xác nhận", updated));
    }

    // POST /api/v1/compensations/{id}/complaint — USER (chủ phiếu) khiếu nại
    @PostMapping("/{id}/complaint")
    public ResponseEntity<ApiResponse<CompensationResponse>> submitComplaint(
            @PathVariable Long id,
            @RequestBody @Valid ComplaintRequest request) {
        CompensationResponse updated = compensationService.submitComplaint(id, request, currentUserId());
        return ResponseEntity.ok(ApiResponse.ok("Đã gửi khiếu nại đến quản trị viên", updated));
    }

    // PUT /api/v1/compensations/{id}/complaint/resolve — ADMIN xử lý khiếu nại
    @PutMapping("/{id}/complaint/resolve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<CompensationResponse>> resolveComplaint(
            @PathVariable Long id,
            @RequestBody @Valid ComplaintResolveRequest request) {
        CompensationResponse updated = compensationService.resolveComplaint(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Đã xử lý khiếu nại", updated));
    }

    private Long currentUserId() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));
        return user.getId();
    }
}
