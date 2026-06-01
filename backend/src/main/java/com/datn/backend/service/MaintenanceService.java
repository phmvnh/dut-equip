package com.datn.backend.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import com.datn.backend.dto.MaintenanceRequest;
import com.datn.backend.dto.MaintenanceResponse;
import com.datn.backend.dto.MaintenanceUpdateRequest;

public interface MaintenanceService {

    MaintenanceResponse create(MaintenanceRequest request);

    MaintenanceResponse update(Long id, MaintenanceUpdateRequest request);

    List<MaintenanceResponse> getAll(String status, Long equipmentId, String keyword);

    MaintenanceResponse getById(Long id);

    // newBuildingId optional — null = giữ nguyên khu hiện tại; có giá trị = chuyển sang khu mới
    MaintenanceResponse complete(Long id, BigDecimal cost, LocalDate endDate, Long newBuildingId);

    MaintenanceResponse cancel(Long id, String reason);
}
