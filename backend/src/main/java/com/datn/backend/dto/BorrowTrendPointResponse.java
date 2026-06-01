package com.datn.backend.dto;

// 1 điểm trên line chart "Lượt mượn theo ngày/tuần/tháng"
public class BorrowTrendPointResponse {

    private String label;  // "22/05" | "18/05" (ngày kết thúc tuần) | "T05/26"
    private long count;

    public BorrowTrendPointResponse() {}

    public BorrowTrendPointResponse(String label, long count) {
        this.label = label;
        this.count = count;
    }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public long getCount() { return count; }
    public void setCount(long count) { this.count = count; }
}
