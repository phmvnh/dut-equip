package com.datn.backend.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.datn.backend.entity.Equipment;
import com.datn.backend.enums.EquipmentStatus;

import jakarta.persistence.LockModeType;

public interface EquipmentRepository extends JpaRepository<Equipment, Long> {

    boolean existsByCode(String code);

    boolean existsByCodeAndIdNot(String code, Long id);

    boolean existsByBuildingId(Long buildingId);

    Optional<Equipment> findByCode(String code);

    // SELECT ... FOR UPDATE — khóa dòng equipment khi tạo đơn mượn để serialize các request
    // tranh cùng 1 thiết bị → chặn race condition 2+ user cùng đặt 1 khung giờ (TOCTOU)
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT e FROM Equipment e WHERE e.id = :id")
    Optional<Equipment> findByIdForUpdate(@Param("id") Long id);

    @Query("SELECT e FROM Equipment e " +
           "JOIN FETCH e.equipType " +
           "JOIN FETCH e.building " +
           "WHERE (:equipTypeId IS NULL OR e.equipType.id = :equipTypeId) " +
           "AND (:buildingId IS NULL OR e.building.id = :buildingId) " +
           "AND (:status IS NULL OR e.status = :status) " +
           "AND (:keyword IS NULL OR LOWER(e.name) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
           "     OR LOWER(e.code) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "ORDER BY e.createdAt DESC")
    List<Equipment> search(
        @Param("equipTypeId") Long equipTypeId,
        @Param("buildingId")  Long buildingId,
        @Param("status")      EquipmentStatus status,
        @Param("keyword")     String keyword
    );

    // === Dashboard aggregations ===

    long countByStatus(EquipmentStatus status);

    long countByStatusNot(EquipmentStatus status);

    long countByStatusNotAndCreatedAtGreaterThanEqual(EquipmentStatus excludeStatus, LocalDateTime from);

    // Phân bố thiết bị theo khu (loại trừ DISPOSED).
    // LEFT JOIN từ Building để buildings không có thiết bị vẫn xuất hiện với count = 0.
    @Query("SELECT b.id, b.name, COUNT(e) " +
           "FROM com.datn.backend.entity.Building b " +
           "LEFT JOIN Equipment e ON e.building = b AND e.status <> com.datn.backend.enums.EquipmentStatus.DISPOSED " +
           "GROUP BY b.id, b.name " +
           "ORDER BY COUNT(e) DESC, b.name ASC")
    List<Object[]> countByBuildingExcludingDisposed();
}
