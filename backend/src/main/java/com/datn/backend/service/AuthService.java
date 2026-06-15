package com.datn.backend.service;

import org.springframework.web.multipart.MultipartFile;

import com.datn.backend.dto.AuthResponse;
import com.datn.backend.dto.ChangePasswordRequest;
import com.datn.backend.dto.LoginRequest;
import com.datn.backend.dto.RegisterRequest;
import com.datn.backend.dto.UpdatePersonalEmailRequest;
import com.datn.backend.dto.UpdateProfileRequest;

public interface AuthService {

    AuthResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request);

    AuthResponse.UserInfo me(String email);

    AuthResponse.UserInfo updateProfile(String email, UpdateProfileRequest request);

    AuthResponse.UserInfo updatePersonalEmail(String email, UpdatePersonalEmailRequest request);

    AuthResponse.UserInfo updateAvatar(String email, MultipartFile file);

    void changePassword(String email, ChangePasswordRequest request);
}
