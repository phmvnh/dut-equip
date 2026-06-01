package com.datn.backend.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.datn.backend.dto.SettingRequest;
import com.datn.backend.dto.SettingResponse;
import com.datn.backend.service.SettingService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/settings")
public class SettingController {

    private final SettingService service;

    public SettingController(SettingService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<SettingResponse> get() {
        return ResponseEntity.ok(service.get());
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SettingResponse> update(@RequestBody @Valid SettingRequest request) {
        return ResponseEntity.ok(service.update(request));
    }
}
