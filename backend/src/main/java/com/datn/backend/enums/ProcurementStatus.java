package com.datn.backend.enums;

// Trạng thái đề nghị mua sắm/trang bị thiết bị
public enum ProcurementStatus {
    PENDING,    // Đã lập đề nghị, chờ phê duyệt (in tờ trình trình ký)
    APPROVED,   // Đã ghi nhận quyết định phê duyệt — chờ nhập kho/nghiệm thu
    REJECTED,   // Bị từ chối
    COMPLETED,  // Đã nghiệm thu, nhập kho → đã sinh thiết bị
    CANCELLED   // Người lập hủy đề nghị
}
