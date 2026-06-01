package com.datn.backend.controller;

import java.util.Map;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.datn.backend.service.CloudinaryService;

@RestController
@RequestMapping("/api/v1/uploads")
public class UploadController {

    private final CloudinaryService cloudinaryService;

    public UploadController(CloudinaryService cloudinaryService) {
        this.cloudinaryService = cloudinaryService;
    }

    // POST /api/v1/uploads/damage-image — USER + ADMIN
    // Dùng cho user upload ảnh minh chứng khi báo hỏng thiết bị.
    @PostMapping(value = "/damage-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadDamageImage(@RequestParam("file") MultipartFile file) {
        String url = cloudinaryService.uploadImage(file);
        return ResponseEntity.ok(Map.of("url", url));
    }

    // POST /api/v1/uploads/complaint-image — USER + ADMIN
    // Dùng cho user upload ảnh chứng cứ khi khiếu nại phiếu bồi thường.
    @PostMapping(value = "/complaint-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadComplaintImage(@RequestParam("file") MultipartFile file) {
        String url = cloudinaryService.uploadImage(file);
        return ResponseEntity.ok(Map.of("url", url));
    }

    // POST /api/v1/uploads/chat-image — ảnh đính kèm trong chat
    @PostMapping(value = "/chat-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadChatImage(@RequestParam("file") MultipartFile file) {
        String url = cloudinaryService.uploadChatImage(file);
        return ResponseEntity.ok(Map.of("url", url));
    }

    // POST /api/v1/uploads/chat-file — file đính kèm trong chat (PDF/DOC/XLS/ZIP...)
    @PostMapping(value = "/chat-file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> uploadChatFile(@RequestParam("file") MultipartFile file) {
        String url = cloudinaryService.uploadChatFile(file);
        return ResponseEntity.ok(Map.of(
                "url", url,
                "name", file.getOriginalFilename() == null ? "" : file.getOriginalFilename(),
                "size", file.getSize()
        ));
    }
}
