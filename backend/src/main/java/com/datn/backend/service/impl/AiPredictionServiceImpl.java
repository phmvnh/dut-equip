package com.datn.backend.service.impl;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.datn.backend.dto.AiPredictionResponse;
import com.datn.backend.entity.AiPrediction;
import com.datn.backend.entity.Equipment;
import com.datn.backend.entity.MaintenanceLog;
import com.datn.backend.enums.MaintenanceStatus;
import com.datn.backend.repository.AiPredictionRepository;
import com.datn.backend.repository.MaintenanceLogRepository;
import com.datn.backend.service.AiPredictionService;

@Service
public class AiPredictionServiceImpl implements AiPredictionService {

    private static final Logger log = LoggerFactory.getLogger(AiPredictionServiceImpl.class);

    private final AiPredictionRepository predRepo;
    private final MaintenanceLogRepository maintRepo;
    private final RestClient aiClient;

    public AiPredictionServiceImpl(
            AiPredictionRepository predRepo,
            MaintenanceLogRepository maintRepo,
            @Value("${ai.service.url:http://localhost:8000}") String aiServiceUrl) {
        this.predRepo = predRepo;
        this.maintRepo = maintRepo;
        this.aiClient = RestClient.builder().baseUrl(aiServiceUrl).build();
    }

    @Override
    public List<AiPredictionResponse> list(String risk, int limit) {
        String riskParam = (risk == null || risk.isBlank()) ? null : risk.toUpperCase();
        List<AiPrediction> rows = predRepo.findFiltered(riskParam, PageRequest.of(0, Math.max(1, Math.min(limit, 200))));
        return rows.stream().map(this::toResponse).toList();
    }

    @Override
    public Map<String, String> triggerRun() {
        try {
            Map<String, Object> body = aiClient.post()
                    .uri("/run")
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (req, res) -> {
                        throw new RestClientException("AI service trả " + res.getStatusCode());
                    })
                    .body(new ParameterizedTypeReference<Map<String, Object>>() {});
            Map<String, String> result = new HashMap<>();
            Object status = body == null ? null : body.get("status");
            Object message = body == null ? null : body.get("message");
            result.put("status", status == null ? "unknown" : String.valueOf(status));
            result.put("message", message == null ? "" : String.valueOf(message));
            return result;
        } catch (RestClientException e) {
            log.error("Không gọi được AI service: {}", e.getMessage());
            Map<String, String> err = new HashMap<>();
            err.put("status", "error");
            err.put("message", "Không kết nối được AI service: " + e.getMessage());
            return err;
        }
    }

    private AiPredictionResponse toResponse(AiPrediction p) {
        AiPredictionResponse r = new AiPredictionResponse();
        Equipment eq = p.getEquipment();
        r.setEquipmentId(p.getEquipmentId());
        if (eq != null) {
            r.setEquipmentCode(eq.getCode());
            r.setEquipmentName(eq.getName());
            r.setEquipTypeName(eq.getEquipType() != null ? eq.getEquipType().getName() : "—");
            r.setBuildingName(eq.getBuilding() != null ? eq.getBuilding().getName() : "—");
        } else {
            r.setEquipmentCode("?");
            r.setEquipmentName("?");
            r.setEquipTypeName("—");
            r.setBuildingName("—");
        }
        r.setRiskLevel(p.getRiskLevel());
        r.setRiskScore(p.getRiskScore());
        r.setDaysToMaintenance(p.getDaysToMaintenance());
        r.setWillFailIn7d(p.isWillFailIn7d());
        r.setReason(p.getReason());
        r.setGeneratedAt(p.getGeneratedAt());
        r.setLastMaintenanceText(formatLastMaintenance(p.getEquipmentId()));
        return r;
    }

    private String formatLastMaintenance(Long equipmentId) {
        List<MaintenanceLog> logs = maintRepo.findByEquipmentIdOrderByStartDateDesc(equipmentId);
        LocalDate lastEnd = logs.stream()
                .filter(m -> m.getStatus() == MaintenanceStatus.COMPLETED && m.getEndDate() != null)
                .map(MaintenanceLog::getEndDate)
                .findFirst()
                .orElse(null);
        if (lastEnd == null) return "Chưa bảo trì";
        long days = ChronoUnit.DAYS.between(lastEnd, LocalDate.now());
        if (days <= 0) return "Hôm nay";
        if (days == 1) return "Hôm qua";
        if (days < 30) return days + " ngày trước";
        long months = days / 30;
        return "~" + months + " tháng trước";
    }
}
