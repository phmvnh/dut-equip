package com.datn.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.datn.backend.entity.ProcurementRequest;
import com.datn.backend.enums.ProcurementStatus;

public interface ProcurementRequestRepository extends JpaRepository<ProcurementRequest, Long> {

    List<ProcurementRequest> findAllByOrderByCreatedAtDesc();

    List<ProcurementRequest> findByStatusOrderByCreatedAtDesc(ProcurementStatus status);

    @Query("SELECT MAX(r.code) FROM ProcurementRequest r WHERE r.code LIKE CONCAT('MS-', :year, '-%')")
    Optional<String> findMaxCodeByYear(String year);
}
