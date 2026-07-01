package com.datn.backend.service.impl;

import java.time.LocalDateTime;
import java.time.Year;
import java.util.List;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.datn.backend.dto.ProcurementApproveRequest;
import com.datn.backend.dto.ProcurementCreateRequest;
import com.datn.backend.dto.ProcurementItemRequest;
import com.datn.backend.dto.ProcurementResponse;
import com.datn.backend.entity.Building;
import com.datn.backend.entity.EquipType;
import com.datn.backend.entity.ProcurementItem;
import com.datn.backend.entity.ProcurementRequest;
import com.datn.backend.entity.User;
import com.datn.backend.enums.ProcurementStatus;
import com.datn.backend.exception.BadRequestException;
import com.datn.backend.exception.ResourceNotFoundException;
import com.datn.backend.repository.BuildingRepository;
import com.datn.backend.repository.EquipTypeRepository;
import com.datn.backend.repository.ProcurementRequestRepository;
import com.datn.backend.repository.UserRepository;
import com.datn.backend.service.ProcurementService;

@Service
@Transactional
public class ProcurementServiceImpl implements ProcurementService {

    private static final Logger log = LoggerFactory.getLogger(ProcurementServiceImpl.class);

    private final ProcurementRequestRepository procurementRepo;
    private final EquipTypeRepository equipTypeRepo;
    private final BuildingRepository buildingRepo;
    private final UserRepository userRepo;

    public ProcurementServiceImpl(ProcurementRequestRepository procurementRepo,
                                  EquipTypeRepository equipTypeRepo,
                                  BuildingRepository buildingRepo,
                                  UserRepository userRepo) {
        this.procurementRepo = procurementRepo;
        this.equipTypeRepo   = equipTypeRepo;
        this.buildingRepo    = buildingRepo;
        this.userRepo        = userRepo;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProcurementResponse> getAll(String status) {
        List<ProcurementRequest> requests;
        if (status != null && !status.isBlank()) {
            ProcurementStatus s;
            try {
                s = ProcurementStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException ex) {
                throw new BadRequestException("Trạng thái không hợp lệ");
            }
            requests = procurementRepo.findByStatusOrderByCreatedAtDesc(s);
        } else {
            requests = procurementRepo.findAllByOrderByCreatedAtDesc();
        }
        return requests.stream().map(r -> ProcurementResponse.from(r, false)).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ProcurementResponse getById(Long id) {
        return ProcurementResponse.from(findRequest(id), true);
    }

    @Override
    public ProcurementResponse create(ProcurementCreateRequest request, Long requesterId) {
        User requester = userRepo.findById(requesterId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        ProcurementRequest entity = new ProcurementRequest();
        entity.setCode(generateCode());
        entity.setTitle(request.getTitle().trim());
        entity.setReason(request.getReason());
        entity.setSupplier(request.getSupplier());
        entity.setNote(request.getNote());
        entity.setRequestedBy(requester);
        entity.setStatus(ProcurementStatus.PENDING);

        for (ProcurementItemRequest itemReq : request.getItems()) {
            EquipType equipType = equipTypeRepo.findById(itemReq.getEquipTypeId())
                    .orElseThrow(() -> new BadRequestException("Loại thiết bị không tồn tại"));
            Building building = buildingRepo.findById(itemReq.getTargetBuildingId())
                    .orElseThrow(() -> new BadRequestException("Khu/tòa không tồn tại"));

            ProcurementItem item = new ProcurementItem();
            item.setRequest(entity);
            item.setEquipType(equipType);
            item.setName(itemReq.getName().trim());
            item.setSpecifications(itemReq.getSpecifications());
            item.setQuantity(itemReq.getQuantity());
            item.setUnitPrice(itemReq.getUnitPrice());
            item.setWarrantyMonths(itemReq.getWarrantyMonths());
            item.setUsefulLifeYears(itemReq.getUsefulLifeYears());
            item.setTargetBuilding(building);
            entity.getItems().add(item);
        }

        ProcurementRequest saved = procurementRepo.save(entity);
        log.info("Tạo đề nghị mua sắm {} ({} dòng hàng) bởi user {}",
                saved.getCode(), saved.getItems().size(), requesterId);

        return ProcurementResponse.from(saved, true);
    }

    @Override
    public ProcurementResponse approve(Long id, ProcurementApproveRequest request, Long approverId) {
        ProcurementRequest entity = findRequest(id);
        if (entity.getStatus() != ProcurementStatus.PENDING) {
            throw new BadRequestException("Chỉ ghi nhận phê duyệt cho đề nghị đang chờ duyệt");
        }
        User approver = userRepo.findById(approverId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        entity.setStatus(ProcurementStatus.APPROVED);
        entity.setDecisionNo(request.getDecisionNo().trim());
        entity.setDecisionDate(request.getDecisionDate());
        entity.setApproverName(request.getApproverName().trim());
        entity.setDecisionFileUrl(request.getDecisionFileUrl());
        entity.setApprovedBy(approver);
        entity.setApprovedAt(LocalDateTime.now());
        log.info("Ghi nhận phê duyệt đề nghị mua sắm {} - QĐ {}", entity.getCode(), request.getDecisionNo());

        return ProcurementResponse.from(entity, true);
    }

    @Override
    public ProcurementResponse reject(Long id, String reason) {
        ProcurementRequest entity = findRequest(id);
        if (entity.getStatus() != ProcurementStatus.PENDING) {
            throw new BadRequestException("Chỉ từ chối được đề nghị đang chờ duyệt");
        }
        entity.setStatus(ProcurementStatus.REJECTED);
        entity.setRejectReason(reason);
        log.info("Từ chối đề nghị mua sắm {} - lý do: {}", entity.getCode(), reason);

        return ProcurementResponse.from(entity, true);
    }

    @Override
    public ProcurementResponse cancel(Long id) {
        ProcurementRequest entity = findRequest(id);
        if (entity.getStatus() != ProcurementStatus.PENDING && entity.getStatus() != ProcurementStatus.APPROVED) {
            throw new BadRequestException("Chỉ hủy được đề nghị đang chờ duyệt hoặc đã duyệt nhưng chưa nghiệm thu");
        }
        entity.setStatus(ProcurementStatus.CANCELLED);
        log.info("Hủy đề nghị mua sắm {}", entity.getCode());
        return ProcurementResponse.from(entity, true);
    }

    @Override
    public ProcurementResponse receive(Long id) {
        ProcurementRequest entity = findRequest(id);
        if (entity.getStatus() != ProcurementStatus.APPROVED) {
            throw new BadRequestException("Chỉ nghiệm thu được đề nghị đã được duyệt");
        }

        // Nghiệm thu = đánh dấu hoàn thành. KHÔNG tạo thiết bị ở đây nữa —
        // admin tự thêm thiết bị ở tab "Thiết bị" sau khi nghiệm thu.
        entity.setStatus(ProcurementStatus.COMPLETED);
        entity.setCompletedAt(LocalDateTime.now());
        log.info("Nghiệm thu đề nghị mua sắm {}", entity.getCode());

        return ProcurementResponse.from(entity, true);
    }

    private ProcurementRequest findRequest(Long id) {
        return procurementRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đề nghị mua sắm"));
    }

    // Tạo mã đề nghị dạng MS-2025-001, MS-2025-002, ...
    private String generateCode() {
        String year = String.valueOf(Year.now().getValue());
        int next = procurementRepo.findMaxCodeByYear(year)
                .map(max -> {
                    try {
                        return Integer.parseInt(max.substring(max.lastIndexOf('-') + 1)) + 1;
                    } catch (NumberFormatException e) {
                        return 1;
                    }
                })
                .orElse(1);
        return String.format("MS-%s-%03d", year, next);
    }
}
