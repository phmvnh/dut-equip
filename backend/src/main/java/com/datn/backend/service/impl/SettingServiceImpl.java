package com.datn.backend.service.impl;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.datn.backend.dto.SettingRequest;
import com.datn.backend.dto.SettingResponse;
import com.datn.backend.entity.Setting;
import com.datn.backend.repository.SettingRepository;
import com.datn.backend.service.SettingService;

@Service
public class SettingServiceImpl implements SettingService {

    private static final Logger log = LoggerFactory.getLogger(SettingServiceImpl.class);

    private final SettingRepository repository;

    public SettingServiceImpl(SettingRepository repository) {
        this.repository = repository;
    }

    @Override
    public SettingResponse get() {
        return toResponse(getOrCreate());
    }

    @Override
    public SettingResponse update(SettingRequest request) {
        Setting setting = getOrCreate();
        setting.setMaxBorrowDays(request.getMaxBorrowDays());
        setting.setMaxConcurrent(request.getMaxConcurrent());
        setting.setDefaultPassword(request.getDefaultPassword());
        setting.setContactEmail(request.getContactEmail());
        setting.setContactPhone(request.getContactPhone());
        setting.setWorkingHours(request.getWorkingHours());
        Setting saved = repository.save(setting);
        log.info("Updated Setting");
        return toResponse(saved);
    }

    private Setting getOrCreate() {
        return repository.findById(Setting.SINGLETON_ID).orElseGet(() -> {
            Setting s = new Setting();
            s.setId(Setting.SINGLETON_ID);
            s.setMaxBorrowDays(7);
            s.setMaxConcurrent(5);
            s.setDefaultPassword("Dut@12345");
            s.setContactEmail("phongthietbi@dut.udn.vn");
            s.setContactPhone("0236.3842.414");
            s.setWorkingHours("7:30 - 17:00 (Thứ 2 - Thứ 6)");
            Setting created = repository.save(s);
            log.info("Created default Setting singleton");
            return created;
        });
    }

    private SettingResponse toResponse(Setting s) {
        SettingResponse r = new SettingResponse();
        r.setMaxBorrowDays(s.getMaxBorrowDays());
        r.setMaxConcurrent(s.getMaxConcurrent());
        r.setDefaultPassword(s.getDefaultPassword());
        r.setContactEmail(s.getContactEmail());
        r.setContactPhone(s.getContactPhone());
        r.setWorkingHours(s.getWorkingHours());
        r.setUpdatedAt(s.getUpdatedAt());
        return r;
    }
}
