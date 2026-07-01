package com.datn.backend.service;

import org.springframework.web.multipart.MultipartFile;

public interface CloudinaryService {

    /** Upload ảnh lên Cloudinary, trả về secure_url. */
    String uploadImage(MultipartFile file);

    /** Upload avatar user lên Cloudinary, trả về secure_url. */
    String uploadAvatar(MultipartFile file);

    /** Upload ảnh chat (JPG/PNG/WEBP), folder riêng. */
    String uploadChatImage(MultipartFile file);

    /** Upload file đính kèm chat (PDF, DOC, XLS, ZIP...), trả về secure_url. */
    String uploadChatFile(MultipartFile file);

    /** Upload file đơn mượn khoa — ảnh (JPG/PNG/WEBP) hoặc PDF, trả về secure_url. */
    String uploadDeptLoanFile(MultipartFile file);

    /** Xóa ảnh trên Cloudinary theo public_id trích từ URL. Bỏ qua nếu URL rỗng. */
    void deleteImage(String imageUrl);
}
