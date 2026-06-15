package com.datn.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class UpdatePersonalEmailRequest {

    @NotBlank(message = "Email cá nhân không được để trống")
    @Email(message = "Email không hợp lệ")
    private String personalEmail;

    public String getPersonalEmail() { return personalEmail; }
    public void setPersonalEmail(String personalEmail) { this.personalEmail = personalEmail; }
}
