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

import com.datn.backend.dto.ProcurementApproveRequest;
import com.datn.backend.dto.ProcurementCreateRequest;
import com.datn.backend.dto.ProcurementResponse;
import com.datn.backend.entity.User;
import com.datn.backend.exception.ResourceNotFoundException;
import com.datn.backend.repository.UserRepository;
import com.datn.backend.service.ProcurementService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/procurements")
@PreAuthorize("hasRole('ADMIN')")
public class ProcurementController {

    private final ProcurementService procurementService;
    private final UserRepository userRepository;

    public ProcurementController(ProcurementService procurementService, UserRepository userRepository) {
        this.procurementService = procurementService;
        this.userRepository     = userRepository;
    }

    // GET /api/v1/procurements?status=
    @GetMapping
    public ResponseEntity<List<ProcurementResponse>> getAll(@RequestParam(required = false) String status) {
        return ResponseEntity.ok(procurementService.getAll(status));
    }

    // GET /api/v1/procurements/{id}
    @GetMapping("/{id}")
    public ResponseEntity<ProcurementResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(procurementService.getById(id));
    }

    // POST /api/v1/procurements — lập đề nghị
    @PostMapping
    public ResponseEntity<ProcurementResponse> create(@RequestBody @Valid ProcurementCreateRequest request) {
        ProcurementResponse created = procurementService.create(request, currentUserId());
        return ResponseEntity
                .created(URI.create("/api/v1/procurements/" + created.getId()))
                .body(created);
    }

    // PUT /api/v1/procurements/{id}/approve — ghi nhận phê duyệt (lãnh đạo ký ngoài hệ thống)
    @PutMapping("/{id}/approve")
    public ResponseEntity<ProcurementResponse> approve(@PathVariable Long id,
                                                       @RequestBody @Valid ProcurementApproveRequest request) {
        return ResponseEntity.ok(procurementService.approve(id, request, currentUserId()));
    }

    // PUT /api/v1/procurements/{id}/reject
    @PutMapping("/{id}/reject")
    public ResponseEntity<ProcurementResponse> reject(@PathVariable Long id,
                                                      @RequestBody Map<String, String> body) {
        String reason = body == null ? "" : body.getOrDefault("reason", "");
        return ResponseEntity.ok(procurementService.reject(id, reason));
    }

    // PUT /api/v1/procurements/{id}/cancel
    @PutMapping("/{id}/cancel")
    public ResponseEntity<ProcurementResponse> cancel(@PathVariable Long id) {
        return ResponseEntity.ok(procurementService.cancel(id));
    }

    // PUT /api/v1/procurements/{id}/receive — nghiệm thu (admin tự thêm thiết bị ở tab Thiết bị)
    @PutMapping("/{id}/receive")
    public ResponseEntity<ProcurementResponse> receive(@PathVariable Long id) {
        return ResponseEntity.ok(procurementService.receive(id));
    }

    private Long currentUserId() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));
        return user.getId();
    }
}
