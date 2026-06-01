package com.datn.backend.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.datn.backend.entity.BorrowRequest;
import com.datn.backend.enums.BorrowStatus;

import jakarta.persistence.LockModeType;

public interface BorrowRequestRepository extends JpaRepository<BorrowRequest, Long> {

    // Đếm đơn active của user (validate tối đa 5)
    long countByUserIdAndStatusIn(Long userId, List<BorrowStatus> statuses);

    // SELECT ... FOR UPDATE — dùng trong các state transition (approve/reject/cancel/confirmReturn)
    // để chặn concurrent update trên cùng đơn → race condition admin approve vs user cancel
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM BorrowRequest b WHERE b.id = :id")
    Optional<BorrowRequest> findByIdForUpdate(@Param("id") Long id);

    // Lấy đơn của user, mới nhất trước
    List<BorrowRequest> findByUserIdOrderByCreatedAtDesc(Long userId);

    // Lấy tất cả đơn cho Admin, mới nhất trước
    List<BorrowRequest> findAllByOrderByCreatedAtDesc();

    // Lấy đơn theo status cho Admin
    List<BorrowRequest> findByStatusOrderByCreatedAtDesc(BorrowStatus status);

    // Kiểm tra thiết bị có đang trong đơn active (PENDING/APPROVED) — dùng cho hide/dispose
    boolean existsByEquipmentIdAndStatusIn(Long equipmentId, List<BorrowStatus> statuses);

    // Đơn đang giữ thiết bị (APPROVED/OVERDUE) — chỉ có tối đa 1 vì equipment.status=BORROWED.
    // Dùng cho admin xem trong EquipmentDetailModal để biết thiết bị hiện ở phòng nào.
    Optional<BorrowRequest> findFirstByEquipmentIdAndStatusInOrderByBorrowDateTimeDesc(
            Long equipmentId, List<BorrowStatus> statuses);

    // Chặn xóa thiết bị có bất kỳ lịch sử đơn mượn nào (kể cả CANCELLED/REJECTED)
    boolean existsByEquipmentId(Long equipmentId);

    // Chặn 1 user tạo 2 đơn (PENDING + APPROVED) trên cùng 1 thiết bị
    boolean existsByUserIdAndEquipmentIdAndStatusIn(Long userId, Long equipmentId, List<BorrowStatus> statuses);

    // Tìm các đơn PENDING của cùng equipment có khoảng thời gian mượn chồng lấp với [borrowDT, returnDT]
    // Dùng khi admin duyệt 1 đơn → auto-reject các đơn khác overlap (vì thiết bị đã bị giữ trong khoảng đó)
    // Công thức overlap: a1 < b2 AND b1 < a2
    @Query("SELECT b FROM BorrowRequest b WHERE b.equipment.id = :equipmentId "
            + "AND b.status = :status "
            + "AND b.id <> :excludeId "
            + "AND b.borrowDateTime < :returnDT "
            + "AND b.returnDateTime > :borrowDT")
    List<BorrowRequest> findOverlappingByEquipmentAndStatus(
            @Param("equipmentId") Long equipmentId,
            @Param("status") BorrowStatus status,
            @Param("excludeId") Long excludeId,
            @Param("borrowDT") LocalDateTime borrowDT,
            @Param("returnDT") LocalDateTime returnDT);

    // Đếm lượt sử dụng của 1 thiết bị (dùng cho EquipResponse.getById)
    long countByEquipmentIdAndStatusIn(Long equipmentId, List<BorrowStatus> statuses);

    // Bulk count theo equipment_id cho danh sách — tránh N+1 query khi getAll
    @Query("SELECT b.equipment.id, COUNT(b) FROM BorrowRequest b "
            + "WHERE b.status IN :statuses GROUP BY b.equipment.id")
    List<Object[]> countByStatusInGroupedByEquipment(@Param("statuses") List<BorrowStatus> statuses);

    // Dùng bởi Scheduler — đơn APPROVED quá hạn
    List<BorrowRequest> findByStatusAndReturnDateTimeBefore(BorrowStatus status, LocalDateTime dateTime);

    // Dùng bởi Scheduler — đơn sắp đến hạn trả
    List<BorrowRequest> findByStatusAndReturnDateTimeBetween(BorrowStatus status, LocalDateTime from, LocalDateTime to);

    // Scheduler — đơn APPROVED chưa gửi nhắc 1h, return_date <= now + 1h (đủ để check lead time động)
    @Query("SELECT b FROM BorrowRequest b WHERE b.status = :status "
            + "AND b.hourReminderSentAt IS NULL "
            + "AND b.returnDateTime <= :until "
            + "AND b.returnDateTime > :now")
    List<BorrowRequest> findPendingHourReminders(
            @Param("status") BorrowStatus status,
            @Param("now") LocalDateTime now,
            @Param("until") LocalDateTime until);

    // Scheduler — đơn APPROVED dài (>=1 ngày) chưa gửi nhắc 1 ngày, còn 24h nữa đến hạn
    @Query("SELECT b FROM BorrowRequest b WHERE b.status = :status "
            + "AND b.dayReminderSentAt IS NULL "
            + "AND b.returnDateTime <= :until "
            + "AND b.returnDateTime > :now")
    List<BorrowRequest> findPendingDayReminders(
            @Param("status") BorrowStatus status,
            @Param("now") LocalDateTime now,
            @Param("until") LocalDateTime until);

    // Scheduler — đơn đã OVERDUE, lần nhắc gần nhất cách > 24h (hoặc null) → cần nhắc lại
    @Query("SELECT b FROM BorrowRequest b WHERE b.status = :status "
            + "AND (b.lastOverdueAlertAt IS NULL OR b.lastOverdueAlertAt < :before)")
    List<BorrowRequest> findOverdueNeedingAlert(
            @Param("status") BorrowStatus status,
            @Param("before") LocalDateTime before);

    // === Dashboard aggregations ===

    long countByStatus(BorrowStatus status);

    // Đơn APPROVED sắp đến hạn trong khoảng [now, until]
    long countByStatusAndReturnDateTimeBetween(BorrowStatus status, LocalDateTime from, LocalDateTime to);

    // Mảng createdAt của các đơn từ :from trở đi — service sẽ GROUP BY theo day/week/month trong Java
    @Query("SELECT b.createdAt FROM BorrowRequest b WHERE b.createdAt >= :from")
    List<LocalDateTime> findCreatedAtSince(@Param("from") LocalDateTime from);

    // GROUP BY purpose cho donut chart, chỉ tính đơn có purpose != NULL trong khoảng từ :from
    @Query("SELECT b.purpose, COUNT(b) FROM BorrowRequest b "
            + "WHERE b.createdAt >= :from AND b.purpose IS NOT NULL "
            + "GROUP BY b.purpose")
    List<Object[]> countByPurposeSince(@Param("from") LocalDateTime from);
}
