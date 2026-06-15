package com.datn.backend.service;

import java.util.List;
import java.util.Optional;

import com.datn.backend.dto.BorrowResponse;
import com.datn.backend.dto.CreateBorrowRequest;
import com.datn.backend.dto.EquipmentScheduleResponse;
import com.datn.backend.dto.ReportDamageRequest;
import com.datn.backend.enums.EquipmentStatus;

public interface BorrowService {

    BorrowResponse create(CreateBorrowRequest request, Long userId);

    List<BorrowResponse> getMyBorrows(Long userId);

    BorrowResponse getById(Long id);

    List<BorrowResponse> getAll(String status);

    // preBorrowConditionNote: tình trạng thiết bị khi bàn giao — bắt buộc, validate trong impl
    BorrowResponse approve(Long id, String preBorrowConditionNote);

    BorrowResponse reject(Long id, String reason);

    // newEquipStatus: chỉ áp dụng khi đơn có damageReported (admin chọn BROKEN/MAINTENANCE/AVAILABLE).
    // Đơn không báo hỏng — luôn ép AVAILABLE bất kể giá trị này.
    BorrowResponse confirmReturn(Long id, EquipmentStatus newEquipStatus);

    BorrowResponse cancel(Long id, Long userId);

    BorrowResponse reportDamage(Long id, ReportDamageRequest request, Long userId);

    // Trả đơn đang giữ thiết bị (APPROVED/OVERDUE) — để admin xem phòng/người mượn hiện tại
    Optional<BorrowResponse> getActiveBorrowByEquipment(Long equipmentId);

    // Các khung giờ đã đặt của 1 thiết bị (PENDING/APPROVED/OVERDUE) — USER xem khi chọn giờ mượn
    List<EquipmentScheduleResponse> getScheduleByEquipment(Long equipmentId);
}
