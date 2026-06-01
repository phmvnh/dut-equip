package com.datn.backend.service;

import java.util.List;

import com.datn.backend.dto.BuildingRequest;
import com.datn.backend.dto.BuildingResponse;

public interface BuildingService {
    List<BuildingResponse> getAll();
    BuildingResponse create(BuildingRequest request);
    BuildingResponse update(Long id, BuildingRequest request);
    void delete(Long id);
}
