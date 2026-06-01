package com.datn.backend.dto;

import com.datn.backend.enums.BuildingEnvironmentStability;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class BuildingRequest {

    @NotBlank(message = "Tên khu/tòa nhà không được để trống")
    @Size(max = 50, message = "Tên khu/tòa nhà tối đa 50 ký tự")
    private String name;

    @NotNull(message = "Vui lòng chọn mức độ ổn định môi trường")
    private BuildingEnvironmentStability environmentStability;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public BuildingEnvironmentStability getEnvironmentStability() { return environmentStability; }
    public void setEnvironmentStability(BuildingEnvironmentStability v) { this.environmentStability = v; }
}
