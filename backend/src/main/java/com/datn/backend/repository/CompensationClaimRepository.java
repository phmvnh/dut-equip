package com.datn.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.datn.backend.entity.CompensationClaim;
import com.datn.backend.enums.CompensationStatus;

public interface CompensationClaimRepository extends JpaRepository<CompensationClaim, Long> {

    List<CompensationClaim> findAllByOrderByCreatedAtDesc();

    List<CompensationClaim> findByStatusOrderByCreatedAtDesc(CompensationStatus status);

    List<CompensationClaim> findByUserIdOrderByCreatedAtDesc(Long userId);

    // Check uniqueness khi sinh mã ngẫu nhiên
    boolean existsByCode(String code);

    // Đảm bảo mỗi đơn mượn chỉ có 1 phiếu bồi thường
    boolean existsByBorrowId(Long borrowId);

    // Chặn xóa thiết bị có lịch sử bồi thường
    boolean existsByEquipmentId(Long equipmentId);
}
