package com.datn.backend.dto;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// Payload giảng viên gửi khiếu nại — POST /api/v1/compensations/{id}/complaint
public class ComplaintRequest {

    @NotBlank(message = "Vui lòng nhập lý do khiếu nại")
    private String reason;

    @Size(max = 3, message = "Tối đa 3 ảnh minh chứng")
    private List<String> imageUrls;

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public List<String> getImageUrls() { return imageUrls; }
    public void setImageUrls(List<String> imageUrls) { this.imageUrls = imageUrls; }
}
