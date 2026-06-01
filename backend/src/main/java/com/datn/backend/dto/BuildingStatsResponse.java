package com.datn.backend.dto;

// 1 thanh bar chart "Phân bố thiết bị theo khu/tòa"
public class BuildingStatsResponse {

    private Long buildingId;
    private String name;
    private long count;

    public BuildingStatsResponse() {}

    public BuildingStatsResponse(Long buildingId, String name, long count) {
        this.buildingId = buildingId;
        this.name = name;
        this.count = count;
    }

    public Long getBuildingId() { return buildingId; }
    public void setBuildingId(Long buildingId) { this.buildingId = buildingId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public long getCount() { return count; }
    public void setCount(long count) { this.count = count; }
}
