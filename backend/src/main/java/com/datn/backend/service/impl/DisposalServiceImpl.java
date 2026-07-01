package com.datn.backend.service.impl;

import java.time.LocalDateTime;
import java.time.Year;
import java.util.List;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.datn.backend.dto.DisposalApproveRequest;
import com.datn.backend.dto.DisposalCompleteRequest;
import com.datn.backend.dto.DisposalCreateRequest;
import com.datn.backend.dto.DisposalResponse;
import com.datn.backend.entity.DisposalRequest;
import com.datn.backend.entity.Equipment;
import com.datn.backend.entity.User;
import com.datn.backend.enums.BorrowStatus;
import com.datn.backend.enums.DisposalStatus;
import com.datn.backend.enums.EquipmentStatus;
import com.datn.backend.exception.BadRequestException;
import com.datn.backend.exception.ResourceNotFoundException;
import com.datn.backend.repository.BorrowRequestRepository;
import com.datn.backend.repository.DisposalRequestRepository;
import com.datn.backend.repository.EquipmentRepository;
import com.datn.backend.repository.UserRepository;
import com.datn.backend.service.DisposalService;

@Service
@Transactional
public class DisposalServiceImpl implements DisposalService {

    private static final Logger log = LoggerFactory.getLogger(DisposalServiceImpl.class);

    // Đề nghị thanh lý đang xử lý → chặn mượn + chặn lập đề nghị trùng
    private static final List<DisposalStatus> ACTIVE_DISPOSAL_STATUSES =
            List.of(DisposalStatus.PENDING, DisposalStatus.APPROVED);

    private final DisposalRequestRepository disposalRepo;
    private final EquipmentRepository equipmentRepo;
    private final BorrowRequestRepository borrowRepo;
    private final UserRepository userRepo;

    public DisposalServiceImpl(DisposalRequestRepository disposalRepo,
                               EquipmentRepository equipmentRepo,
                               BorrowRequestRepository borrowRepo,
                               UserRepository userRepo) {
        this.disposalRepo  = disposalRepo;
        this.equipmentRepo = equipmentRepo;
        this.borrowRepo    = borrowRepo;
        this.userRepo      = userRepo;
    }

    @Override
    @Transactional(readOnly = true)
    public List<DisposalResponse> getAll(String status) {
        List<DisposalRequest> requests;
        if (status != null && !status.isBlank()) {
            DisposalStatus s;
            try {
                s = DisposalStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException ex) {
                throw new BadRequestException("Trạng thái không hợp lệ");
            }
            requests = disposalRepo.findByStatusOrderByCreatedAtDesc(s);
        } else {
            requests = disposalRepo.findAllByOrderByCreatedAtDesc();
        }
        return requests.stream().map(DisposalResponse::from).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public DisposalResponse getById(Long id) {
        return DisposalResponse.from(findRequest(id));
    }

    @Override
    public DisposalResponse create(DisposalCreateRequest request, Long requesterId) {
        Equipment equipment = equipmentRepo.findById(request.getEquipmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thiết bị"));

        if (equipment.getStatus() == EquipmentStatus.DISPOSED) {
            throw new BadRequestException("Thiết bị đã được thanh lý trước đó");
        }
        if (equipment.getStatus() == EquipmentStatus.BORROWED) {
            throw new BadRequestException("Không thể thanh lý thiết bị đang được mượn");
        }
        boolean hasActiveBorrow = borrowRepo.existsByEquipmentIdAndStatusIn(
                equipment.getId(), List.of(BorrowStatus.PENDING, BorrowStatus.APPROVED, BorrowStatus.OVERDUE));
        if (hasActiveBorrow) {
            throw new BadRequestException("Không thể thanh lý thiết bị còn đơn mượn đang xử lý");
        }
        if (disposalRepo.existsByEquipmentIdAndStatusIn(equipment.getId(), ACTIVE_DISPOSAL_STATUSES)) {
            throw new BadRequestException("Thiết bị này đã có đề nghị thanh lý đang xử lý");
        }

        User requester = userRepo.findById(requesterId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        DisposalRequest entity = new DisposalRequest();
        entity.setCode(generateCode());
        entity.setEquipment(equipment);
        entity.setEquipmentCode(equipment.getCode());
        entity.setEquipmentName(equipment.getName());
        entity.setRequestedBy(requester);
        entity.setReason(request.getReason().trim());
        entity.setProposedMethod(request.getProposedMethod());
        entity.setEstimatedValue(request.getEstimatedValue());
        entity.setNote(request.getNote());
        entity.setStatus(DisposalStatus.PENDING);

        DisposalRequest saved = disposalRepo.save(entity);
        log.info("Tạo đề nghị thanh lý {} cho thiết bị {}", saved.getCode(), equipment.getCode());

        return DisposalResponse.from(saved);
    }

    @Override
    public DisposalResponse approve(Long id, DisposalApproveRequest request, Long approverId) {
        DisposalRequest entity = findRequest(id);
        if (entity.getStatus() != DisposalStatus.PENDING) {
            throw new BadRequestException("Chỉ ghi nhận phê duyệt cho đề nghị đang chờ duyệt");
        }
        User approver = userRepo.findById(approverId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        entity.setStatus(DisposalStatus.APPROVED);
        entity.setDecisionNo(request.getDecisionNo().trim());
        entity.setDecisionDate(request.getDecisionDate());
        entity.setApproverName(request.getApproverName().trim());
        entity.setDecisionFileUrl(request.getDecisionFileUrl());
        entity.setApprovedBy(approver);
        entity.setApprovedAt(LocalDateTime.now());
        log.info("Ghi nhận phê duyệt đề nghị thanh lý {} - QĐ {}", entity.getCode(), request.getDecisionNo());

        return DisposalResponse.from(entity);
    }

    @Override
    public DisposalResponse reject(Long id, String reason) {
        DisposalRequest entity = findRequest(id);
        if (entity.getStatus() != DisposalStatus.PENDING) {
            throw new BadRequestException("Chỉ từ chối được đề nghị đang chờ duyệt");
        }
        entity.setStatus(DisposalStatus.REJECTED);
        entity.setRejectReason(reason);
        log.info("Từ chối đề nghị thanh lý {} - lý do: {}", entity.getCode(), reason);

        return DisposalResponse.from(entity);
    }

    @Override
    public DisposalResponse cancel(Long id) {
        DisposalRequest entity = findRequest(id);
        if (entity.getStatus() != DisposalStatus.PENDING && entity.getStatus() != DisposalStatus.APPROVED) {
            throw new BadRequestException("Chỉ hủy được đề nghị đang chờ duyệt hoặc đã duyệt nhưng chưa thực hiện");
        }
        entity.setStatus(DisposalStatus.CANCELLED);
        log.info("Hủy đề nghị thanh lý {}", entity.getCode());
        return DisposalResponse.from(entity);
    }

    @Override
    public DisposalResponse complete(Long id, DisposalCompleteRequest request) {
        DisposalRequest entity = findRequest(id);
        if (entity.getStatus() != DisposalStatus.APPROVED) {
            throw new BadRequestException("Chỉ thực hiện thanh lý cho đề nghị đã được duyệt");
        }
        Equipment equipment = entity.getEquipment();
        if (equipment.getStatus() == EquipmentStatus.DISPOSED) {
            throw new BadRequestException("Thiết bị đã được thanh lý trước đó");
        }
        if (equipment.getStatus() == EquipmentStatus.BORROWED) {
            throw new BadRequestException("Không thể thanh lý thiết bị đang được mượn");
        }

        // Ghi giảm thiết bị — tái dùng các field disposal sẵn có trên Equipment
        equipment.setStatus(EquipmentStatus.DISPOSED);
        equipment.setDisposalReason(entity.getReason());
        equipment.setDisposalDate(request.getDisposalDate());
        equipment.setDisposalValue(request.getProceeds());
        equipment.setHidden(false);

        entity.setActualMethod(request.getActualMethod());
        entity.setProceeds(request.getProceeds());
        entity.setDisposalDate(request.getDisposalDate());
        entity.setStatus(DisposalStatus.COMPLETED);
        entity.setCompletedAt(LocalDateTime.now());
        log.info("Hoàn thành thanh lý {} - thiết bị {} chuyển DISPOSED", entity.getCode(), equipment.getCode());

        return DisposalResponse.from(entity);
    }

    private DisposalRequest findRequest(Long id) {
        return disposalRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đề nghị thanh lý"));
    }

    // Tạo mã đề nghị dạng TL-2025-001, TL-2025-002, ...
    private String generateCode() {
        String year = String.valueOf(Year.now().getValue());
        int next = disposalRepo.findMaxCodeByYear(year)
                .map(max -> {
                    try {
                        return Integer.parseInt(max.substring(max.lastIndexOf('-') + 1)) + 1;
                    } catch (NumberFormatException e) {
                        return 1;
                    }
                })
                .orElse(1);
        return String.format("TL-%s-%03d", year, next);
    }
}
