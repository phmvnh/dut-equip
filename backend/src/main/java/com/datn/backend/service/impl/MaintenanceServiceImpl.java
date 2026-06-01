package com.datn.backend.service.impl;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.datn.backend.dto.MaintenanceRequest;
import com.datn.backend.dto.MaintenanceResponse;
import com.datn.backend.dto.MaintenanceUpdateRequest;
import com.datn.backend.entity.Building;
import com.datn.backend.entity.Equipment;
import com.datn.backend.entity.MaintenanceLog;
import com.datn.backend.enums.EquipmentStatus;
import com.datn.backend.enums.MaintenanceStatus;
import com.datn.backend.exception.BadRequestException;
import com.datn.backend.exception.ResourceNotFoundException;
import com.datn.backend.repository.BuildingRepository;
import com.datn.backend.repository.EquipmentRepository;
import com.datn.backend.repository.MaintenanceLogRepository;
import com.datn.backend.service.MaintenanceService;

@Service
@Transactional
public class MaintenanceServiceImpl implements MaintenanceService {

    private static final Logger log = LoggerFactory.getLogger(MaintenanceServiceImpl.class);

    // Charset A-Z + 0-9 (36 ký tự) → 36^6 ≈ 2.18 tỷ tổ hợp, collision rất hiếm.
    // Mã phải có ít nhất 1 chữ và 1 số → fix 2 vị trí rồi shuffle.
    private static final String CODE_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    private static final String CODE_DIGITS  = "0123456789";
    private static final String CODE_CHARSET = CODE_LETTERS + CODE_DIGITS;
    private static final int CODE_LENGTH = 6;
    private static final int CODE_GEN_MAX_ATTEMPTS = 10;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final MaintenanceLogRepository maintenanceRepo;
    private final EquipmentRepository equipmentRepo;
    private final BuildingRepository buildingRepo;

    public MaintenanceServiceImpl(MaintenanceLogRepository maintenanceRepo,
                                  EquipmentRepository equipmentRepo,
                                  BuildingRepository buildingRepo) {
        this.maintenanceRepo = maintenanceRepo;
        this.equipmentRepo   = equipmentRepo;
        this.buildingRepo    = buildingRepo;
    }

    @Override
    public MaintenanceResponse create(MaintenanceRequest request) {
        Equipment equipment = equipmentRepo.findById(request.getEquipmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thiết bị"));

        // Không thể bảo trì thiết bị đang được mượn
        if (equipment.getStatus() == EquipmentStatus.BORROWED) {
            throw new BadRequestException("Không thể tạo phiếu bảo trì khi thiết bị đang được mượn");
        }

        // Mỗi thiết bị chỉ có 1 phiếu IN_PROGRESS tại 1 thời điểm
        if (maintenanceRepo.existsByEquipmentIdAndStatus(equipment.getId(), MaintenanceStatus.IN_PROGRESS)) {
            throw new BadRequestException("Thiết bị này đang có phiếu bảo trì chưa hoàn thành");
        }

        if (request.getEndDate() != null && request.getEndDate().isBefore(request.getStartDate())) {
            throw new BadRequestException("Ngày dự kiến kết thúc phải sau ngày bắt đầu");
        }

        MaintenanceLog log = new MaintenanceLog();
        log.setCode(generateUniqueCode());
        log.setEquipment(equipment);
        log.setTechnicianName(request.getTechnicianName());
        log.setStartDate(request.getStartDate());
        log.setEndDate(request.getEndDate());
        log.setDescription(request.getDescription());
        log.setCost(request.getCost());
        log.setStatus(MaintenanceStatus.IN_PROGRESS);

        // Side effect: AVAILABLE/BROKEN -> MAINTENANCE. Đã MAINTENANCE thì giữ nguyên (case Entry 1)
        if (equipment.getStatus() != EquipmentStatus.MAINTENANCE) {
            equipment.setStatus(EquipmentStatus.MAINTENANCE);
        }

        MaintenanceLog saved = maintenanceRepo.save(log);
        MaintenanceServiceImpl.log.info("Tạo phiếu bảo trì {} cho thiết bị {}", saved.getId(), equipment.getCode());
        return MaintenanceResponse.from(saved);
    }

    @Override
    public MaintenanceResponse update(Long id, MaintenanceUpdateRequest request) {
        MaintenanceLog log = maintenanceRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiếu bảo trì"));

        if (log.getStatus() != MaintenanceStatus.IN_PROGRESS) {
            throw new BadRequestException("Chỉ có thể sửa phiếu đang trong tiến trình");
        }
        if (request.getEndDate() != null && request.getEndDate().isBefore(request.getStartDate())) {
            throw new BadRequestException("Ngày dự kiến kết thúc phải sau ngày bắt đầu");
        }

        log.setTechnicianName(request.getTechnicianName());
        log.setStartDate(request.getStartDate());
        log.setEndDate(request.getEndDate());
        log.setDescription(request.getDescription());
        log.setCost(request.getCost());

        return MaintenanceResponse.from(log);
    }

    @Override
    @Transactional(readOnly = true)
    public List<MaintenanceResponse> getAll(String status, Long equipmentId, String keyword) {
        List<MaintenanceLog> logs;
        if (status != null && !status.isBlank()) {
            MaintenanceStatus s;
            try {
                s = MaintenanceStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException ex) {
                throw new BadRequestException("Trạng thái không hợp lệ");
            }
            logs = maintenanceRepo.findByStatusOrderByStartDateDescIdDesc(s);
        } else if (equipmentId != null) {
            logs = maintenanceRepo.findByEquipmentIdOrderByStartDateDesc(equipmentId);
        } else {
            logs = maintenanceRepo.findAllByOrderByStartDateDescIdDesc();
        }

        if (keyword != null && !keyword.isBlank()) {
            String q = keyword.trim().toLowerCase();
            logs = logs.stream().filter(l ->
                    (l.getEquipment().getCode() != null && l.getEquipment().getCode().toLowerCase().contains(q))
                 || (l.getEquipment().getName() != null && l.getEquipment().getName().toLowerCase().contains(q))
                 || (l.getTechnicianName() != null && l.getTechnicianName().toLowerCase().contains(q))
            ).collect(Collectors.toList());
        }

        return logs.stream().map(MaintenanceResponse::from).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public MaintenanceResponse getById(Long id) {
        MaintenanceLog log = maintenanceRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiếu bảo trì"));
        return MaintenanceResponse.from(log);
    }

    @Override
    public MaintenanceResponse complete(Long id, BigDecimal cost, LocalDate endDate, Long newBuildingId) {
        MaintenanceLog log = maintenanceRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiếu bảo trì"));

        if (log.getStatus() != MaintenanceStatus.IN_PROGRESS) {
            throw new BadRequestException("Phiếu bảo trì này đã đóng");
        }
        LocalDate finalEnd = endDate != null ? endDate : LocalDate.now();
        if (finalEnd.isBefore(log.getStartDate())) {
            throw new BadRequestException("Ngày kết thúc phải sau hoặc bằng ngày bắt đầu");
        }

        log.setStatus(MaintenanceStatus.COMPLETED);
        log.setEndDate(finalEnd);
        if (cost != null) {
            log.setCost(cost);
        }
        Equipment equipment = log.getEquipment();
        equipment.setStatus(EquipmentStatus.AVAILABLE);

        // Cập nhật vị trí (Khu) nếu admin chọn khu khác khu hiện tại
        if (newBuildingId != null && !newBuildingId.equals(equipment.getBuilding().getId())) {
            Building newBuilding = buildingRepo.findById(newBuildingId)
                    .orElseThrow(() -> new BadRequestException("Khu được chọn không tồn tại"));
            equipment.setBuilding(newBuilding);
            MaintenanceServiceImpl.log.info("Hoàn thành BT {} — equipment {} chuyển sang khu {}",
                    id, equipment.getCode(), newBuilding.getName());
        }

        MaintenanceServiceImpl.log.info("Hoàn thành phiếu bảo trì {} — equipment {} -> AVAILABLE",
                id, equipment.getCode());
        return MaintenanceResponse.from(log);
    }

    // Sinh mã phiếu 6 ký tự duy nhất, đảm bảo CÓ CẢ chữ in hoa VÀ số.
    // Cách làm: fix vị trí 0 là chữ, vị trí 1 là số, 4 vị trí còn lại pick từ 36 ký tự, rồi shuffle Fisher-Yates.
    // Retry tới 10 lần nếu code trùng (collision rất hiếm với 36^6 combos).
    private String generateUniqueCode() {
        for (int attempt = 0; attempt < CODE_GEN_MAX_ATTEMPTS; attempt++) {
            char[] chars = new char[CODE_LENGTH];
            chars[0] = CODE_LETTERS.charAt(RANDOM.nextInt(CODE_LETTERS.length()));
            chars[1] = CODE_DIGITS.charAt(RANDOM.nextInt(CODE_DIGITS.length()));
            for (int i = 2; i < CODE_LENGTH; i++) {
                chars[i] = CODE_CHARSET.charAt(RANDOM.nextInt(CODE_CHARSET.length()));
            }
            for (int i = chars.length - 1; i > 0; i--) {
                int j = RANDOM.nextInt(i + 1);
                char tmp = chars[i]; chars[i] = chars[j]; chars[j] = tmp;
            }
            String code = new String(chars);
            if (!maintenanceRepo.existsByCode(code)) {
                return code;
            }
        }
        throw new IllegalStateException("Không thể sinh mã phiếu bảo trì duy nhất sau " + CODE_GEN_MAX_ATTEMPTS + " lần thử");
    }

    @Override
    public MaintenanceResponse cancel(Long id, String reason) {
        MaintenanceLog log = maintenanceRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiếu bảo trì"));

        if (log.getStatus() != MaintenanceStatus.IN_PROGRESS) {
            throw new BadRequestException("Phiếu bảo trì này đã đóng");
        }

        log.setStatus(MaintenanceStatus.CANCELLED);
        log.setEndDate(LocalDate.now());

        // Append reason vào description thay vì tạo column riêng — đủ thông tin truy vết, không tăng schema
        if (reason != null && !reason.isBlank()) {
            String prev = log.getDescription() == null ? "" : log.getDescription();
            log.setDescription(prev + "\n[Hủy] " + reason.trim());
        }

        // Rule "1 IN_PROGRESS / equipment" đảm bảo equipment đang MAINTENANCE chỉ vì phiếu này → đưa về AVAILABLE
        Equipment equipment = log.getEquipment();
        if (equipment.getStatus() == EquipmentStatus.MAINTENANCE) {
            equipment.setStatus(EquipmentStatus.AVAILABLE);
        }

        MaintenanceServiceImpl.log.info("Hủy phiếu bảo trì {} — lý do: {}", id, reason);
        return MaintenanceResponse.from(log);
    }
}
