package com.datn.backend.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.datn.backend.dto.AiPredictionResponse;
import com.datn.backend.service.AiPredictionService;

// Endpoint cho Dashboard Admin — gợi ý bảo trì do AI sinh.
// Đặt dưới /api/v1/admin/ai để khớp rule @PreAuthorize hasRole('ADMIN') của SecurityConfig.
@RestController
@RequestMapping("/api/v1/admin/ai")
@PreAuthorize("hasRole('ADMIN')")
public class AIPredictionController {

    private final AiPredictionService service;

    public AIPredictionController(AiPredictionService service) {
        this.service = service;
    }

    // GET /api/v1/admin/ai/predictions?risk=HIGH&limit=20
    @GetMapping("/predictions")
    public ResponseEntity<List<AiPredictionResponse>> list(
            @RequestParam(required = false) String risk,
            @RequestParam(required = false, defaultValue = "20") int limit) {
        return ResponseEntity.ok(service.list(risk, limit));
    }

    // POST /api/v1/admin/ai/run — bấm "Phân tích ngay" trên Dashboard
    @PostMapping("/run")
    public ResponseEntity<Map<String, String>> runNow() {
        return ResponseEntity.ok(service.triggerRun());
    }

    // GET /api/v1/admin/ai/jobs/latest — kiểm tra job AI gần nhất
    @GetMapping("/jobs/latest")
    public ResponseEntity<Map<String, Object>> latestJob() {
        return ResponseEntity.ok(service.latestJob());
    }
}
