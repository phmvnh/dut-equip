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

import com.datn.backend.dto.BuildingRequest;
import com.datn.backend.dto.BuildingResponse;
import com.datn.backend.service.BuildingService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/buildings")
public class BuildingController {

    private final BuildingService buildingService;

    public BuildingController(BuildingService buildingService) {
        this.buildingService = buildingService;
    }

    @GetMapping
    public ResponseEntity<List<BuildingResponse>> getAll() {
        return ResponseEntity.ok(buildingService.getAll());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BuildingResponse> create(@RequestBody @Valid BuildingRequest request) {
        BuildingResponse created = buildingService.create(request);
        return ResponseEntity
                .created(URI.create("/api/v1/buildings/" + created.getId()))
                .body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BuildingResponse> update(@PathVariable Long id,
                                                   @RequestBody @Valid BuildingRequest request) {
        return ResponseEntity.ok(buildingService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        buildingService.delete(id);
        return ResponseEntity.ok(Map.of("message", "Xóa khu/tòa nhà thành công"));
    }
}
