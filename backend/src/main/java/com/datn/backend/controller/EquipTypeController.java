package com.datn.backend.controller;

import java.net.URI;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.datn.backend.dto.EquipTypeRequest;
import com.datn.backend.dto.EquipTypeResponse;
import com.datn.backend.service.EquipTypeService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/equip-types")
public class EquipTypeController {

    private final EquipTypeService service;

    public EquipTypeController(EquipTypeService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<EquipTypeResponse>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<EquipTypeResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EquipTypeResponse> create(@RequestBody @Valid EquipTypeRequest request) {
        EquipTypeResponse created = service.create(request);
        return ResponseEntity
                .created(URI.create("/api/v1/equip-types/" + created.getId()))
                .body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EquipTypeResponse> update(@PathVariable Long id,
                                                    @RequestBody @Valid EquipTypeRequest request) {
        return ResponseEntity.ok(service.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.ok(Map.of("message", "Xóa loại thiết bị thành công"));
    }
}
