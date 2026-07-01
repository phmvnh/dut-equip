package com.datn.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.datn.backend.entity.DepartmentLoan;
import com.datn.backend.enums.DepartmentLoanStatus;

public interface DepartmentLoanRepository extends JpaRepository<DepartmentLoan, Long> {

    List<DepartmentLoan> findAllByOrderByCreatedAtDesc();

    List<DepartmentLoan> findAllByStatusOrderByCreatedAtDesc(DepartmentLoanStatus status);

    Optional<DepartmentLoan> findFirstByEquipmentIdAndStatus(Long equipmentId, DepartmentLoanStatus status);

    // Lấy số thứ tự lớn nhất trong năm để auto-gen code DM-YYYY-NNN
    @Query("SELECT MAX(d.code) FROM DepartmentLoan d WHERE d.code LIKE :prefix%")
    Optional<String> findMaxCodeByPrefix(@Param("prefix") String prefix);
}
