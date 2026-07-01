package com.datn.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.datn.backend.entity.DisposalRequest;
import com.datn.backend.enums.DisposalStatus;

public interface DisposalRequestRepository extends JpaRepository<DisposalRequest, Long> {

    List<DisposalRequest> findAllByOrderByCreatedAtDesc();

    List<DisposalRequest> findByStatusOrderByCreatedAtDesc(DisposalStatus status);

    // Chặn 2 đề nghị thanh lý đang xử lý trên cùng 1 thiết bị + chặn mượn khi đang chờ thanh lý
    boolean existsByEquipmentIdAndStatusIn(Long equipmentId, List<DisposalStatus> statuses);

    @Query("SELECT MAX(d.code) FROM DisposalRequest d WHERE d.code LIKE CONCAT('TL-', :year, '-%')")
    Optional<String> findMaxCodeByYear(String year);
}
