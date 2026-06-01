package com.datn.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class SettingRequest {

    @NotNull(message = "Số ngày mượn tối đa không được để trống")
    @Min(value = 1, message = "Số ngày mượn tối đa phải lớn hơn 0")
    private Integer maxBorrowDays;

    @NotNull(message = "Số thiết bị đồng thời không được để trống")
    @Min(value = 1, message = "Số thiết bị đồng thời phải lớn hơn 0")
    private Integer maxConcurrent;

    @NotBlank(message = "Mật khẩu mặc định không được để trống")
    private String defaultPassword;

    @NotBlank(message = "Email phòng thiết bị không được để trống")
    @Email(message = "Email không hợp lệ")
    private String contactEmail;

    @NotBlank(message = "Số điện thoại không được để trống")
    private String contactPhone;

    @NotBlank(message = "Giờ làm việc không được để trống")
    private String workingHours;

    public Integer getMaxBorrowDays() { return maxBorrowDays; }
    public void setMaxBorrowDays(Integer maxBorrowDays) { this.maxBorrowDays = maxBorrowDays; }

    public Integer getMaxConcurrent() { return maxConcurrent; }
    public void setMaxConcurrent(Integer maxConcurrent) { this.maxConcurrent = maxConcurrent; }

    public String getDefaultPassword() { return defaultPassword; }
    public void setDefaultPassword(String defaultPassword) { this.defaultPassword = defaultPassword; }

    public String getContactEmail() { return contactEmail; }
    public void setContactEmail(String contactEmail) { this.contactEmail = contactEmail; }

    public String getContactPhone() { return contactPhone; }
    public void setContactPhone(String contactPhone) { this.contactPhone = contactPhone; }

    public String getWorkingHours() { return workingHours; }
    public void setWorkingHours(String workingHours) { this.workingHours = workingHours; }
}
