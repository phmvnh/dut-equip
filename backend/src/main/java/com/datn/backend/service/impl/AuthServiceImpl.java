package com.datn.backend.service.impl;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.datn.backend.dto.AuthResponse;
import com.datn.backend.dto.ChangePasswordRequest;
import com.datn.backend.dto.LoginRequest;
import com.datn.backend.dto.RegisterRequest;
import com.datn.backend.dto.UpdatePersonalEmailRequest;
import com.datn.backend.dto.UpdateProfileRequest;
import com.datn.backend.entity.User;
import com.datn.backend.enums.UserRole;
import com.datn.backend.exception.BadRequestException;
import com.datn.backend.repository.UserRepository;
import com.datn.backend.security.JwtUtil;
import com.datn.backend.service.AuthService;
import com.datn.backend.service.CloudinaryService;

@Service
@Transactional
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final CloudinaryService cloudinaryService;

    public AuthServiceImpl(UserRepository userRepository,
                           PasswordEncoder passwordEncoder,
                           JwtUtil jwtUtil,
                           CloudinaryService cloudinaryService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.cloudinaryService = cloudinaryService;
    }

    @Override
    public AuthResponse register(RegisterRequest request) {
        if (!request.getEmail().endsWith("@dut.udn.vn")) {
            throw new BadRequestException("Chỉ chấp nhận email có định dạng @dut.udn.vn");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BadRequestException("Email đã được sử dụng");
        }

        User user = new User();
        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(UserRole.USER);
        user.setFaculty(request.getFaculty());
        user.setPhone(request.getPhone());
        user.setActive(true);

        User saved = userRepository.save(user);
        String token = jwtUtil.generate(saved);
        return AuthResponse.of(token, jwtUtil.getExpirationMs(), saved);
    }

    @Override
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadRequestException("Email hoặc mật khẩu không đúng"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BadRequestException("Email hoặc mật khẩu không đúng");
        }

        if (!user.isActive()) {
            throw new BadRequestException("Tài khoản đã bị vô hiệu hoá");
        }

        String token = jwtUtil.generate(user);
        return AuthResponse.of(token, jwtUtil.getExpirationMs(), user);
    }

    @Override
    @Transactional(readOnly = true)
    public AuthResponse.UserInfo me(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy tài khoản"));
        return AuthResponse.UserInfo.from(user);
    }

    @Override
    public AuthResponse.UserInfo updateProfile(String email, UpdateProfileRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy tài khoản"));

        String newEmail = request.getEmail().trim();
        if (!newEmail.equalsIgnoreCase(user.getEmail())) {
            if (!newEmail.endsWith("@dut.udn.vn")) {
                throw new BadRequestException("Chỉ chấp nhận email có định dạng @dut.udn.vn");
            }
            if (userRepository.existsByEmail(newEmail)) {
                throw new BadRequestException("Email đã được sử dụng");
            }
            user.setEmail(newEmail);
        }

        user.setFullName(request.getFullName());
        user.setFaculty(request.getFaculty());
        user.setPhone(request.getPhone());

        return AuthResponse.UserInfo.from(userRepository.save(user));
    }

    @Override
    public AuthResponse.UserInfo updatePersonalEmail(String email, UpdatePersonalEmailRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy tài khoản"));

        String personalEmail = request.getPersonalEmail().trim();
        if (personalEmail.equalsIgnoreCase(user.getEmail())) {
            throw new BadRequestException("Email cá nhân phải khác email trường");
        }

        user.setPersonalEmail(personalEmail);
        return AuthResponse.UserInfo.from(userRepository.save(user));
    }

    @Override
    public AuthResponse.UserInfo updateAvatar(String email, MultipartFile file) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy tài khoản"));

        String oldUrl = user.getAvatarUrl();
        String newUrl = cloudinaryService.uploadAvatar(file);
        user.setAvatarUrl(newUrl);
        User saved = userRepository.save(user);

        if (oldUrl != null && !oldUrl.isBlank()) {
            cloudinaryService.deleteImage(oldUrl);
        }

        return AuthResponse.UserInfo.from(saved);
    }

    @Override
    public void changePassword(String email, ChangePasswordRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadRequestException("Không tìm thấy tài khoản"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BadRequestException("Mật khẩu hiện tại không đúng");
        }

        if (request.getCurrentPassword().equals(request.getNewPassword())) {
            throw new BadRequestException("Mật khẩu mới phải khác mật khẩu hiện tại");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }
}
