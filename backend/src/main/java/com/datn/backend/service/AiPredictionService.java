package com.datn.backend.service;

import java.util.List;
import java.util.Map;

import com.datn.backend.dto.AiPredictionResponse;

public interface AiPredictionService {

    // Lấy danh sách prediction sort theo HIGH > MEDIUM > LOW, riskScore DESC.
    List<AiPredictionResponse> list(String risk, int limit);

    // Gọi sang Python AI service trigger phân tích nền. Trả về status/message.
    Map<String, String> triggerRun();
}
