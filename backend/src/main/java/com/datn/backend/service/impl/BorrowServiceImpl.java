package com.datn.backend.service.impl;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.datn.backend.dto.BorrowResponse;
import com.datn.backend.dto.CreateBorrowRequest;
import com.datn.backend.dto.EquipmentScheduleResponse;
import com.datn.backend.dto.ReportDamageRequest;
import com.datn.backend.entity.BorrowRequest;
import com.datn.backend.entity.Building;
import com.datn.backend.entity.Equipment;
import com.datn.backend.entity.User;
import com.datn.backend.enums.BorrowStatus;
import com.datn.backend.enums.DamageSeverity;
import com.datn.backend.enums.DisposalStatus;
import com.datn.backend.enums.EquipmentStatus;
import com.datn.backend.enums.NotificationType;
import com.datn.backend.enums.PurposeType;
import com.datn.backend.exception.BadRequestException;
import com.datn.backend.exception.ResourceNotFoundException;
import com.datn.backend.repository.BorrowRequestRepository;
import com.datn.backend.repository.BuildingRepository;
import com.datn.backend.repository.DisposalRequestRepository;
import com.datn.backend.repository.EquipmentRepository;
import com.datn.backend.repository.UserRepository;
import com.datn.backend.service.BorrowService;
import com.datn.backend.service.NotificationService;
import com.datn.backend.service.SettingService;

@Service
@Transactional
public class BorrowServiceImpl implements BorrowService {

    private static final Logger log = LoggerFactory.getLogger(BorrowServiceImpl.class);

    private static final int MAX_BORROW_DAYS = 7;
    // ID tòa "Phòng thiết bị" — thiết bị luôn trở về đây sau khi trả
    private static final long EQUIPMENT_ROOM_BUILDING_ID = 36L;
    // Khung giờ làm việc tính theo phút trong ngày
    // Mượn: 07:00–16:30 (đảm bảo còn ít nhất 30p sử dụng trước khi đóng cửa)
    // Trả:  07:00–17:00
    private static final int OPEN_MINUTES         = 7 * 60;        // 07:00
    private static final int BORROW_LAST_MINUTES  = 16 * 60 + 30;  // 16:30
    private static final int RETURN_LAST_MINUTES  = 17 * 60;       // 17:00

    private final BorrowRequestRepository borrowRepo;
    private final EquipmentRepository equipmentRepo;
    private final BuildingRepository buildingRepo;
    private final UserRepository userRepo;
    private final DisposalRequestRepository disposalRepo;
    private final NotificationService notificationService;
    private final SettingService settingService;

    public BorrowServiceImpl(BorrowRequestRepository borrowRepo,
                             EquipmentRepository equipmentRepo,
                             BuildingRepository buildingRepo,
                             UserRepository userRepo,
                             DisposalRequestRepository disposalRepo,
                             NotificationService notificationService,
                             SettingService settingService) {
        this.borrowRepo          = borrowRepo;
        this.equipmentRepo       = equipmentRepo;
        this.buildingRepo        = buildingRepo;
        this.userRepo            = userRepo;
        this.disposalRepo        = disposalRepo;
        this.notificationService = notificationService;
        this.settingService      = settingService;
    }

    @Override
    public BorrowResponse create(CreateBorrowRequest request, Long userId) {
        // 1. Thiết bị tồn tại và không ở trạng thái vật lý không khả dụng.
        // AVAILABLE/BORROWED đều cho đi tiếp — khả năng mượn theo khung giờ do overlap quyết định (bước 6b).
        // findByIdForUpdate: khóa dòng equipment (PESSIMISTIC_WRITE) ngay lệnh DB đầu tiên để serialize
        // các request tranh cùng thiết bị → check 6b + save (bước 9) chạy nguyên tử, chặn race condition.
        Equipment equipment = equipmentRepo.findByIdForUpdate(request.getEquipmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thiết bị"));
        EquipmentStatus equipStatus = equipment.getStatus();
        if (equipStatus == EquipmentStatus.MAINTENANCE
                || equipStatus == EquipmentStatus.BROKEN
                || equipStatus == EquipmentStatus.DISPOSED) {
            throw new BadRequestException("Thiết bị không có sẵn để mượn");
        }

        LocalDateTime borrowDT = request.getBorrowDateTime();
        LocalDateTime returnDT = request.getReturnDateTime();

        // 2. borrowDateTime >= thời điểm hiện tại
        if (borrowDT.isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Ngày giờ mượn không được là quá khứ");
        }

        // 3. borrowDateTime trong khung 07:00 - 16:30
        int borrowMin = borrowDT.getHour() * 60 + borrowDT.getMinute();
        if (borrowMin < OPEN_MINUTES || borrowMin > BORROW_LAST_MINUTES) {
            throw new BadRequestException("Giờ mượn phải trong khung 07:00 - 16:30");
        }

        // 4. returnDateTime trong khung 07:00 - 17:00
        int returnMin = returnDT.getHour() * 60 + returnDT.getMinute();
        if (returnMin < OPEN_MINUTES || returnMin > RETURN_LAST_MINUTES) {
            throw new BadRequestException("Giờ trả phải trong khung 07:00 - 17:00");
        }

        // 5. returnDateTime > borrowDateTime
        if (!returnDT.isAfter(borrowDT)) {
            throw new BadRequestException("Ngày giờ trả phải sau ngày giờ mượn");
        }

        // 6. Khoảng cách <= 7 ngày
        if (returnDT.isAfter(borrowDT.plusDays(MAX_BORROW_DAYS))) {
            throw new BadRequestException("Thời gian mượn tối đa 7 ngày");
        }

        // 6a. Thiết bị đang quá hạn chưa trả → vật lý không có sẵn, thời điểm rảnh chưa rõ → chặn
        if (borrowRepo.existsByEquipmentIdAndStatusIn(equipment.getId(), List.of(BorrowStatus.OVERDUE))) {
            throw new BadRequestException("Thiết bị đang quá hạn chưa được trả. Vui lòng chọn thiết bị khác.");
        }

        // 6a-bis. Thiết bị đang có đề nghị thanh lý chờ xử lý (PENDING/APPROVED) → không cho mượn nữa
        if (disposalRepo.existsByEquipmentIdAndStatusIn(equipment.getId(),
                List.of(DisposalStatus.PENDING, DisposalStatus.APPROVED))) {
            throw new BadRequestException("Thiết bị đang trong quy trình thanh lý. Vui lòng chọn thiết bị khác.");
        }

        // 6b. Trùng với đơn đã DUYỆT → chặn cứng (thiết bị đang vật lý ở tay người khác trong khoảng đó)
        boolean approvedOverlap = borrowRepo.existsOverlappingByEquipmentAndStatusIn(
                equipment.getId(), List.of(BorrowStatus.APPROVED), borrowDT, returnDT);
        if (approvedOverlap) {
            throw new BadRequestException("Thiết bị đã được duyệt cho người khác trong khung giờ này.");
        }

        // 6c. Trùng với đơn đang CHỜ DUYỆT → cảnh báo mềm: lần đầu báo để user xác nhận, lần 2 (confirmedOverlap=true) cho qua
        boolean pendingOverlap = borrowRepo.existsOverlappingByEquipmentAndStatusIn(
                equipment.getId(), List.of(BorrowStatus.PENDING), borrowDT, returnDT);
        if (pendingOverlap && !request.isConfirmedOverlap()) {
            throw new BadRequestException(
                    "TRÙNG GIỜ: Khung giờ này đã có người khác đặt mượn nhưng chưa được duyệt. " +
                    "Bạn vẫn có thể gửi đơn — Admin sẽ quyết định ai được mượn. " +
                    "Bạn có chắc chắn muốn gửi yêu cầu này không?");
        }

        // 7. Đếm đơn active (PENDING + APPROVED) < maxConcurrent (đọc động từ Setting do Admin cấu hình)
        int maxAllowed = settingService.get().getMaxConcurrent();
        long activeCount = borrowRepo.countByUserIdAndStatusIn(
                userId, Arrays.asList(BorrowStatus.PENDING, BorrowStatus.APPROVED));
        if (activeCount >= maxAllowed) {
            throw new BadRequestException(
                    "Bạn đang mượn tối đa " + maxAllowed + " thiết bị.\n" +
                    "Vui lòng trả bớt thiết bị hoặc huỷ đơn trước khi tạo đơn mới.");
        }

        // 7b. Cùng 1 user không được có 2 đơn active trên cùng 1 thiết bị
        boolean duplicate = borrowRepo.existsByUserIdAndEquipmentIdAndStatusIn(
                userId, equipment.getId(), Arrays.asList(BorrowStatus.PENDING, BorrowStatus.APPROVED));
        if (duplicate) {
            throw new BadRequestException(
                    "Bạn đã có một đơn mượn đang xử lý cho thiết bị này.\n" +
                    "Vui lòng chờ admin duyệt hoặc huỷ đơn cũ trước khi tạo đơn mới.");
        }

        // 8. purpose = OTHER thì purposeNote không được trống
        if (request.getPurpose() == PurposeType.OTHER
                && (request.getPurposeNote() == null || request.getPurposeNote().isBlank())) {
            throw new BadRequestException("Vui lòng ghi rõ mục đích sử dụng");
        }

        // 9. Tạo đơn mượn
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));
        Building building = buildingRepo.findById(request.getBuildingId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khu sử dụng"));

        BorrowRequest borrow = new BorrowRequest();
        borrow.setUser(user);
        // Snapshot thông tin người mượn — frozen tại thời điểm tạo đơn để giữ tính pháp lý
        borrow.setBorrowerName(user.getFullName());
        borrow.setBorrowerEmail(user.getEmail());
        borrow.setBorrowerPhone(user.getPhone());
        borrow.setEquipment(equipment);
        borrow.setBuilding(building);
        borrow.setRoom(request.getRoom());
        borrow.setBorrowDateTime(borrowDT);
        borrow.setReturnDateTime(returnDT);
        borrow.setPurpose(request.getPurpose());
        borrow.setPurposeNote(request.getPurposeNote());
        borrow.setNote(request.getNote());
        borrow.setStatus(BorrowStatus.PENDING);

        BorrowRequest saved = borrowRepo.save(borrow);
        log.info("User {} tạo đơn mượn thiết bị {}", userId, equipment.getCode());

        // Thông báo realtime cho tất cả Admin về đơn mới
        notificationService.createForAllAdmins(
                NotificationType.NEW_BORROW_REQUEST,
                "Đơn mượn mới #" + saved.getId(),
                user.getFullName() + " vừa tạo đơn mượn thiết bị " + equipment.getName()
        );

        return BorrowResponse.from(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BorrowResponse> getMyBorrows(Long userId) {
        return borrowRepo.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(BorrowResponse::from)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public BorrowResponse getById(Long id) {
        BorrowRequest borrow = borrowRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn mượn"));
        return BorrowResponse.from(borrow);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BorrowResponse> getAll(String status) {
        if (status != null && !status.isBlank()) {
            BorrowStatus borrowStatus = BorrowStatus.valueOf(status.toUpperCase());
            return borrowRepo.findByStatusOrderByCreatedAtDesc(borrowStatus)
                    .stream()
                    .map(BorrowResponse::from)
                    .collect(Collectors.toList());
        }
        return borrowRepo.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(BorrowResponse::from)
                .collect(Collectors.toList());
    }

    @Override
    public BorrowResponse approve(Long id, String preBorrowConditionNote) {
        if (preBorrowConditionNote == null || preBorrowConditionNote.isBlank()) {
            throw new BadRequestException("Vui lòng nhập tình trạng thiết bị khi bàn giao");
        }
        BorrowRequest borrow = borrowRepo.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn mượn"));
        if (borrow.getStatus() != BorrowStatus.PENDING) {
            throw new BadRequestException("Đơn mượn không ở trạng thái chờ duyệt");
        }
        // Đã quá giờ bắt đầu mượn → duyệt cũng vô nghĩa (lỡ tiết dạy, sẽ thành OVERDUE ngay). Chặn.
        if (borrow.getBorrowDateTime().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Đơn đã quá giờ bắt đầu mượn, không thể duyệt.");
        }
        borrow.setStatus(BorrowStatus.APPROVED);
        borrow.setPreBorrowConditionNote(preBorrowConditionNote.trim());
        borrow.getEquipment().setStatus(EquipmentStatus.BORROWED);
        log.info("Duyệt đơn mượn {}", id);

        notificationService.create(
                borrow.getUser().getId(),
                NotificationType.BORROW_APPROVED,
                "Đơn mượn #" + id + " đã được duyệt",
                "Thiết bị " + borrow.getEquipment().getName() + " đã sẵn sàng để bạn nhận."
        );

        // Auto-reject các đơn PENDING khác của cùng thiết bị có thời gian mượn chồng lấp
        // → tránh đơn "kẹt" vĩnh viễn vì equipment đã BORROWED, admin không duyệt được nữa
        String autoReason = "Thiết bị đã được duyệt cho người khác trong khoảng thời gian này";
        List<BorrowRequest> overlapping = borrowRepo.findOverlappingByEquipmentAndStatus(
                borrow.getEquipment().getId(),
                BorrowStatus.PENDING,
                borrow.getId(),
                borrow.getBorrowDateTime(),
                borrow.getReturnDateTime());
        for (BorrowRequest other : overlapping) {
            other.setStatus(BorrowStatus.REJECTED);
            other.setRejectReason(autoReason);
            notificationService.create(
                    other.getUser().getId(),
                    NotificationType.BORROW_REJECTED,
                    "Đơn mượn #" + other.getId() + " bị từ chối",
                    "Lý do: " + autoReason);
            log.info("Auto-reject đơn mượn {} do trùng khoảng thời gian với đơn {} đã duyệt",
                    other.getId(), id);
        }

        return BorrowResponse.from(borrow);
    }

    @Override
    public BorrowResponse reject(Long id, String reason) {
        BorrowRequest borrow = borrowRepo.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn mượn"));
        if (borrow.getStatus() != BorrowStatus.PENDING) {
            throw new BadRequestException("Đơn mượn không ở trạng thái chờ duyệt");
        }
        borrow.setStatus(BorrowStatus.REJECTED);
        borrow.setRejectReason(reason);
        log.info("Từ chối đơn mượn {}", id);

        notificationService.create(
                borrow.getUser().getId(),
                NotificationType.BORROW_REJECTED,
                "Đơn mượn #" + id + " bị từ chối",
                "Lý do: " + (reason == null || reason.isBlank() ? "Không có" : reason)
        );

        return BorrowResponse.from(borrow);
    }

    @Override
    public BorrowResponse confirmReturn(Long id, EquipmentStatus newEquipStatus) {
        BorrowRequest borrow = borrowRepo.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn mượn"));
        if (borrow.getStatus() != BorrowStatus.APPROVED && borrow.getStatus() != BorrowStatus.OVERDUE) {
            throw new BadRequestException("Đơn mượn chưa được duyệt hoặc đã trả");
        }

        // Admin luôn có quyền chọn trạng thái thiết bị sau khi trả (kể cả đơn không báo hỏng,
        // vì có thể nhận lại mới phát hiện hỏng). Null → default AVAILABLE.
        EquipmentStatus finalStatus;
        if (newEquipStatus == null) {
            finalStatus = EquipmentStatus.AVAILABLE;
        } else if (newEquipStatus == EquipmentStatus.AVAILABLE
                || newEquipStatus == EquipmentStatus.MAINTENANCE
                || newEquipStatus == EquipmentStatus.BROKEN) {
            finalStatus = newEquipStatus;
        } else {
            throw new BadRequestException("Trạng thái thiết bị sau khi trả không hợp lệ");
        }

        borrow.setStatus(BorrowStatus.RETURNED);
        borrow.setActualReturnDateTime(LocalDateTime.now());
        borrow.getEquipment().setStatus(finalStatus);
        borrow.getEquipment().setBuilding(buildingRepo.getReferenceById(EQUIPMENT_ROOM_BUILDING_ID));
        log.info("Xác nhận trả thiết bị đơn mượn {} — equipment.status = {}, về phòng thiết bị (building_id={})",
                id, finalStatus, EQUIPMENT_ROOM_BUILDING_ID);

        notificationService.create(
                borrow.getUser().getId(),
                NotificationType.RETURN_CONFIRMED,
                "Đã xác nhận trả thiết bị #" + id,
                "Admin đã xác nhận bạn trả thiết bị " + borrow.getEquipment().getName()
        );

        return BorrowResponse.from(borrow);
    }

    @Override
    public BorrowResponse reportDamage(Long id, ReportDamageRequest request, Long userId) {
        BorrowRequest borrow = borrowRepo.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn mượn"));

        // Chỉ chủ đơn mới được báo hỏng
        if (!borrow.getUser().getId().equals(userId)) {
            throw new BadRequestException("Bạn không có quyền báo hỏng đơn mượn này");
        }
        // Chỉ báo được khi đang giữ thiết bị
        if (borrow.getStatus() != BorrowStatus.APPROVED && borrow.getStatus() != BorrowStatus.OVERDUE) {
            throw new BadRequestException("Chỉ có thể báo hỏng đơn đang mượn");
        }
        // Không cho báo lại lần 2
        if (borrow.isDamageReported()) {
            throw new BadRequestException("Đơn này đã được báo hỏng");
        }

        borrow.setDamageReported(true);
        borrow.setDamageSeverity(request.getSeverity());
        borrow.setDamageDescription(request.getDescription());
        borrow.setDamageImageUrls(request.getImageUrls());
        borrow.setDamageReportedAt(LocalDateTime.now());

        log.info("User {} báo hỏng đơn mượn {} (severity {})", userId, id, request.getSeverity());

        String severityLabel = severityLabel(request.getSeverity());
        notificationService.createForAllAdmins(
                NotificationType.EQUIPMENT_BROKEN,
                "Báo hỏng thiết bị: " + borrow.getEquipment().getName(),
                borrow.getBorrowerName() + " báo hỏng thiết bị "
                        + borrow.getEquipment().getName()
                        + " (" + borrow.getEquipment().getCode() + ") — mức độ " + severityLabel
        );

        return BorrowResponse.from(borrow);
    }

    private String severityLabel(DamageSeverity s) {
        if (s == null) return "không rõ";
        return switch (s) {
            case LIGHT -> "nhẹ";
            case MEDIUM -> "trung bình";
            case SEVERE -> "nặng";
        };
    }

    @Override
    public BorrowResponse cancel(Long id, Long userId) {
        BorrowRequest borrow = borrowRepo.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn mượn"));
        // Chỉ chủ đơn mới được hủy
        if (!borrow.getUser().getId().equals(userId)) {
            throw new BadRequestException("Bạn không có quyền hủy đơn mượn này");
        }
        // Chỉ hủy được khi còn PENDING — APPROVED đã chiếm thiết bị, cần Admin xử lý
        if (borrow.getStatus() != BorrowStatus.PENDING) {
            throw new BadRequestException("Chỉ có thể hủy đơn đang chờ duyệt");
        }
        borrow.setStatus(BorrowStatus.CANCELLED);
        // Không đụng equipment.status — vẫn AVAILABLE vì đơn chưa được duyệt
        log.info("User {} hủy đơn mượn {}", userId, id);
        return BorrowResponse.from(borrow);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<BorrowResponse> getActiveBorrowByEquipment(Long equipmentId) {
        return borrowRepo
                .findFirstByEquipmentIdAndStatusInOrderByBorrowDateTimeDesc(
                        equipmentId,
                        Arrays.asList(BorrowStatus.APPROVED, BorrowStatus.OVERDUE))
                .map(BorrowResponse::from);
    }

    @Override
    @Transactional(readOnly = true)
    public List<EquipmentScheduleResponse> getScheduleByEquipment(Long equipmentId) {
        return borrowRepo
                .findByEquipmentIdAndStatusInOrderByBorrowDateTimeAsc(
                        equipmentId,
                        Arrays.asList(BorrowStatus.PENDING, BorrowStatus.APPROVED, BorrowStatus.OVERDUE))
                .stream()
                .map(EquipmentScheduleResponse::from)
                .collect(Collectors.toList());
    }
}
