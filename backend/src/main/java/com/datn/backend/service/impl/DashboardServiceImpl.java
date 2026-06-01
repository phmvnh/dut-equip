package com.datn.backend.service.impl;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.temporal.WeekFields;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.datn.backend.dto.ActivityLogResponse;
import com.datn.backend.dto.BorrowTrendPointResponse;
import com.datn.backend.dto.BuildingStatsResponse;
import com.datn.backend.dto.DashboardStatsResponse;
import com.datn.backend.dto.PurposeStatsResponse;
import com.datn.backend.enums.BorrowStatus;
import com.datn.backend.enums.EquipmentStatus;
import com.datn.backend.enums.PurposeType;
import com.datn.backend.repository.BorrowRequestRepository;
import com.datn.backend.repository.EquipmentRepository;
import com.datn.backend.service.ActivityLogService;
import com.datn.backend.service.DashboardService;

@Service
@Transactional(readOnly = true)
public class DashboardServiceImpl implements DashboardService {

    private static final DateTimeFormatter DAY_FMT  = DateTimeFormatter.ofPattern("dd/MM");
    private static final DateTimeFormatter WEEK_FMT = DateTimeFormatter.ofPattern("dd/MM");
    private static final WeekFields ISO_WEEK = WeekFields.ISO;

    private final EquipmentRepository equipmentRepo;
    private final BorrowRequestRepository borrowRepo;
    private final ActivityLogService activityLogService;

    public DashboardServiceImpl(EquipmentRepository equipmentRepo,
                                BorrowRequestRepository borrowRepo,
                                ActivityLogService activityLogService) {
        this.equipmentRepo = equipmentRepo;
        this.borrowRepo = borrowRepo;
        this.activityLogService = activityLogService;
    }

    @Override
    public DashboardStatsResponse getStats() {
        long total       = equipmentRepo.countByStatusNot(EquipmentStatus.DISPOSED);
        long available   = equipmentRepo.countByStatus(EquipmentStatus.AVAILABLE);
        long borrowed    = equipmentRepo.countByStatus(EquipmentStatus.BORROWED);
        long maintenance = equipmentRepo.countByStatus(EquipmentStatus.MAINTENANCE);
        long broken      = equipmentRepo.countByStatus(EquipmentStatus.BROKEN);

        LocalDateTime startOfMonth = YearMonth.now().atDay(1).atStartOfDay();
        long newThisMonth = equipmentRepo.countByStatusNotAndCreatedAtGreaterThanEqual(
                EquipmentStatus.DISPOSED, startOfMonth);

        long overdueCount = borrowRepo.countByStatus(BorrowStatus.OVERDUE);

        LocalDateTime now = LocalDateTime.now();
        long nearOverdue = borrowRepo.countByStatusAndReturnDateTimeBetween(
                BorrowStatus.APPROVED, now, now.plusDays(2));

        return new DashboardStatsResponse(total, available, borrowed, maintenance, broken,
                newThisMonth, overdueCount, nearOverdue);
    }

    @Override
    public List<BorrowTrendPointResponse> getBorrowTrend(String mode) {
        String m = mode == null ? "month" : mode.toLowerCase();
        return switch (m) {
            case "day"   -> buildDayTrend();
            case "week"  -> buildWeekTrend();
            default      -> buildMonthTrend();
        };
    }

    // 30 ngày gần nhất (bao gồm hôm nay), label DD/MM
    private List<BorrowTrendPointResponse> buildDayTrend() {
        LocalDate today = LocalDate.now();
        LocalDate startDate = today.minusDays(29);
        LocalDateTime from = startDate.atStartOfDay();

        Map<LocalDate, Long> grouped = borrowRepo.findCreatedAtSince(from).stream()
                .collect(Collectors.groupingBy(LocalDateTime::toLocalDate, Collectors.counting()));

        List<BorrowTrendPointResponse> out = new ArrayList<>(30);
        for (int i = 29; i >= 0; i--) {
            LocalDate d = today.minusDays(i);
            out.add(new BorrowTrendPointResponse(d.format(DAY_FMT), grouped.getOrDefault(d, 0L)));
        }
        return out;
    }

    // 12 tuần gần nhất — bucket theo tuần ISO, label = ngày Chủ Nhật của tuần
    private List<BorrowTrendPointResponse> buildWeekTrend() {
        LocalDate today = LocalDate.now();
        // Chủ Nhật của tuần hiện tại (ISO: tuần Mon-Sun)
        LocalDate endOfThisWeek = today.with(DayOfWeek.SUNDAY);
        // Lấy data từ thứ Hai của tuần thứ 12 ngược về
        LocalDate firstMonday = endOfThisWeek.minusWeeks(11).minusDays(6);
        LocalDateTime from = firstMonday.atStartOfDay();

        Map<String, Long> grouped = borrowRepo.findCreatedAtSince(from).stream()
                .collect(Collectors.groupingBy(dt -> weekKey(dt.toLocalDate()), Collectors.counting()));

        List<BorrowTrendPointResponse> out = new ArrayList<>(12);
        for (int i = 11; i >= 0; i--) {
            LocalDate sunday = endOfThisWeek.minusWeeks(i);
            String key = weekKey(sunday);
            out.add(new BorrowTrendPointResponse(sunday.format(WEEK_FMT), grouped.getOrDefault(key, 0L)));
        }
        return out;
    }

    private String weekKey(LocalDate date) {
        int weekYear = date.get(ISO_WEEK.weekBasedYear());
        int weekNum  = date.get(ISO_WEEK.weekOfWeekBasedYear());
        return weekYear + "-W" + weekNum;
    }

    // 12 tháng gần nhất, label "TMM/YY"
    private List<BorrowTrendPointResponse> buildMonthTrend() {
        YearMonth current = YearMonth.now();
        LocalDateTime from = current.minusMonths(11).atDay(1).atStartOfDay();

        Map<YearMonth, Long> grouped = borrowRepo.findCreatedAtSince(from).stream()
                .collect(Collectors.groupingBy(YearMonth::from, Collectors.counting()));

        List<BorrowTrendPointResponse> out = new ArrayList<>(12);
        for (int i = 11; i >= 0; i--) {
            YearMonth ym = current.minusMonths(i);
            String label = String.format("T%02d/%02d", ym.getMonthValue(), ym.getYear() % 100);
            out.add(new BorrowTrendPointResponse(label, grouped.getOrDefault(ym, 0L)));
        }
        return out;
    }

    @Override
    public List<PurposeStatsResponse> getBorrowByPurpose(int months) {
        int n = months <= 0 ? 12 : months;
        LocalDateTime from = LocalDate.now().minusMonths(n).atStartOfDay();

        Map<PurposeType, Long> grouped = borrowRepo.countByPurposeSince(from).stream()
                .collect(Collectors.toMap(r -> (PurposeType) r[0], r -> ((Number) r[1]).longValue()));

        // Trả đủ 6 enum value để frontend không phải fill 0
        List<PurposeStatsResponse> out = new ArrayList<>(PurposeType.values().length);
        for (PurposeType p : PurposeType.values()) {
            out.add(new PurposeStatsResponse(p.name(), grouped.getOrDefault(p, 0L)));
        }
        return out;
    }

    @Override
    public List<BuildingStatsResponse> getEquipmentByBuilding() {
        List<Object[]> rows = equipmentRepo.countByBuildingExcludingDisposed();
        return rows.stream()
                .map(r -> new BuildingStatsResponse(
                        ((Number) r[0]).longValue(),
                        (String) r[1],
                        ((Number) r[2]).longValue()))
                .collect(Collectors.toList());
    }

    @Override
    public List<ActivityLogResponse> getRecentActivities(int limit) {
        int n = limit <= 0 ? 10 : Math.min(limit, 50);
        Pageable pageable = PageRequest.of(0, n, Sort.by("timestamp").descending());
        Page<ActivityLogResponse> page = activityLogService.getActivities(
                LocalDateTime.of(1970, 1, 1, 0, 0), null, pageable);
        return page.getContent();
    }
}
