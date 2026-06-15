package com.datn.backend.service.impl;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.datn.backend.dto.CompensationCreateRequest;
import com.datn.backend.dto.CompensationResponse;
import com.datn.backend.dto.ComplaintRequest;
import com.datn.backend.dto.ComplaintResolveRequest;
import com.datn.backend.dto.PaymentProofRequest;
import com.datn.backend.entity.BorrowRequest;
import com.datn.backend.entity.CompensationClaim;
import com.datn.backend.entity.User;
import com.datn.backend.enums.BorrowStatus;
import com.datn.backend.enums.ComplaintStatus;
import com.datn.backend.enums.CompensationStatus;
import com.datn.backend.enums.EquipmentStatus;
import com.datn.backend.enums.NotificationType;
import com.datn.backend.exception.BadRequestException;
import com.datn.backend.exception.ResourceNotFoundException;
import com.datn.backend.repository.BorrowRequestRepository;
import com.datn.backend.repository.CompensationClaimRepository;
import com.datn.backend.service.CompensationService;
import com.datn.backend.service.NotificationService;

@Service
@Transactional
public class CompensationServiceImpl implements CompensationService {

    private static final Logger log = LoggerFactory.getLogger(CompensationServiceImpl.class);

    // Sinh code 6 ký tự — pattern giống MaintenanceServiceImpl, đảm bảo có cả chữ + số
    private static final String CODE_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    private static final String CODE_DIGITS  = "0123456789";
    private static final String CODE_CHARSET = CODE_LETTERS + CODE_DIGITS;
    private static final int CODE_LENGTH = 6;
    private static final int CODE_GEN_MAX_ATTEMPTS = 10;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final CompensationClaimRepository compensationRepo;
    private final BorrowRequestRepository borrowRepo;
    private final NotificationService notificationService;

    public CompensationServiceImpl(CompensationClaimRepository compensationRepo,
                                   BorrowRequestRepository borrowRepo,
                                   NotificationService notificationService) {
        this.compensationRepo    = compensationRepo;
        this.borrowRepo          = borrowRepo;
        this.notificationService = notificationService;
    }

    @Override
    public CompensationResponse create(CompensationCreateRequest request) {
        BorrowRequest borrow = borrowRepo.findById(request.getBorrowId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn mượn"));

        // Chỉ tạo phiếu khi đơn đã trả + thiết bị BROKEN (không bắt buộc có báo hỏng từ user —
        // admin có thể tự phát hiện hỏng khi nhận lại)
        if (borrow.getStatus() != BorrowStatus.RETURNED) {
            throw new BadRequestException("Đơn mượn chưa được trả, không thể tạo phiếu bồi thường");
        }
        if (borrow.getEquipment().getStatus() != EquipmentStatus.BROKEN) {
            throw new BadRequestException("Chỉ tạo phiếu bồi thường khi thiết bị đang ở trạng thái Hỏng");
        }
        if (compensationRepo.existsByBorrowId(borrow.getId())) {
            throw new BadRequestException("Đơn mượn này đã có phiếu bồi thường");
        }

        User user = borrow.getUser();

        CompensationClaim claim = new CompensationClaim();
        claim.setCode(generateUniqueCode());
        claim.setBorrow(borrow);
        claim.setUser(user);
        claim.setEquipment(borrow.getEquipment());
        // Snapshot — không refresh khi user/equipment đổi
        claim.setBorrowerName(borrow.getBorrowerName());
        claim.setBorrowerEmail(borrow.getBorrowerEmail());
        claim.setBorrowerPhone(borrow.getBorrowerPhone());
        claim.setBorrowerFaculty(user.getFaculty());
        claim.setEquipmentCode(borrow.getEquipment().getCode());
        claim.setEquipmentName(borrow.getEquipment().getName());
        claim.setAmount(request.getAmount());
        claim.setReason(request.getReason());
        // Snapshot baseline (admin ghi lúc duyệt) + báo hỏng của user (nếu có) — làm bằng chứng so sánh
        claim.setPreBorrowConditionNote(borrow.getPreBorrowConditionNote());
        claim.setDamageDescription(borrow.getDamageDescription());
        claim.setStatus(CompensationStatus.PENDING);

        CompensationClaim saved = compensationRepo.save(claim);
        log.info("Tạo phiếu bồi thường {} cho user {} - thiết bị {} - {} VND",
                saved.getCode(), user.getId(), borrow.getEquipment().getCode(), request.getAmount());

        notificationService.create(
                user.getId(),
                NotificationType.COMPENSATION_REQUIRED,
                "Yêu cầu bồi thường thiết bị",
                "Bạn cần bồi thường thiết bị " + borrow.getEquipment().getName()
                        + " với số tiền " + request.getAmount().toPlainString() + " VNĐ. "
                        + "Tải PDF và mang qua Phòng Kế toán Tài chính để nộp."
        );

        return CompensationResponse.from(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CompensationResponse> getAll(String status, Long userId) {
        List<CompensationClaim> claims;
        if (status != null && !status.isBlank()) {
            CompensationStatus s;
            try {
                s = CompensationStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException ex) {
                throw new BadRequestException("Trạng thái không hợp lệ");
            }
            claims = compensationRepo.findByStatusOrderByCreatedAtDesc(s);
        } else if (userId != null) {
            claims = compensationRepo.findByUserIdOrderByCreatedAtDesc(userId);
        } else {
            claims = compensationRepo.findAllByOrderByCreatedAtDesc();
        }
        return claims.stream().map(CompensationResponse::from).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public CompensationResponse getById(Long id) {
        CompensationClaim claim = compensationRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiếu bồi thường"));
        return CompensationResponse.from(claim);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CompensationResponse> getMy(Long userId) {
        return compensationRepo.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(CompensationResponse::from)
                .collect(Collectors.toList());
    }

    @Override
    public CompensationResponse confirmPaid(Long id) {
        CompensationClaim claim = compensationRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiếu bồi thường"));

        if (claim.getStatus() != CompensationStatus.PENDING) {
            throw new BadRequestException("Phiếu này không ở trạng thái chờ bồi thường");
        }

        claim.setStatus(CompensationStatus.PAID);
        claim.setPaidAt(LocalDateTime.now());
        log.info("Xác nhận đã bồi thường phiếu {}", claim.getCode());

        notificationService.create(
                claim.getUser().getId(),
                NotificationType.COMPENSATION_CONFIRMED,
                "Đã xác nhận bồi thường",
                "Phiếu " + claim.getCode() + " (" + claim.getEquipmentName() + ") đã được xác nhận đã bồi thường."
        );

        return CompensationResponse.from(claim);
    }

    @Override
    public CompensationResponse cancel(Long id) {
        CompensationClaim claim = compensationRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiếu bồi thường"));

        if (claim.getStatus() != CompensationStatus.PENDING) {
            throw new BadRequestException("Phiếu này không ở trạng thái chờ bồi thường");
        }

        claim.setStatus(CompensationStatus.CANCELLED);
        log.info("Hủy phiếu bồi thường {}", claim.getCode());

        notificationService.create(
                claim.getUser().getId(),
                NotificationType.COMPENSATION_CONFIRMED, // reuse type — message rõ ràng "đã hủy"
                "Phiếu bồi thường đã hủy",
                "Phiếu " + claim.getCode() + " đã bị hủy bởi quản trị viên. Bạn không cần bồi thường."
        );

        return CompensationResponse.from(claim);
    }

    @Override
    public CompensationResponse submitPaymentProof(Long id, PaymentProofRequest request, Long userId) {
        CompensationClaim claim = compensationRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiếu bồi thường"));

        if (!claim.getUser().getId().equals(userId)) {
            throw new BadRequestException("Bạn không có quyền nộp minh chứng cho phiếu này");
        }
        if (claim.getStatus() != CompensationStatus.PENDING) {
            throw new BadRequestException("Chỉ nộp minh chứng cho phiếu đang chờ bồi thường");
        }
        // Đã nộp minh chứng rồi thì khóa — không cho nộp hoặc chỉnh sửa lại ảnh
        if (claim.getPaymentProofUrl() != null) {
            throw new BadRequestException("Phiếu đã có minh chứng, không thể nộp hoặc chỉnh sửa lại");
        }

        claim.setPaymentProofUrl(request.getImageUrl());
        claim.setPaymentProofSubmittedAt(LocalDateTime.now());

        log.info("User {} nộp minh chứng bồi thường phiếu {}", userId, claim.getCode());

        notificationService.createForAllAdmins(
                NotificationType.COMPENSATION_PROOF_SUBMITTED,
                "Minh chứng bồi thường mới",
                claim.getBorrowerName() + " đã nộp minh chứng đã bồi thường cho phiếu " + claim.getCode()
                        + " (thiết bị " + claim.getEquipmentName() + "). Vui lòng kiểm tra và xác nhận."
        );

        return CompensationResponse.from(claim);
    }

    @Override
    public CompensationResponse submitComplaint(Long id, ComplaintRequest request, Long userId) {
        CompensationClaim claim = compensationRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiếu bồi thường"));

        if (!claim.getUser().getId().equals(userId)) {
            throw new BadRequestException("Bạn không có quyền khiếu nại phiếu này");
        }
        if (claim.getStatus() != CompensationStatus.PENDING) {
            throw new BadRequestException("Chỉ khiếu nại được phiếu chưa bồi thường");
        }
        if (claim.isHasComplaint()) {
            throw new BadRequestException("Phiếu này đã có khiếu nại trước đó");
        }

        claim.setHasComplaint(true);
        claim.setComplaintReason(request.getReason());
        claim.setComplaintImageUrls(request.getImageUrls());
        claim.setComplaintCreatedAt(LocalDateTime.now());
        claim.setComplaintStatus(ComplaintStatus.PENDING_REVIEW);

        log.info("User {} khiếu nại phiếu bồi thường {}", userId, claim.getCode());

        notificationService.createForAllAdmins(
                NotificationType.COMPENSATION_COMPLAINT_RECEIVED,
                "Khiếu nại bồi thường mới",
                claim.getBorrowerName() + " khiếu nại phiếu " + claim.getCode()
                        + " (thiết bị " + claim.getEquipmentName() + ")"
        );

        return CompensationResponse.from(claim);
    }

    @Override
    public CompensationResponse resolveComplaint(Long id, ComplaintResolveRequest request) {
        CompensationClaim claim = compensationRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phiếu bồi thường"));

        if (!claim.isHasComplaint() || claim.getComplaintStatus() != ComplaintStatus.PENDING_REVIEW) {
            throw new BadRequestException("Phiếu không có khiếu nại đang chờ xử lý");
        }

        String userMessage;
        switch (request.getAction()) {
            case ACCEPT -> {
                claim.setStatus(CompensationStatus.CANCELLED);
                claim.setComplaintStatus(ComplaintStatus.ACCEPTED);
                userMessage = "Khiếu nại của bạn đã được chấp nhận. Phiếu " + claim.getCode()
                        + " đã hủy, bạn không phải bồi thường.";
            }
            case REJECT -> {
                // Phiếu giữ nguyên PENDING
                claim.setComplaintStatus(ComplaintStatus.REJECTED);
                userMessage = "Khiếu nại của bạn cho phiếu " + claim.getCode() + " đã bị từ chối. "
                        + "Vui lòng tiếp tục nộp tiền theo phiếu.";
            }
            case ADJUST -> {
                if (request.getNewAmount() == null || request.getNewAmount().compareTo(BigDecimal.ZERO) <= 0) {
                    throw new BadRequestException("Số tiền điều chỉnh phải lớn hơn 0");
                }
                claim.setAmount(request.getNewAmount());
                // Phiếu giữ nguyên PENDING với amount mới
                claim.setComplaintStatus(ComplaintStatus.ADJUSTED);
                userMessage = "Số tiền bồi thường phiếu " + claim.getCode()
                        + " đã được điều chỉnh thành " + request.getNewAmount().toPlainString()
                        + " VNĐ. Tải lại PDF để nộp tiền theo mức mới.";
            }
            default -> throw new BadRequestException("Hành động không hợp lệ");
        }

        claim.setComplaintResolvedAt(LocalDateTime.now());
        claim.setComplaintResolution(request.getNote());

        log.info("Admin resolve khiếu nại phiếu {} - action {}", claim.getCode(), request.getAction());

        notificationService.create(
                claim.getUser().getId(),
                NotificationType.COMPENSATION_COMPLAINT_RESOLVED,
                "Khiếu nại đã được xử lý",
                userMessage
        );

        return CompensationResponse.from(claim);
    }

    // Sinh code 6 ký tự duy nhất, có cả chữ + số (fix 2 vị trí + shuffle Fisher-Yates)
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
            if (!compensationRepo.existsByCode(code)) {
                return code;
            }
        }
        throw new IllegalStateException("Không thể sinh mã phiếu bồi thường duy nhất sau " + CODE_GEN_MAX_ATTEMPTS + " lần thử");
    }
}
