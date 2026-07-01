package com.datn.backend.service;

import java.util.List;

import com.datn.backend.dto.InventoryEventRequest;
import com.datn.backend.dto.InventoryEventResponse;
import com.datn.backend.dto.InventoryItemUpdateRequest;

public interface InventoryService {
    List<InventoryEventResponse> getAll();
    InventoryEventResponse getById(Long id);
    InventoryEventResponse create(InventoryEventRequest request, Long adminId);
    InventoryEventResponse start(Long id);
    InventoryEventResponse updateItem(Long eventId, Long itemId, InventoryItemUpdateRequest request, Long adminId);
    InventoryEventResponse complete(Long id);
}
