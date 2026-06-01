package com.datn.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.datn.backend.entity.Setting;

public interface SettingRepository extends JpaRepository<Setting, Long> {
}
