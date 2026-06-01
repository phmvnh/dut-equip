package com.datn.backend.entity;

import com.datn.backend.enums.BuildingEnvironmentStability;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

// Khu/tòa nhà — Admin quản lý CRUD.
@Entity
@Table(name = "buildings")
public class Building {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Tên khu, VD: "Khu A", "Xưởng Cơ khí"
    @Column(nullable = false, length = 50)
    private String name;

    // Mức độ ổn định/chịu ảnh hưởng môi trường — admin set, AI dùng cho prompt.
    @Enumerated(EnumType.STRING)
    @Column(name = "environment_stability", nullable = false, length = 20)
    private BuildingEnvironmentStability environmentStability = BuildingEnvironmentStability.STABLE;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public BuildingEnvironmentStability getEnvironmentStability() {
        return environmentStability;
    }

    public void setEnvironmentStability(BuildingEnvironmentStability environmentStability) {
        this.environmentStability = environmentStability;
    }
}
