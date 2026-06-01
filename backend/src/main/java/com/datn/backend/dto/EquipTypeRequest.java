package com.datn.backend.dto;

import jakarta.validation.constraints.NotBlank;

public class EquipTypeRequest {

    @NotBlank(message = "Tên loại thiết bị không được để trống")
    private String name;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}
