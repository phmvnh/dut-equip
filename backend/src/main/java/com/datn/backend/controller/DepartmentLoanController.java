package com.datn.backend.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.datn.backend.dto.DepartmentLoanCreateRequest;
import com.datn.backend.dto.DepartmentLoanResponse;
import com.datn.backend.dto.DepartmentLoanReturnRequest;
import com.datn.backend.entity.User;
import com.datn.backend.repository.UserRepository;
import com.datn.backend.service.DepartmentLoanService;

@RestController
@RequestMapping("/api/v1/admin/department-loans")
@PreAuthorize("hasRole('ADMIN')")
public class DepartmentLoanController {

    private final DepartmentLoanService service;
    private final UserRepository userRepo;

    public DepartmentLoanController(DepartmentLoanService service, UserRepository userRepo) {
        this.service  = service;
        this.userRepo = userRepo;
    }

    // GET /api/v1/admin/department-loans?status=ACTIVE
    @GetMapping
    public ResponseEntity<List<DepartmentLoanResponse>> getAll(
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(service.getAll(status));
    }

    // GET /api/v1/admin/department-loans/{id}
    @GetMapping("/{id}")
    public ResponseEntity<DepartmentLoanResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    // POST /api/v1/admin/department-loans
    @PostMapping
    public ResponseEntity<DepartmentLoanResponse> create(
            @Validated @RequestBody DepartmentLoanCreateRequest req,
            @AuthenticationPrincipal UserDetails principal) {
        Long adminId = resolveAdminId(principal);
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req, adminId));
    }

    // PUT /api/v1/admin/department-loans/{id}/return
    @PutMapping("/{id}/return")
    public ResponseEntity<DepartmentLoanResponse> returnLoan(
            @PathVariable Long id,
            @Validated @RequestBody DepartmentLoanReturnRequest req) {
        return ResponseEntity.ok(service.returnLoan(id, req));
    }

    // PUT /api/v1/admin/department-loans/{id}/cancel
    @PutMapping("/{id}/cancel")
    public ResponseEntity<DepartmentLoanResponse> cancel(@PathVariable Long id) {
        return ResponseEntity.ok(service.cancel(id));
    }

    private Long resolveAdminId(UserDetails principal) {
        User user = userRepo.findByEmail(principal.getUsername())
                .orElseThrow(() -> new RuntimeException("Admin not found"));
        return user.getId();
    }
}
