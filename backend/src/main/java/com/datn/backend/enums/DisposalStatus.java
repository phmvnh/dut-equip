package com.datn.backend.enums;

// Trạng thái đề nghị thanh lý thiết bị
public enum DisposalStatus {
    PENDING,    // Đã lập đề nghị, chờ phê duyệt (in tờ trình trình ký)
    APPROVED,   // Đã ghi nhận quyết định phê duyệt — chờ thực hiện ghi giảm
    REJECTED,   // Bị từ chối
    COMPLETED,  // Đã thực hiện thanh lý → thiết bị chuyển DISPOSED
    CANCELLED   // Người lập hủy đề nghị
}
