package com.datn.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.datn.backend.entity.EquipmentImage;

public interface EquipmentImageRepository extends JpaRepository<EquipmentImage, Long> {
    List<EquipmentImage> findByEquipmentIdOrderBySortOrderAsc(Long equipmentId);
}
