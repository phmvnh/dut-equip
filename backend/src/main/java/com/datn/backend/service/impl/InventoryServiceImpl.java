package com.datn.backend.service.impl;

import java.time.LocalDateTime;
import java.time.Year;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.datn.backend.dto.InventoryEventRequest;
import com.datn.backend.dto.InventoryEventResponse;
import com.datn.backend.dto.InventoryItemUpdateRequest;
import com.datn.backend.entity.Equipment;
import com.datn.backend.entity.InventoryEvent;
import com.datn.backend.entity.InventoryItem;
import com.datn.backend.entity.User;
import com.datn.backend.enums.EquipmentStatus;
import com.datn.backend.exception.BadRequestException;
import com.datn.backend.exception.ResourceNotFoundException;
import com.datn.backend.repository.EquipmentRepository;
import com.datn.backend.repository.InventoryEventRepository;
import com.datn.backend.repository.InventoryItemRepository;
import com.datn.backend.repository.UserRepository;
import com.datn.backend.service.InventoryService;

@Service
@Transactional
public class InventoryServiceImpl implements InventoryService {

    private final InventoryEventRepository eventRepo;
    private final InventoryItemRepository  itemRepo;
    private final EquipmentRepository      equipmentRepo;
    private final UserRepository           userRepo;

    public InventoryServiceImpl(InventoryEventRepository eventRepo,
                                InventoryItemRepository itemRepo,
                                EquipmentRepository equipmentRepo,
                                UserRepository userRepo) {
        this.eventRepo    = eventRepo;
        this.itemRepo     = itemRepo;
        this.equipmentRepo = equipmentRepo;
        this.userRepo     = userRepo;
    }

    @Override
    @Transactional(readOnly = true)
    public List<InventoryEventResponse> getAll() {
        return eventRepo.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(e -> InventoryEventResponse.from(e, false))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public InventoryEventResponse getById(Long id) {
        InventoryEvent event = findEvent(id);
        // Load items with equipment eagerly via repository query to avoid N+1
        itemRepo.findByEventIdWithEquipment(id); // warms the session cache
        return InventoryEventResponse.from(event, true);
    }

    @Override
    public InventoryEventResponse create(InventoryEventRequest request, Long adminId) {
        User admin = userRepo.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        InventoryEvent event = new InventoryEvent();
        event.setCode(generateCode());
        event.setTitle(request.getTitle().trim());
        event.setDescription(request.getDescription());
        event.setStartDate(request.getStartDate());
        event.setEndDate(request.getEndDate());
        event.setCreatedBy(admin);
        event.setStatus("DRAFT");

        // Seed tất cả thiết bị chưa thanh lý vào danh sách kiểm kê
        List<Equipment> equipments = equipmentRepo.findAll()
                .stream()
                .filter(e -> e.getStatus() != EquipmentStatus.DISPOSED)
                .collect(Collectors.toList());

        InventoryEvent saved = eventRepo.save(event);

        for (Equipment eq : equipments) {
            InventoryItem item = new InventoryItem();
            item.setEvent(saved);
            item.setEquipment(eq);
            item.setExpectedLocation(eq.getBuilding().getName());
            item.setExpectedStatus(eq.getStatus().name());
            itemRepo.save(item);
        }

        return InventoryEventResponse.from(saved, false);
    }

    @Override
    public InventoryEventResponse start(Long id) {
        InventoryEvent event = findEvent(id);
        if (!"DRAFT".equals(event.getStatus())) {
            throw new BadRequestException("Đợt kiểm kê đã được bắt đầu hoặc hoàn thành");
        }
        event.setStatus("IN_PROGRESS");
        return InventoryEventResponse.from(event, false);
    }

    @Override
    public InventoryEventResponse updateItem(Long eventId, Long itemId,
                                             InventoryItemUpdateRequest request, Long adminId) {
        InventoryEvent event = findEvent(eventId);
        if ("COMPLETED".equals(event.getStatus())) {
            throw new BadRequestException("Không thể cập nhật đợt kiểm kê đã hoàn thành");
        }
        InventoryItem item = itemRepo.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy mục kiểm kê"));
        if (!item.getEvent().getId().equals(eventId)) {
            throw new BadRequestException("Mục kiểm kê không thuộc đợt này");
        }

        User admin = userRepo.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));

        item.setFound(request.isFound());
        item.setActualLocation(request.getActualLocation());
        item.setActualCondition(request.getActualCondition());
        item.setDiscrepancyNote(request.getDiscrepancyNote());
        item.setCheckedBy(admin);
        item.setCheckedAt(LocalDateTime.now());
        itemRepo.save(item);

        itemRepo.findByEventIdWithEquipment(eventId);
        return InventoryEventResponse.from(event, true);
    }

    @Override
    public InventoryEventResponse complete(Long id) {
        InventoryEvent event = findEvent(id);
        if (!"IN_PROGRESS".equals(event.getStatus())) {
            throw new BadRequestException("Chỉ có thể hoàn thành đợt kiểm kê đang tiến hành");
        }
        event.setStatus("COMPLETED");
        return InventoryEventResponse.from(event, false);
    }

    private InventoryEvent findEvent(Long id) {
        return eventRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đợt kiểm kê"));
    }

    // Tạo mã đợt kiểm kê dạng KK-2025-001, KK-2025-002, ...
    private String generateCode() {
        String year = String.valueOf(Year.now().getValue());
        int next = eventRepo.findMaxCodeByYear(year)
                .map(max -> {
                    try {
                        return Integer.parseInt(max.substring(max.lastIndexOf('-') + 1)) + 1;
                    } catch (NumberFormatException e) {
                        return 1;
                    }
                })
                .orElse(1);
        return String.format("KK-%s-%03d", year, next);
    }
}
