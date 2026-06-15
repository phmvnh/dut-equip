package com.datn.backend.service;

import java.util.List;

import com.datn.backend.dto.CompensationCreateRequest;
import com.datn.backend.dto.CompensationResponse;
import com.datn.backend.dto.ComplaintRequest;
import com.datn.backend.dto.ComplaintResolveRequest;
import com.datn.backend.dto.PaymentProofRequest;

public interface CompensationService {

    CompensationResponse create(CompensationCreateRequest request);

    List<CompensationResponse> getAll(String status, Long userId);

    CompensationResponse getById(Long id);

    List<CompensationResponse> getMy(Long userId);

    CompensationResponse confirmPaid(Long id);

    CompensationResponse cancel(Long id);

    // Giảng viên nộp minh chứng đã bồi thường (ảnh hóa đơn) — chỉ chủ phiếu
    CompensationResponse submitPaymentProof(Long id, PaymentProofRequest request, Long userId);

    // Khiếu nại — chỉ chủ phiếu mới được gửi
    CompensationResponse submitComplaint(Long id, ComplaintRequest request, Long userId);

    // Admin resolve khiếu nại
    CompensationResponse resolveComplaint(Long id, ComplaintResolveRequest request);
}
