package com.datn.backend.dto;

import com.datn.backend.entity.Building;
import com.datn.backend.enums.BuildingEnvironmentStability;

public class BuildingResponse {

    private Long id;
    private String name;
    private BuildingEnvironmentStability environmentStability;

    public static BuildingResponse from(Building building) {
        BuildingResponse dto = new BuildingResponse();
        dto.id   = building.getId();
        dto.name = building.getName();
        dto.environmentStability = building.getEnvironmentStability();
        return dto;
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public BuildingEnvironmentStability getEnvironmentStability() { return environmentStability; }
}
