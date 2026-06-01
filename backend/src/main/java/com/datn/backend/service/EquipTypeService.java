package com.datn.backend.service;

import java.util.List;

import com.datn.backend.dto.EquipTypeRequest;
import com.datn.backend.dto.EquipTypeResponse;

public interface EquipTypeService {
    List<EquipTypeResponse> getAll();
    EquipTypeResponse getById(Long id);
    EquipTypeResponse create(EquipTypeRequest request);
    EquipTypeResponse update(Long id, EquipTypeRequest request);
    void delete(Long id);
}
