package com.datn.backend.service;

import com.datn.backend.dto.SettingRequest;
import com.datn.backend.dto.SettingResponse;

public interface SettingService {
    SettingResponse get();
    SettingResponse update(SettingRequest request);
}
