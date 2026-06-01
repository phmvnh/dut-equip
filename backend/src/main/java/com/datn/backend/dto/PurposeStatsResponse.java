package com.datn.backend.dto;

// 1 lát donut "Mục đích sử dụng" — trả enum name, frontend tự map nhãn tiếng Việt + màu
public class PurposeStatsResponse {

    private String purpose;  // TEACHING | PRACTICE | RESEARCH | CONFERENCE | EXTRACURRICULAR | OTHER
    private long count;

    public PurposeStatsResponse() {}

    public PurposeStatsResponse(String purpose, long count) {
        this.purpose = purpose;
        this.count = count;
    }

    public String getPurpose() { return purpose; }
    public void setPurpose(String purpose) { this.purpose = purpose; }

    public long getCount() { return count; }
    public void setCount(long count) { this.count = count; }
}
