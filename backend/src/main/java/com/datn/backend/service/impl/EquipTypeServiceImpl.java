package com.datn.backend.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.datn.backend.dto.EquipTypeRequest;
import com.datn.backend.dto.EquipTypeResponse;
import com.datn.backend.entity.EquipType;
import com.datn.backend.exception.BadRequestException;
import com.datn.backend.exception.ResourceNotFoundException;
import com.datn.backend.repository.EquipTypeRepository;
import com.datn.backend.service.EquipTypeService;

@Service
public class EquipTypeServiceImpl implements EquipTypeService {

    private static final Logger log = LoggerFactory.getLogger(EquipTypeServiceImpl.class);

    private final EquipTypeRepository repository;

    public EquipTypeServiceImpl(EquipTypeRepository repository) {
        this.repository = repository;
    }

    @Override
    public List<EquipTypeResponse> getAll() {
        return repository.findAll(Sort.by("name").ascending())
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public EquipTypeResponse getById(Long id) {
        EquipType equipType = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy loại thiết bị"));
        return toResponse(equipType);
    }

    @Override
    public EquipTypeResponse create(EquipTypeRequest request) {
        if (repository.existsByName(request.getName())) {
            throw new BadRequestException("Tên loại thiết bị đã tồn tại");
        }
        EquipType equipType = new EquipType();
        equipType.setName(request.getName());
        EquipType saved = repository.save(equipType);
        log.info("Created EquipType id={}, name={}", saved.getId(), saved.getName());
        return toResponse(saved);
    }

    @Override
    public EquipTypeResponse update(Long id, EquipTypeRequest request) {
        EquipType equipType = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy loại thiết bị"));
        if (!equipType.getName().equals(request.getName()) && repository.existsByName(request.getName())) {
            throw new BadRequestException("Tên loại thiết bị đã tồn tại");
        }
        equipType.setName(request.getName());
        EquipType saved = repository.save(equipType);
        log.info("Updated EquipType id={}, name={}", saved.getId(), saved.getName());
        return toResponse(saved);
    }

    @Override
    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException("Không tìm thấy loại thiết bị");
        }
        repository.deleteById(id);
        log.info("Deleted EquipType id={}", id);
    }

    private EquipTypeResponse toResponse(EquipType e) {
        EquipTypeResponse response = new EquipTypeResponse();
        response.setId(e.getId());
        response.setName(e.getName());
        response.setCreatedAt(e.getCreatedAt());
        response.setUpdatedAt(e.getUpdatedAt());
        return response;
    }
}
