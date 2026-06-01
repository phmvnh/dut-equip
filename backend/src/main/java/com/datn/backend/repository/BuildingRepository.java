package com.datn.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.datn.backend.entity.Building;

public interface BuildingRepository extends JpaRepository<Building, Long> {
    List<Building> findAllByOrderByIdAsc();
    boolean existsByName(String name);
    boolean existsByNameAndIdNot(String name, Long id);
}
