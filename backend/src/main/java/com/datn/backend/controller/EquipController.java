package com.datn.backend.controller;

import java.net.URI;
import java.util.List;
import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.datn.backend.dto.ApiResponse;
import com.datn.backend.dto.DisposeRequest;
import com.datn.backend.dto.EquipRequest;
import com.datn.backend.dto.EquipResponse;
import com.datn.backend.service.EquipService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/equips")
public class EquipController {

    private final EquipService equipService;

    public EquipController(EquipService equipService) {
        this.equipService = equipService;
    }

    // GET /api/v1/equips?equipTypeId=&buildingId=&status=&keyword= — PUBLIC
    @GetMapping
    public ResponseEntity<List<EquipResponse>> getAll(
            @RequestParam(required = false) Long equipTypeId,
            @RequestParam(required = false) Long buildingId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(equipService.getAll(equipTypeId, buildingId, status, keyword));
    }

    // GET /api/v1/equips/{id} — PUBLIC
    @GetMapping("/{id}")
    public ResponseEntity<EquipResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(equipService.getById(id));
    }

    // GET /api/v1/equips/by-code/{code} — PUBLIC (dùng cho QR view)
    @GetMapping("/by-code/{code}")
    public ResponseEntity<EquipResponse> getByCode(@PathVariable String code) {
        return ResponseEntity.ok(equipService.getByCode(code));
    }

    // POST /api/v1/equips — ADMIN only
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EquipResponse> create(@RequestBody @Valid EquipRequest request) {
        EquipResponse created = equipService.create(request);
        return ResponseEntity
                .created(URI.create("/api/v1/equips/" + created.getId()))
                .body(created);
    }

    // PUT /api/v1/equips/{id} — ADMIN only
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EquipResponse> update(@PathVariable Long id,
                                                @RequestBody @Valid EquipRequest request) {
        return ResponseEntity.ok(equipService.update(id, request));
    }

    // DELETE /api/v1/equips/{id} — ADMIN only
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        equipService.delete(id);
        return ResponseEntity.ok(Map.of("message", "Xóa thiết bị thành công"));
    }

    // POST /api/v1/equips/{id}/image — ADMIN only
    @PostMapping(value = "/{id}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<EquipResponse>> uploadImage(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) {
        EquipResponse updated = equipService.uploadImage(id, file);
        return ResponseEntity.ok(ApiResponse.ok("Upload ảnh thiết bị thành công", updated));
    }

    // DELETE /api/v1/equips/{id}/image — ADMIN only
    @DeleteMapping("/{id}/image")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteImage(@PathVariable Long id) {
        equipService.deleteImage(id);
        return ResponseEntity.ok(ApiResponse.ok("Xóa ảnh thiết bị thành công"));
    }

    // POST /api/v1/equips/{id}/images — ADMIN upload nhiều ảnh phụ (1 lần >=1 file)
    @PostMapping(value = "/{id}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<EquipResponse>> uploadExtraImages(
            @PathVariable Long id,
            @RequestParam("files") List<MultipartFile> files) {
        EquipResponse updated = equipService.uploadExtraImages(id, files);
        return ResponseEntity.ok(ApiResponse.ok("Upload ảnh phụ thành công", updated));
    }

    // DELETE /api/v1/equips/{id}/images/{imageId} — ADMIN xóa 1 ảnh phụ
    @DeleteMapping("/{id}/images/{imageId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<EquipResponse>> deleteExtraImage(
            @PathVariable Long id,
            @PathVariable Long imageId) {
        EquipResponse updated = equipService.deleteExtraImage(id, imageId);
        return ResponseEntity.ok(ApiResponse.ok("Xóa ảnh phụ thành công", updated));
    }

    // POST /api/v1/equips/{id}/hide — ADMIN ẩn thiết bị khỏi HomePage
    @PostMapping("/{id}/hide")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EquipResponse> hide(@PathVariable Long id) {
        return ResponseEntity.ok(equipService.setHidden(id, true));
    }

    // POST /api/v1/equips/{id}/show — ADMIN hiển thị lại thiết bị
    @PostMapping("/{id}/show")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EquipResponse> show(@PathVariable Long id) {
        return ResponseEntity.ok(equipService.setHidden(id, false));
    }

    // POST /api/v1/equips/{id}/dispose — ADMIN thanh lý thiết bị
    @PostMapping("/{id}/dispose")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<EquipResponse> dispose(@PathVariable Long id,
                                                 @RequestBody @Valid DisposeRequest request) {
        return ResponseEntity.ok(equipService.dispose(id, request));
    }
}
