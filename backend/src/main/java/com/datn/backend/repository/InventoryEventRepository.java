package com.datn.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.datn.backend.entity.InventoryEvent;

public interface InventoryEventRepository extends JpaRepository<InventoryEvent, Long> {

    List<InventoryEvent> findAllByOrderByCreatedAtDesc();

    @Query("SELECT MAX(e.code) FROM InventoryEvent e WHERE e.code LIKE CONCAT('KK-', :year, '-%')")
    Optional<String> findMaxCodeByYear(String year);
}
