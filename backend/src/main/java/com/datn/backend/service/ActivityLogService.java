package com.datn.backend.service;

import java.time.LocalDateTime;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import com.datn.backend.dto.ActivityLogResponse;

public interface ActivityLogService {

    // Lấy feed các thao tác Admin từ thời điểm `from` đến hiện tại.
    // Aggregate từ BorrowRequest / MaintenanceLog / CompensationClaim / Equipment / User
    // rồi sort DESC theo timestamp.
    Page<ActivityLogResponse> getActivities(LocalDateTime from, String keyword, Pageable pageable);
}
