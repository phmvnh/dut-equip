package com.datn.backend.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.datn.backend.dto.BuildingRequest;
import com.datn.backend.dto.BuildingResponse;
import com.datn.backend.entity.Building;
import com.datn.backend.exception.BadRequestException;
import com.datn.backend.exception.ResourceNotFoundException;
import com.datn.backend.repository.BuildingRepository;
import com.datn.backend.repository.EquipmentRepository;
import com.datn.backend.service.BuildingService;

@Service
@Transactional(readOnly = true)
public class BuildingServiceImpl implements BuildingService {

    private static final Logger log = LoggerFactory.getLogger(BuildingServiceImpl.class);

    private final BuildingRepository buildingRepository;
    private final EquipmentRepository equipmentRepository;

    public BuildingServiceImpl(BuildingRepository buildingRepository,
                               EquipmentRepository equipmentRepository) {
        this.buildingRepository = buildingRepository;
        this.equipmentRepository = equipmentRepository;
    }

    @Override
    public List<BuildingResponse> getAll() {
        log.debug("Lấy danh sách khu/tòa nhà");
        return buildingRepository.findAllByOrderByIdAsc()
                .stream()
                .map(BuildingResponse::from)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public BuildingResponse create(BuildingRequest request) {
        String name = request.getName().trim();
        if (buildingRepository.existsByName(name)) {
            throw new BadRequestException("Tên khu/tòa nhà đã tồn tại");
        }
        Building building = new Building();
        building.setName(name);
        building.setEnvironmentStability(request.getEnvironmentStability());
        Building saved = buildingRepository.save(building);
        log.info("Created Building id={}, name={}, stability={}",
                saved.getId(), saved.getName(), saved.getEnvironmentStability());
        return BuildingResponse.from(saved);
    }

    @Override
    @Transactional
    public BuildingResponse update(Long id, BuildingRequest request) {
        Building building = buildingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy khu/tòa nhà"));
        String name = request.getName().trim();
        if (buildingRepository.existsByNameAndIdNot(name, id)) {
            throw new BadRequestException("Tên khu/tòa nhà đã tồn tại");
        }
        building.setName(name);
        building.setEnvironmentStability(request.getEnvironmentStability());
        Building saved = buildingRepository.save(building);
        log.info("Updated Building id={}, name={}, stability={}",
                saved.getId(), saved.getName(), saved.getEnvironmentStability());
        return BuildingResponse.from(saved);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        if (!buildingRepository.existsById(id)) {
            throw new ResourceNotFoundException("Không tìm thấy khu/tòa nhà");
        }
        if (equipmentRepository.existsByBuildingId(id)) {
            throw new BadRequestException("Khu/tòa nhà đang có thiết bị, không thể xóa");
        }
        buildingRepository.deleteById(id);
        log.info("Deleted Building id={}", id);
    }
}
