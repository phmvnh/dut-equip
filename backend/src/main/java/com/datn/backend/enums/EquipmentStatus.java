package com.datn.backend.enums;

public enum EquipmentStatus {
    AVAILABLE,
    BORROWED, // Đang được mượn
    MAINTENANCE, // Đang được sửa chữa, bảo trì
    BROKEN, // Hỏng, không thể sử dụng được nữa
    DISPOSED // Đã thanh lý — không còn thuộc danh mục thiết bị đang quản lý
}
