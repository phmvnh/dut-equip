package com.datn.backend.service.impl;

import java.time.Year;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.datn.backend.dto.DepartmentLoanCreateRequest;
import com.datn.backend.dto.DepartmentLoanResponse;
import com.datn.backend.dto.DepartmentLoanReturnRequest;
import com.datn.backend.entity.DepartmentLoan;
import com.datn.backend.entity.Equipment;
import com.datn.backend.entity.User;
import com.datn.backend.enums.DepartmentLoanStatus;
import com.datn.backend.enums.EquipmentStatus;
import com.datn.backend.exception.BadRequestException;
import com.datn.backend.exception.ResourceNotFoundException;
import com.datn.backend.repository.DepartmentLoanRepository;
import com.datn.backend.repository.EquipmentRepository;
import com.datn.backend.repository.UserRepository;
import com.datn.backend.service.DepartmentLoanService;

@Service
@Transactional
public class DepartmentLoanServiceImpl implements DepartmentLoanService {

    private final DepartmentLoanRepository loanRepo;
    private final EquipmentRepository equipmentRepo;
    private final UserRepository userRepo;

    public DepartmentLoanServiceImpl(DepartmentLoanRepository loanRepo,
                                     EquipmentRepository equipmentRepo,
                                     UserRepository userRepo) {
        this.loanRepo     = loanRepo;
        this.equipmentRepo = equipmentRepo;
        this.userRepo      = userRepo;
    }

    @Override
    @Transactional(readOnly = true)
    public List<DepartmentLoanResponse> getAll(String status) {
        List<DepartmentLoan> loans;
        if (status == null || status.isBlank()) {
            loans = loanRepo.findAllByOrderByCreatedAtDesc();
        } else {
            DepartmentLoanStatus s = parseStatus(status);
            loans = loanRepo.findAllByStatusOrderByCreatedAtDesc(s);
        }
        return loans.stream().map(DepartmentLoanResponse::from).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public DepartmentLoanResponse getById(Long id) {
        return DepartmentLoanResponse.from(findLoan(id));
    }

    @Override
    public DepartmentLoanResponse create(DepartmentLoanCreateRequest req, Long adminId) {
        Equipment equipment = equipmentRepo.findByIdForUpdate(req.getEquipmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thiết bị"));

        if (equipment.getStatus() != EquipmentStatus.AVAILABLE) {
            throw new BadRequestException("Thiết bị hiện không ở trạng thái sẵn sàng (đang " + equipment.getStatus() + ")");
        }

        boolean hasActiveLoan = loanRepo
                .findFirstByEquipmentIdAndStatus(req.getEquipmentId(), DepartmentLoanStatus.ACTIVE)
                .isPresent();
        if (hasActiveLoan) {
            throw new BadRequestException("Thiết bị đang có phiếu mượn khoa còn hiệu lực");
        }

        User admin = userRepo.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        DepartmentLoan loan = new DepartmentLoan();
        loan.setCode(generateCode());
        loan.setEquipment(equipment);
        loan.setEquipmentCode(equipment.getCode());
        loan.setEquipmentName(equipment.getName());
        loan.setDepartmentName(req.getDepartmentName());
        loan.setContactPerson(req.getContactPerson());
        loan.setContactPhone(req.getContactPhone());
        loan.setPurpose(req.getPurpose());
        loan.setApproverName(req.getApproverName());
        loan.setStartDate(req.getStartDate());
        loan.setExpectedReturnDate(req.getExpectedReturnDate());
        loan.setNote(req.getNote());
        loan.setRequestFileUrl(req.getRequestFileUrl());
        if (req.getImageUrls() != null && !req.getImageUrls().isEmpty()) {
            loan.setImageUrlsRaw(String.join(",", req.getImageUrls()));
        }
        loan.setStatus(DepartmentLoanStatus.ACTIVE);
        loan.setCreatedBy(admin);

        equipment.setStatus(EquipmentStatus.BORROWED);
        equipmentRepo.save(equipment);

        return DepartmentLoanResponse.from(loanRepo.save(loan));
    }

    @Override
    public DepartmentLoanResponse returnLoan(Long id, DepartmentLoanReturnRequest req) {
        DepartmentLoan loan = findLoan(id);
        if (loan.getStatus() != DepartmentLoanStatus.ACTIVE) {
            throw new BadRequestException("Chỉ có thể ghi nhận trả cho phiếu đang ACTIVE");
        }

        EquipmentStatus newEquipStatus = parseEquipmentStatus(req.getEquipmentStatus());

        loan.setActualReturnDate(req.getActualReturnDate());
        loan.setConditionAtReturn(req.getConditionAtReturn());
        loan.setStatus(DepartmentLoanStatus.RETURNED);

        Equipment equipment = loan.getEquipment();
        equipment.setStatus(newEquipStatus);
        equipmentRepo.save(equipment);

        return DepartmentLoanResponse.from(loanRepo.save(loan));
    }

    @Override
    public DepartmentLoanResponse cancel(Long id) {
        DepartmentLoan loan = findLoan(id);
        if (loan.getStatus() != DepartmentLoanStatus.ACTIVE) {
            throw new BadRequestException("Chỉ có thể hủy phiếu đang ACTIVE");
        }

        loan.setStatus(DepartmentLoanStatus.CANCELLED);

        Equipment equipment = loan.getEquipment();
        equipment.setStatus(EquipmentStatus.AVAILABLE);
        equipmentRepo.save(equipment);

        return DepartmentLoanResponse.from(loanRepo.save(loan));
    }

    // ─── helpers ─────────────────────────────────────────────────────────────

    private DepartmentLoan findLoan(Long id) {
        return loanRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiếu mượn khoa #" + id));
    }

    private DepartmentLoanStatus parseStatus(String s) {
        try {
            return DepartmentLoanStatus.valueOf(s.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Trạng thái không hợp lệ: " + s);
        }
    }

    private EquipmentStatus parseEquipmentStatus(String s) {
        try {
            EquipmentStatus status = EquipmentStatus.valueOf(s.toUpperCase());
            if (status == EquipmentStatus.AVAILABLE
                    || status == EquipmentStatus.MAINTENANCE
                    || status == EquipmentStatus.BROKEN) {
                return status;
            }
            throw new BadRequestException("Trạng thái thiết bị sau khi trả phải là AVAILABLE, MAINTENANCE hoặc BROKEN");
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Trạng thái thiết bị không hợp lệ: " + s);
        }
    }

    // Format: DM-YYYY-NNN (tăng dần trong năm, reset mỗi năm)
    private String generateCode() {
        String prefix = "DM-" + Year.now().getValue() + "-";
        String maxCode = loanRepo.findMaxCodeByPrefix(prefix).orElse(null);
        int seq = 1;
        if (maxCode != null) {
            try {
                seq = Integer.parseInt(maxCode.substring(prefix.length())) + 1;
            } catch (NumberFormatException ignored) { }
        }
        return prefix + String.format("%03d", seq);
    }
}
