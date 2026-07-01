package com.datn.backend.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.datn.backend.dto.InventoryEventRequest;
import com.datn.backend.dto.InventoryEventResponse;
import com.datn.backend.dto.InventoryItemUpdateRequest;
import com.datn.backend.entity.User;
import com.datn.backend.exception.ResourceNotFoundException;
import com.datn.backend.repository.UserRepository;
import com.datn.backend.service.InventoryService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/admin/inventory")
@PreAuthorize("hasRole('ADMIN')")
public class InventoryController {

    private final InventoryService  inventoryService;
    private final UserRepository    userRepository;

    public InventoryController(InventoryService inventoryService, UserRepository userRepository) {
        this.inventoryService = inventoryService;
        this.userRepository   = userRepository;
    }

    @GetMapping
    public ResponseEntity<List<InventoryEventResponse>> getAll() {
        return ResponseEntity.ok(inventoryService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<InventoryEventResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(inventoryService.getById(id));
    }

    @PostMapping
    public ResponseEntity<InventoryEventResponse> create(@Valid @RequestBody InventoryEventRequest request) {
        return ResponseEntity.ok(inventoryService.create(request, currentUserId()));
    }

    @PutMapping("/{id}/start")
    public ResponseEntity<InventoryEventResponse> start(@PathVariable Long id) {
        return ResponseEntity.ok(inventoryService.start(id));
    }

    @PutMapping("/{id}/items/{itemId}")
    public ResponseEntity<InventoryEventResponse> updateItem(
            @PathVariable Long id,
            @PathVariable Long itemId,
            @RequestBody InventoryItemUpdateRequest request) {
        return ResponseEntity.ok(inventoryService.updateItem(id, itemId, request, currentUserId()));
    }

    @PutMapping("/{id}/complete")
    public ResponseEntity<InventoryEventResponse> complete(@PathVariable Long id) {
        return ResponseEntity.ok(inventoryService.complete(id));
    }

    private Long currentUserId() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng"));
        return user.getId();
    }
}
