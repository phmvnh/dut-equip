package com.datn.backend.enums;

// Hình thức thanh lý tài sản (NĐ 151/2017)
public enum DisposalMethod {
    DESTROY,   // Phá dỡ/hủy bỏ
    SELL,      // Bán (đấu giá/chỉ định) — có thể thu tiền
    TRANSFER,  // Điều chuyển cho đơn vị khác
    OTHER      // Hình thức khác
}
