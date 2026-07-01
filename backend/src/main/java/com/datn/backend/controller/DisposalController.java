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

import com.datn.backend.dto.DisposalApproveRequest;
import com.datn.backend.dto.DisposalCompleteRequest;
import com.datn.backend.dto.DisposalCreateRequest;
import com.datn.backend.dto.DisposalResponse;
import com.datn.backend.entity.User;
import com.datn.backend.exception.ResourceNotFoundException;
import com.datn.backend.repository.UserRepository;
import com.datn.backend.service.DisposalService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/disposals")
@PreAuthorize("hasRole('ADMIN')")
public class DisposalController {

    private final DisposalService disposalService;
    private final UserRepository userRepository;

    public DisposalController(DisposalService disposalService, UserRepository userRepository) {
        this.disposalService = disposalService;
        this.userRepository  = userRepository;
    }

    // GET /api/v1/disposals?status=
    @GetMapping
    public ResponseEntity<List<DisposalResponse>> getAll(@RequestParam(required = false) String status) {
        return ResponseEntity.ok(disposalService.getAll(status));
    }

    // GET /api/v1/disposals/{id}
    @GetMapping("/{id}")
    public ResponseEntity<DisposalResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(disposalService.getById(id));
    }

    // POST /api/v1/disposals — lập đề nghị thanh lý
    @PostMapping
    public ResponseEntity<DisposalResponse> create(@RequestBody @Valid DisposalCreateRequest request) {
        DisposalResponse created = disposalService.create(request, currentUserId());
        return ResponseEntity
                .created(URI.create("/api/v1/disposals/" + created.getId()))
                .body(created);
    }

    // PUT /api/v1/disposals/{id}/approve — ghi nhận phê duyệt (lãnh đạo ký ngoài hệ thống)
    @PutMapping("/{id}/approve")
    public ResponseEntity<DisposalResponse> approve(@PathVariable Long id,
                                                    @RequestBody @Valid DisposalApproveRequest request) {
        return ResponseEntity.ok(disposalService.approve(id, request, currentUserId()));
    }

    // PUT /api/v1/disposals/{id}/reject
    @PutMapping("/{id}/reject")
    public ResponseEntity<DisposalResponse> reject(@PathVariable Long id,
                                                   @RequestBody Map<String, String> body) {
        String reason = body == null ? "" : body.getOrDefault("reason", "");
        return ResponseEntity.ok(disposalService.reject(id, reason));
    }

    // PUT /api/v1/disposals/{id}/cancel
    @PutMapping("/{id}/cancel")
    public ResponseEntity<DisposalResponse> cancel(@PathVariable Long id) {
        return ResponseEntity.ok(disposalService.cancel(id));
    }

    // PUT /api/v1/disposals/{id}/complete — thực hiện thanh lý → thiết bị DISPOSED
    @PutMapping("/{id}/complete")
    public ResponseEntity<DisposalResponse> complete(@PathVariable Long id,
                                                     @RequestBody @Valid DisposalCompleteRequest request) {
        return ResponseEntity.ok(disposalService.complete(id, request));
    }

    private Long currentUserId() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));
        return user.getId();
    }
}
