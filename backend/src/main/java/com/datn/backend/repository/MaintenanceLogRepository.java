package com.datn.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.datn.backend.entity.MaintenanceLog;
import com.datn.backend.enums.MaintenanceStatus;

public interface MaintenanceLogRepository extends JpaRepository<MaintenanceLog, Long> {

    List<MaintenanceLog> findByEquipmentIdOrderByStartDateDesc(Long equipmentId);

    List<MaintenanceLog> findAllByOrderByStartDateDescIdDesc();

    List<MaintenanceLog> findByStatusOrderByStartDateDescIdDesc(MaintenanceStatus status);

    // Dùng để đảm bảo mỗi thiết bị chỉ có 1 phiếu IN_PROGRESS tại 1 thời điểm
    boolean existsByEquipmentIdAndStatus(Long equipmentId, MaintenanceStatus status);

    // Chặn xóa thiết bị có lịch sử bảo trì
    boolean existsByEquipmentId(Long equipmentId);

    // Check uniqueness khi sinh mã ngẫu nhiên
    boolean existsByCode(String code);
}
