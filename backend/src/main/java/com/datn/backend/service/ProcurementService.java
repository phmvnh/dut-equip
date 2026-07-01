package com.datn.backend.service;

import java.util.List;

import com.datn.backend.dto.ProcurementApproveRequest;
import com.datn.backend.dto.ProcurementCreateRequest;
import com.datn.backend.dto.ProcurementResponse;

public interface ProcurementService {

    List<ProcurementResponse> getAll(String status);

    ProcurementResponse getById(Long id);

    // Lập đề nghị mua sắm (status PENDING)
    ProcurementResponse create(ProcurementCreateRequest request, Long requesterId);

    // Ghi nhận phê duyệt (lãnh đạo ký ngoài hệ thống) → APPROVED
    ProcurementResponse approve(Long id, ProcurementApproveRequest request, Long approverId);

    ProcurementResponse reject(Long id, String reason);

    ProcurementResponse cancel(Long id);

    // Nghiệm thu → status COMPLETED (admin tự thêm thiết bị ở tab Thiết bị)
    ProcurementResponse receive(Long id);
}
