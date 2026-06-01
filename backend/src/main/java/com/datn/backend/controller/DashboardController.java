package com.datn.backend.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.datn.backend.dto.ActivityLogResponse;
import com.datn.backend.dto.BorrowTrendPointResponse;
import com.datn.backend.dto.BuildingStatsResponse;
import com.datn.backend.dto.DashboardStatsResponse;
import com.datn.backend.dto.PurposeStatsResponse;
import com.datn.backend.service.DashboardService;

@RestController
@RequestMapping("/api/v1/admin/dashboard")
@PreAuthorize("hasRole('ADMIN')")
public class DashboardController {

    private final DashboardService service;

    public DashboardController(DashboardService service) {
        this.service = service;
    }

    // GET /api/v1/admin/dashboard/stats
    @GetMapping("/stats")
    public ResponseEntity<DashboardStatsResponse> stats() {
        return ResponseEntity.ok(service.getStats());
    }

    // GET /api/v1/admin/dashboard/borrow-trend?mode=day|week|month  (default month)
    @GetMapping("/borrow-trend")
    public ResponseEntity<List<BorrowTrendPointResponse>> borrowTrend(
            @RequestParam(required = false, defaultValue = "month") String mode) {
        return ResponseEntity.ok(service.getBorrowTrend(mode));
    }

    // GET /api/v1/admin/dashboard/borrow-by-purpose?months=12
    @GetMapping("/borrow-by-purpose")
    public ResponseEntity<List<PurposeStatsResponse>> borrowByPurpose(
            @RequestParam(required = false, defaultValue = "12") int months) {
        return ResponseEntity.ok(service.getBorrowByPurpose(months));
    }

    // GET /api/v1/admin/dashboard/equipment-by-building
    @GetMapping("/equipment-by-building")
    public ResponseEntity<List<BuildingStatsResponse>> equipmentByBuilding() {
        return ResponseEntity.ok(service.getEquipmentByBuilding());
    }

    // GET /api/v1/admin/dashboard/recent-activities?limit=10
    @GetMapping("/recent-activities")
    public ResponseEntity<List<ActivityLogResponse>> recentActivities(
            @RequestParam(required = false, defaultValue = "10") int limit) {
        return ResponseEntity.ok(service.getRecentActivities(limit));
    }
}
