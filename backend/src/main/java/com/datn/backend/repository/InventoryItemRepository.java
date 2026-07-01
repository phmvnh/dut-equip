package com.datn.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import com.datn.backend.entity.InventoryItem;

public interface InventoryItemRepository extends JpaRepository<InventoryItem, Long> {

    @Query("SELECT i FROM InventoryItem i JOIN FETCH i.equipment e JOIN FETCH e.equipType JOIN FETCH e.building WHERE i.event.id = :eventId ORDER BY e.code ASC")
    List<InventoryItem> findByEventIdWithEquipment(Long eventId);
}
