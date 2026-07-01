package com.datn.backend.service;

import java.util.List;

import org.springframework.web.multipart.MultipartFile;

import com.datn.backend.dto.EquipRequest;
import com.datn.backend.dto.EquipResponse;

public interface EquipService {

    List<EquipResponse> getAll(Long equipTypeId, Long buildingId, String status, String keyword);

    EquipResponse getById(Long id);

    EquipResponse getByCode(String code);

    EquipResponse create(EquipRequest request);

    EquipResponse update(Long id, EquipRequest request);

    void delete(Long id);

    EquipResponse uploadImage(Long id, MultipartFile file);

    void deleteImage(Long id);

    // Upload nhiều ảnh phụ — trả về danh sách ảnh phụ hiện tại (đã sắp xếp)
    EquipResponse uploadExtraImages(Long id, java.util.List<MultipartFile> files);

    // Xóa 1 ảnh phụ theo id ảnh
    EquipResponse deleteExtraImage(Long equipId, Long imageId);

    // Ẩn/Hiện thiết bị khỏi HomePage (cờ orthogonal với status)
    EquipResponse setHidden(Long id, boolean hidden);
}
