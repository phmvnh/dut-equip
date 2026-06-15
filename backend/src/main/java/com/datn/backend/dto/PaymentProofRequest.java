package com.datn.backend.dto;

import jakarta.validation.constraints.NotBlank;

// Payload giảng viên nộp minh chứng đã bồi thường — POST /api/v1/compensations/{id}/payment-proof
public class PaymentProofRequest {

    @NotBlank(message = "Vui lòng đính kèm ảnh minh chứng đã nộp tiền")
    private String imageUrl;

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
}
