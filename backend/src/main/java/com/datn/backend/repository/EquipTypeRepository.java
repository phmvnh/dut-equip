package com.datn.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.datn.backend.entity.EquipType;

public interface EquipTypeRepository extends JpaRepository<EquipType, Long> {
    boolean existsByName(String name);
}
