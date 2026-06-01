package com.datn.backend.service.impl;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.datn.backend.exception.BadRequestException;
import com.datn.backend.service.CloudinaryService;

@Service
public class CloudinaryServiceImpl implements CloudinaryService {

    private static final Logger log = LoggerFactory.getLogger(CloudinaryServiceImpl.class);

    private static final long MAX_SIZE_BYTES = 5L * 1024 * 1024;
    private static final long MAX_CHAT_FILE_BYTES = 20L * 1024 * 1024;

    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp"
    );

    private static final Set<String> ALLOWED_CHAT_FILE_TYPES = Set.of(
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "application/zip",
            "application/x-zip-compressed",
            "application/x-rar-compressed",
            "application/x-7z-compressed",
            "text/plain"
    );

    private static final String CHAT_IMAGE_FOLDER = "dut_equip/chat_image";
    private static final String CHAT_FILE_FOLDER  = "dut_equip/chat_file";

    private final Cloudinary cloudinary;

    @Value("${cloudinary.upload-preset}")
    private String uploadPreset;

    @Value("${cloudinary.folder}")
    private String folder;

    @Value("${cloudinary.avatar-folder}")
    private String avatarFolder;

    public CloudinaryServiceImpl(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }

    @Override
    public String uploadImage(MultipartFile file) {
        return upload(file, folder, uploadPreset);
    }

    @Override
    public String uploadAvatar(MultipartFile file) {
        // Không dùng upload_preset vì preset `dut_equip` có folder cứng,
        // sẽ ghi đè tham số folder của API → avatar bị lưu sai chỗ.
        return upload(file, avatarFolder, null);
    }

    @Override
    public String uploadChatImage(MultipartFile file) {
        return upload(file, CHAT_IMAGE_FOLDER, null);
    }

    @Override
    public String uploadChatFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Vui lòng chọn file đính kèm");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CHAT_FILE_TYPES.contains(contentType.toLowerCase())) {
            throw new BadRequestException("Định dạng file không hỗ trợ");
        }
        if (file.getSize() > MAX_CHAT_FILE_BYTES) {
            throw new BadRequestException("Kích thước file tối đa 20MB");
        }
        try {
            Map<String, Object> options = new HashMap<>();
            options.put("folder", CHAT_FILE_FOLDER);
            options.put("asset_folder", CHAT_FILE_FOLDER);
            options.put("resource_type", "raw");
            options.put("use_filename", true);
            options.put("unique_filename", true);

            @SuppressWarnings("rawtypes")
            Map result = cloudinary.uploader().upload(file.getBytes(), options);
            String url = (String) result.get("secure_url");
            log.info("Upload chat file thành công: {}", url);
            return url;
        } catch (IOException e) {
            throw new BadRequestException("Upload file thất bại: " + e.getMessage());
        }
    }

    private String upload(MultipartFile file, String targetFolder, String preset) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Vui lòng chọn file ảnh");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType.toLowerCase())) {
            throw new BadRequestException("Chỉ chấp nhận file JPG, PNG hoặc WEBP");
        }
        if (file.getSize() > MAX_SIZE_BYTES) {
            throw new BadRequestException("Kích thước ảnh tối đa 5MB");
        }

        try {
            Map<String, Object> options = new HashMap<>();
            options.put("folder", targetFolder);
            options.put("asset_folder", targetFolder);
            options.put("resource_type", "image");
            if (preset != null && !preset.isBlank()) {
                options.put("upload_preset", preset);
            }

            @SuppressWarnings("rawtypes")
            Map result = cloudinary.uploader().upload(file.getBytes(), options);
            String url = (String) result.get("secure_url");
            log.info("Upload ảnh thành công ({}): {}", targetFolder, url);
            return url;
        } catch (IOException e) {
            throw new BadRequestException("Upload ảnh thất bại: " + e.getMessage());
        }
    }

    @Override
    public void deleteImage(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) return;
        String publicId = extractPublicId(imageUrl);
        if (publicId == null) {
            log.warn("Không thể trích public_id từ URL: {}", imageUrl);
            return;
        }
        try {
            @SuppressWarnings("rawtypes")
            Map options = ObjectUtils.asMap("resource_type", "image");
            cloudinary.uploader().destroy(publicId, options);
            log.info("Xóa ảnh cloudinary: {}", publicId);
        } catch (IOException e) {
            log.warn("Xóa ảnh cloudinary thất bại: {} ({})", publicId, e.getMessage());
        }
    }

    // URL dạng: https://res.cloudinary.com/<cloud>/image/upload/v1700000000/<folder>/<name>.<ext>
    // publicId = "<folder>/<name>" (bỏ version, bỏ extension)
    private String extractPublicId(String url) {
        int uploadIdx = url.indexOf("/upload/");
        if (uploadIdx < 0) return null;
        String afterUpload = url.substring(uploadIdx + "/upload/".length());
        if (afterUpload.startsWith("v") && afterUpload.contains("/")) {
            int slash = afterUpload.indexOf('/');
            String head = afterUpload.substring(1, slash);
            if (head.chars().allMatch(Character::isDigit)) {
                afterUpload = afterUpload.substring(slash + 1);
            }
        }
        int dot = afterUpload.lastIndexOf('.');
        return dot > 0 ? afterUpload.substring(0, dot) : afterUpload;
    }
}
