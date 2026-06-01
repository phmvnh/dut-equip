package com.datn.backend.dto;

import java.util.List;

import com.datn.backend.enums.DamageSeverity;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class ReportDamageRequest {

    @NotNull(message = "Vui lòng chọn mức độ hỏng")
    private DamageSeverity severity;

    @NotBlank(message = "Vui lòng mô tả tình trạng thiết bị")
    @Size(min = 10, max = 2000, message = "Mô tả lỗi phải từ 10 đến 2000 ký tự")
    private String description;

    @Size(max = 3, message = "Tối đa 3 ảnh minh chứng")
    private List<String> imageUrls;

    public DamageSeverity getSeverity() { return severity; }
    public void setSeverity(DamageSeverity severity) { this.severity = severity; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public List<String> getImageUrls() { return imageUrls; }
    public void setImageUrls(List<String> imageUrls) { this.imageUrls = imageUrls; }
}
