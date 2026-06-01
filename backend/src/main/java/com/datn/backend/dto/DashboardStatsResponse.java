package com.datn.backend.dto;

// 5 con số chính + 2 phụ trợ cho subtext stat cards
public class DashboardStatsResponse {

    private long total;          // tổng thiết bị (loại trừ DISPOSED)
    private long available;
    private long borrowed;
    private long maintenance;
    private long broken;
    private long newThisMonth;   // thiết bị tạo trong tháng hiện tại
    private long overdueCount;   // đơn mượn đang OVERDUE
    private long nearOverdue;    // đơn APPROVED đến hạn trong 2 ngày tới

    public DashboardStatsResponse() {}

    public DashboardStatsResponse(long total, long available, long borrowed,
                                  long maintenance, long broken,
                                  long newThisMonth, long overdueCount, long nearOverdue) {
        this.total = total;
        this.available = available;
        this.borrowed = borrowed;
        this.maintenance = maintenance;
        this.broken = broken;
        this.newThisMonth = newThisMonth;
        this.overdueCount = overdueCount;
        this.nearOverdue = nearOverdue;
    }

    public long getTotal() { return total; }
    public void setTotal(long total) { this.total = total; }

    public long getAvailable() { return available; }
    public void setAvailable(long available) { this.available = available; }

    public long getBorrowed() { return borrowed; }
    public void setBorrowed(long borrowed) { this.borrowed = borrowed; }

    public long getMaintenance() { return maintenance; }
    public void setMaintenance(long maintenance) { this.maintenance = maintenance; }

    public long getBroken() { return broken; }
    public void setBroken(long broken) { this.broken = broken; }

    public long getNewThisMonth() { return newThisMonth; }
    public void setNewThisMonth(long newThisMonth) { this.newThisMonth = newThisMonth; }

    public long getOverdueCount() { return overdueCount; }
    public void setOverdueCount(long overdueCount) { this.overdueCount = overdueCount; }

    public long getNearOverdue() { return nearOverdue; }
    public void setNearOverdue(long nearOverdue) { this.nearOverdue = nearOverdue; }
}
