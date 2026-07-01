package com.datn.backend.service.impl;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.datn.backend.dto.EquipRequest;
import com.datn.backend.dto.EquipResponse;
import com.datn.backend.entity.Building;
import com.datn.backend.entity.Equipment;
import com.datn.backend.entity.EquipmentImage;
import com.datn.backend.entity.EquipType;
import com.datn.backend.enums.BorrowStatus;
import com.datn.backend.enums.EquipmentStatus;
import com.datn.backend.exception.BadRequestException;
import com.datn.backend.exception.ResourceNotFoundException;
import com.datn.backend.repository.BorrowRequestRepository;
import com.datn.backend.repository.BuildingRepository;
import com.datn.backend.repository.CompensationClaimRepository;
import com.datn.backend.repository.EquipmentImageRepository;
import com.datn.backend.repository.EquipmentRepository;
import com.datn.backend.repository.EquipTypeRepository;
import com.datn.backend.repository.MaintenanceLogRepository;
import com.datn.backend.service.CloudinaryService;
import com.datn.backend.service.EquipService;

@Service
@Transactional
public class EquipServiceImpl implements EquipService {

    private static final Logger log = LoggerFactory.getLogger(EquipServiceImpl.class);

    private final EquipmentRepository         equipmentRepo;
    private final EquipTypeRepository         equipTypeRepo;
    private final BuildingRepository          buildingRepo;
    private final BorrowRequestRepository     borrowRepo;
    private final MaintenanceLogRepository    maintenanceRepo;
    private final CompensationClaimRepository compensationRepo;
    private final EquipmentImageRepository    equipImageRepo;
    private final CloudinaryService           cloudinaryService;

    // Giới hạn để tránh spam upload — đủ cho thiết bị thông thường
    private static final int MAX_EXTRA_IMAGES = 8;

    public EquipServiceImpl(EquipmentRepository equipmentRepo,
                            EquipTypeRepository equipTypeRepo,
                            BuildingRepository buildingRepo,
                            BorrowRequestRepository borrowRepo,
                            MaintenanceLogRepository maintenanceRepo,
                            CompensationClaimRepository compensationRepo,
                            EquipmentImageRepository equipImageRepo,
                            CloudinaryService cloudinaryService) {
        this.equipmentRepo     = equipmentRepo;
        this.equipTypeRepo     = equipTypeRepo;
        this.buildingRepo      = buildingRepo;
        this.borrowRepo        = borrowRepo;
        this.maintenanceRepo   = maintenanceRepo;
        this.compensationRepo  = compensationRepo;
        this.equipImageRepo    = equipImageRepo;
        this.cloudinaryService = cloudinaryService;
    }

    // Chỉ tính các đơn đã duyệt hoặc đã phát sinh sử dụng thực tế
    private static final List<BorrowStatus> USAGE_STATUSES = Arrays.asList(
            BorrowStatus.APPROVED, BorrowStatus.OVERDUE, BorrowStatus.RETURNED);

    @Override
    @Transactional(readOnly = true)
    public List<EquipResponse> getAll(Long equipTypeId, Long buildingId, String status, String keyword) {
        EquipmentStatus statusEnum = (status != null && !status.isBlank())
                ? EquipmentStatus.valueOf(status.toUpperCase())
                : null;
        String kw = (keyword != null && !keyword.isBlank()) ? keyword.trim() : null;

        // 1 query bulk count GROUP BY equipment_id → tránh N+1
        Map<Long, Long> usageMap = new HashMap<>();
        for (Object[] row : borrowRepo.countByStatusInGroupedByEquipment(USAGE_STATUSES)) {
            usageMap.put((Long) row[0], (Long) row[1]);
        }

        return equipmentRepo.search(equipTypeId, buildingId, statusEnum, kw)
                .stream()
                .map(e -> EquipResponse.from(e, usageMap.getOrDefault(e.getId(), 0L)))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public EquipResponse getById(Long id) {
        Equipment equipment = equipmentRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thiết bị"));
        long usageCount = borrowRepo.countByEquipmentIdAndStatusIn(id, USAGE_STATUSES);
        List<EquipmentImage> images = equipImageRepo.findByEquipmentIdOrderBySortOrderAsc(id);
        return EquipResponse.from(equipment, usageCount, images);
    }

    @Override
    @Transactional(readOnly = true)
    public EquipResponse getByCode(String code) {
        Equipment equipment = equipmentRepo.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thiết bị với mã " + code));
        long usageCount = borrowRepo.countByEquipmentIdAndStatusIn(equipment.getId(), USAGE_STATUSES);
        List<EquipmentImage> images = equipImageRepo.findByEquipmentIdOrderBySortOrderAsc(equipment.getId());
        return EquipResponse.from(equipment, usageCount, images);
    }

    @Override
    public EquipResponse create(EquipRequest request) {
        if (equipmentRepo.existsByCode(request.getCode())) {
            throw new BadRequestException("Mã thiết bị đã tồn tại");
        }
        EquipType equipType = equipTypeRepo.findById(request.getEquipTypeId())
                .orElseThrow(() -> new BadRequestException("Loại thiết bị không tồn tại"));
        Building building = buildingRepo.findById(request.getBuildingId())
                .orElseThrow(() -> new BadRequestException("Khu không tồn tại"));

        Equipment equipment = new Equipment();
        equipment.setCode(request.getCode());
        equipment.setName(request.getName());
        equipment.setEquipType(equipType);
        equipment.setBuilding(building);
        equipment.setStatus(EquipmentStatus.AVAILABLE);
        equipment.setSpecifications(request.getSpecifications());
        equipment.setDescription(request.getDescription());
        equipment.setPurchasePrice(request.getPurchasePrice());
        equipment.setWarrantyUntil(request.getWarrantyUntil());
        equipment.setUsefulLifeYears(request.getUsefulLifeYears());
        equipment.setAcquisitionDate(request.getAcquisitionDate());
        equipment.setMainImageUrl(null);

        Equipment saved = equipmentRepo.save(equipment);
        log.info("Admin tạo thiết bị mới: {}", saved.getCode());
        return EquipResponse.from(saved);
    }

    @Override
    public EquipResponse update(Long id, EquipRequest request) {
        Equipment equipment = equipmentRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thiết bị"));

        if (equipmentRepo.existsByCodeAndIdNot(request.getCode(), id)) {
            throw new BadRequestException("Mã thiết bị đã tồn tại");
        }
        EquipType equipType = equipTypeRepo.findById(request.getEquipTypeId())
                .orElseThrow(() -> new BadRequestException("Loại thiết bị không tồn tại"));
        Building building = buildingRepo.findById(request.getBuildingId())
                .orElseThrow(() -> new BadRequestException("Khu không tồn tại"));

        equipment.setCode(request.getCode());
        equipment.setName(request.getName());
        equipment.setEquipType(equipType);
        equipment.setBuilding(building);
        equipment.setSpecifications(request.getSpecifications());
        equipment.setDescription(request.getDescription());
        equipment.setPurchasePrice(request.getPurchasePrice());
        equipment.setWarrantyUntil(request.getWarrantyUntil());
        equipment.setUsefulLifeYears(request.getUsefulLifeYears());
        equipment.setAcquisitionDate(request.getAcquisitionDate());

        log.info("Admin cập nhật thiết bị: {}", equipment.getCode());
        return EquipResponse.from(equipment);
    }

    @Override
    public void delete(Long id) {
        Equipment equipment = equipmentRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thiết bị"));

        // Chỉ xóa thiết bị chưa có lịch sử sử dụng để tránh mất dữ liệu nghiệp vụ.
        if (borrowRepo.existsByEquipmentId(id)
                || maintenanceRepo.existsByEquipmentId(id)
                || compensationRepo.existsByEquipmentId(id)) {
            throw new BadRequestException(
                    "Không thể xóa thiết bị đã có lịch sử sử dụng.\n" +
                    "Vui lòng dùng chức năng Ẩn hoặc Thanh lý để loại thiết bị khỏi danh sách.");
        }

        // Xóa ảnh phụ trước (cả Cloudinary lẫn DB) để tránh vướng FK
        List<EquipmentImage> extras = equipImageRepo.findByEquipmentIdOrderBySortOrderAsc(id);
        for (EquipmentImage img : extras) {
            cloudinaryService.deleteImage(img.getImageUrl());
        }
        equipImageRepo.deleteAll(extras);

        cloudinaryService.deleteImage(equipment.getMainImageUrl());
        equipmentRepo.delete(equipment);
        log.info("Admin xóa thiết bị: {}", equipment.getCode());
    }

    @Override
    public EquipResponse uploadImage(Long id, MultipartFile file) {
        Equipment equipment = equipmentRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thiết bị"));

        // Ảnh chính cũ được xóa trước khi thay ảnh mới.
        if (equipment.getMainImageUrl() != null) {
            cloudinaryService.deleteImage(equipment.getMainImageUrl());
        }
        String url = cloudinaryService.uploadImage(file);
        equipment.setMainImageUrl(url);

        log.info("Admin cập nhật ảnh thiết bị: {}", equipment.getCode());
        List<EquipmentImage> images = equipImageRepo.findByEquipmentIdOrderBySortOrderAsc(id);
        return EquipResponse.from(equipment, 0L, images);
    }

    @Override
    public EquipResponse uploadExtraImages(Long id, List<MultipartFile> files) {
        Equipment equipment = equipmentRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thiết bị"));
        if (files == null || files.isEmpty()) {
            throw new BadRequestException("Vui lòng chọn ít nhất một ảnh");
        }

        List<EquipmentImage> current = equipImageRepo.findByEquipmentIdOrderBySortOrderAsc(id);
        if (current.size() + files.size() > MAX_EXTRA_IMAGES) {
            throw new BadRequestException(
                    "Mỗi thiết bị chỉ được tối đa " + MAX_EXTRA_IMAGES + " ảnh phụ");
        }

        int nextOrder = current.stream().mapToInt(EquipmentImage::getSortOrder).max().orElse(-1) + 1;
        for (MultipartFile file : files) {
            if (file == null || file.isEmpty()) continue;
            String url = cloudinaryService.uploadImage(file);
            EquipmentImage img = new EquipmentImage();
            img.setEquipment(equipment);
            img.setImageUrl(url);
            img.setSortOrder(nextOrder++);
            equipImageRepo.save(img);
        }

        log.info("Admin upload {} ảnh phụ cho thiết bị {}", files.size(), equipment.getCode());
        List<EquipmentImage> updated = equipImageRepo.findByEquipmentIdOrderBySortOrderAsc(id);
        return EquipResponse.from(equipment, 0L, updated);
    }

    @Override
    public EquipResponse deleteExtraImage(Long equipId, Long imageId) {
        Equipment equipment = equipmentRepo.findById(equipId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thiết bị"));
        EquipmentImage img = equipImageRepo.findById(imageId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy ảnh"));
        if (!img.getEquipment().getId().equals(equipId)) {
            throw new BadRequestException("Ảnh không thuộc thiết bị này");
        }

        cloudinaryService.deleteImage(img.getImageUrl());
        equipImageRepo.delete(img);

        log.info("Admin xóa 1 ảnh phụ của thiết bị: {}", equipment.getCode());
        List<EquipmentImage> updated = equipImageRepo.findByEquipmentIdOrderBySortOrderAsc(equipId);
        return EquipResponse.from(equipment, 0L, updated);
    }

    @Override
    public EquipResponse setHidden(Long id, boolean hidden) {
        Equipment equipment = equipmentRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thiết bị"));

        // Không cho ẩn thiết bị đang được cho mượn — giảng viên cần thấy ít nhất là pill BORROWED
        // để biết trạng thái thực, đồng thời tránh confusion khi mượn xong không thấy đâu cả.
        if (hidden && equipment.getStatus() == EquipmentStatus.BORROWED) {
            throw new BadRequestException("Không thể ẩn thiết bị đang được cho mượn");
        }
        if (hidden && equipment.getStatus() == EquipmentStatus.DISPOSED) {
            throw new BadRequestException("Thiết bị đã thanh lý không cần ẩn");
        }

        equipment.setHidden(hidden);
        log.info("Admin {} thiết bị: {}", hidden ? "ẩn" : "hiển thị lại", equipment.getCode());
        return EquipResponse.from(equipment);
    }

    @Override
    public void deleteImage(Long id) {
        Equipment equipment = equipmentRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thiết bị"));

        if (equipment.getMainImageUrl() == null) {
            throw new BadRequestException("Thiết bị chưa có ảnh");
        }

        cloudinaryService.deleteImage(equipment.getMainImageUrl());
        equipment.setMainImageUrl(null);

        log.info("Admin xóa ảnh thiết bị: {}", equipment.getCode());
    }
}
