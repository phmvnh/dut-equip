package com.datn.backend.controller;

import java.math.BigDecimal;
import java.net.URI;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.datn.backend.dto.ApiResponse;
import com.datn.backend.dto.MaintenanceRequest;
import com.datn.backend.dto.MaintenanceResponse;
import com.datn.backend.dto.MaintenanceUpdateRequest;
import com.datn.backend.exception.BadRequestException;
import com.datn.backend.service.MaintenanceService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/maintenance")
@PreAuthorize("hasRole('ADMIN')")
public class MaintenanceController {

    private final MaintenanceService maintenanceService;

    public MaintenanceController(MaintenanceService maintenanceService) {
        this.maintenanceService = maintenanceService;
    }

    // GET /api/v1/maintenance?status=&equipmentId=&keyword=
    @GetMapping
    public ResponseEntity<List<MaintenanceResponse>> getAll(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long equipmentId,
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(maintenanceService.getAll(status, equipmentId, keyword));
    }

    // GET /api/v1/maintenance/{id}
    @GetMapping("/{id}")
    public ResponseEntity<MaintenanceResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(maintenanceService.getById(id));
    }

    // POST /api/v1/maintenance
    @PostMapping
    public ResponseEntity<MaintenanceResponse> create(@RequestBody @Valid MaintenanceRequest request) {
        MaintenanceResponse created = maintenanceService.create(request);
        return ResponseEntity
                .created(URI.create("/api/v1/maintenance/" + created.getId()))
                .body(created);
    }

    // PUT /api/v1/maintenance/{id}
    @PutMapping("/{id}")
    public ResponseEntity<MaintenanceResponse> update(
            @PathVariable Long id,
            @RequestBody @Valid MaintenanceUpdateRequest request) {
        return ResponseEntity.ok(maintenanceService.update(id, request));
    }

    // PUT /api/v1/maintenance/{id}/complete
    // Body: { "cost"?: number, "endDate"?: "YYYY-MM-DD", "buildingId"?: number }
    @PutMapping("/{id}/complete")
    public ResponseEntity<ApiResponse<MaintenanceResponse>> complete(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body) {
        BigDecimal cost = parseCost(body);
        LocalDate endDate = parseDate(body, "endDate");
        Long buildingId = parseLong(body, "buildingId");
        MaintenanceResponse updated = maintenanceService.complete(id, cost, endDate, buildingId);
        return ResponseEntity.ok(ApiResponse.ok("Đã hoàn thành phiếu bảo trì", updated));
    }

    // PUT /api/v1/maintenance/{id}/cancel
    // Body: { "reason"?: string }
    @PutMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<MaintenanceResponse>> cancel(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, Object> body) {
        String reason = body == null ? null : (String) body.get("reason");
        MaintenanceResponse updated = maintenanceService.cancel(id, reason);
        return ResponseEntity.ok(ApiResponse.ok("Đã hủy phiếu bảo trì", updated));
    }

    private BigDecimal parseCost(Map<String, Object> body) {
        if (body == null || body.get("cost") == null) return null;
        Object raw = body.get("cost");
        if (raw instanceof Number n) return new BigDecimal(n.toString());
        if (raw instanceof String s && !s.isBlank()) {
            try {
                return new BigDecimal(s.trim());
            } catch (NumberFormatException ex) {
                throw new BadRequestException("Chi phí không hợp lệ");
            }
        }
        return null;
    }

    private Long parseLong(Map<String, Object> body, String key) {
        if (body == null || body.get(key) == null) return null;
        Object raw = body.get(key);
        if (raw instanceof Number n) return n.longValue();
        if (raw instanceof String s && !s.isBlank()) {
            try {
                return Long.parseLong(s.trim());
            } catch (NumberFormatException ex) {
                throw new BadRequestException(key + " không hợp lệ");
            }
        }
        return null;
    }

    private LocalDate parseDate(Map<String, Object> body, String key) {
        if (body == null || body.get(key) == null) return null;
        Object raw = body.get(key);
        if (raw instanceof String s && !s.isBlank()) {
            try {
                return LocalDate.parse(s.trim());
            } catch (DateTimeParseException ex) {
                throw new BadRequestException("Ngày không hợp lệ (định dạng YYYY-MM-DD)");
            }
        }
        return null;
    }
}
