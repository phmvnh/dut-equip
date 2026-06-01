package com.datn.backend.controller;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.datn.backend.dto.ActivityLogResponse;
import com.datn.backend.service.ActivityLogService;

@RestController
@RequestMapping("/api/v1/admin/activity-logs")
@PreAuthorize("hasRole('ADMIN')")
public class ActivityLogController {

    private final ActivityLogService service;

    public ActivityLogController(ActivityLogService service) {
        this.service = service;
    }

    // GET /api/v1/admin/activity-logs?period=LAST_7_DAYS&keyword=...&page=0&size=30
    @GetMapping
    public ResponseEntity<Page<ActivityLogResponse>> list(
            @RequestParam(required = false, defaultValue = "LAST_7_DAYS") String period,
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 30, sort = "timestamp", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(service.getActivities(periodToFrom(period), keyword, pageable));
    }

    private LocalDateTime periodToFrom(String period) {
        LocalDate today = LocalDate.now();
        return switch (period == null ? "LAST_7_DAYS" : period.toUpperCase()) {
            case "TODAY"        -> today.atStartOfDay();
            case "LAST_30_DAYS" -> today.minusDays(30).atStartOfDay();
            case "ALL"          -> LocalDateTime.of(1970, 1, 1, 0, 0);
            default              -> today.minusDays(7).atStartOfDay();   // LAST_7_DAYS
        };
    }

    @SuppressWarnings("unused")
    private LocalDateTime endOfDay(LocalDate d) {
        return d.atTime(LocalTime.MAX);
    }
}
