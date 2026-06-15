package com.datn.backend.controller;

import java.security.Principal;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.datn.backend.dto.AuthResponse;
import com.datn.backend.dto.ChangePasswordRequest;
import com.datn.backend.dto.LoginRequest;
import com.datn.backend.dto.RegisterRequest;
import com.datn.backend.dto.UpdatePersonalEmailRequest;
import com.datn.backend.dto.UpdateProfileRequest;
import com.datn.backend.service.AuthService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody @Valid RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody @Valid LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @GetMapping("/me")
    public ResponseEntity<AuthResponse.UserInfo> me(Principal principal) {
        return ResponseEntity.ok(authService.me(principal.getName()));
    }

    @PutMapping("/me")
    public ResponseEntity<AuthResponse.UserInfo> updateProfile(Principal principal,
                                                               @RequestBody @Valid UpdateProfileRequest request) {
        return ResponseEntity.ok(authService.updateProfile(principal.getName(), request));
    }

    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AuthResponse.UserInfo> updateAvatar(Principal principal,
                                                              @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(authService.updateAvatar(principal.getName(), file));
    }

    @PutMapping("/me/personal-email")
    public ResponseEntity<AuthResponse.UserInfo> updatePersonalEmail(Principal principal,
                                                                     @RequestBody @Valid UpdatePersonalEmailRequest request) {
        return ResponseEntity.ok(authService.updatePersonalEmail(principal.getName(), request));
    }

    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(Principal principal, @RequestBody @Valid ChangePasswordRequest request) {
        authService.changePassword(principal.getName(), request);
        return ResponseEntity.ok().build();
    }
}
