package com.datn.backend.service;

import java.util.List;

import com.datn.backend.dto.ActivityLogResponse;
import com.datn.backend.dto.BorrowTrendPointResponse;
import com.datn.backend.dto.BuildingStatsResponse;
import com.datn.backend.dto.DashboardStatsResponse;
import com.datn.backend.dto.PurposeStatsResponse;

public interface DashboardService {

    // 5 con số chính + 3 con số phụ trợ subtext
    DashboardStatsResponse getStats();

    // Xu hướng lượt mượn — mode = "day" (30 ngày) | "week" (12 tuần) | "month" (12 tháng)
    List<BorrowTrendPointResponse> getBorrowTrend(String mode);

    // Donut chart — phân bố đơn mượn theo mục đích trong N tháng gần nhất.
    // Trả về đủ 6 enum value (fill 0 nếu DB chưa có).
    List<PurposeStatsResponse> getBorrowByPurpose(int months);

    // Bar chart — phân bố thiết bị theo khu, loại trừ DISPOSED. Trả về đủ 15 khu.
    List<BuildingStatsResponse> getEquipmentByBuilding();

    // Bảng hoạt động gần đây — wrap ActivityLogService với limit nhỏ
    List<ActivityLogResponse> getRecentActivities(int limit);
}
