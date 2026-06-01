package com.datn.backend.repository;

import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.datn.backend.entity.AiPrediction;

public interface AiPredictionRepository extends JpaRepository<AiPrediction, Long> {

    // Sắp xếp theo độ ưu tiên: HIGH > MEDIUM > LOW, trong cùng nhóm sort theo riskScore DESC
    @Query("""
            SELECT p FROM AiPrediction p
            WHERE (:risk IS NULL OR p.riskLevel = :risk)
            ORDER BY
              CASE p.riskLevel WHEN 'HIGH' THEN 0 WHEN 'MEDIUM' THEN 1 ELSE 2 END,
              p.riskScore DESC
            """)
    List<AiPrediction> findFiltered(@Param("risk") String risk, Pageable pageable);
}
