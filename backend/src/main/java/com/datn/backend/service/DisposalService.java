package com.datn.backend.service;

import java.util.List;

import com.datn.backend.dto.DisposalApproveRequest;
import com.datn.backend.dto.DisposalCompleteRequest;
import com.datn.backend.dto.DisposalCreateRequest;
import com.datn.backend.dto.DisposalResponse;

public interface DisposalService {

    List<DisposalResponse> getAll(String status);

    DisposalResponse getById(Long id);

    // Lập đề nghị thanh lý (status PENDING) — chặn mượn thiết bị từ lúc này
    DisposalResponse create(DisposalCreateRequest request, Long requesterId);

    // Ghi nhận phê duyệt (lãnh đạo ký ngoài hệ thống) → APPROVED
    DisposalResponse approve(Long id, DisposalApproveRequest request, Long approverId);

    DisposalResponse reject(Long id, String reason);

    DisposalResponse cancel(Long id);

    // Thực hiện thanh lý → thiết bị chuyển DISPOSED, status COMPLETED
    DisposalResponse complete(Long id, DisposalCompleteRequest request);
}
