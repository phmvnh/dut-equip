package com.datn.backend.service;

import java.util.List;

import com.datn.backend.dto.CreateUserRequest;
import com.datn.backend.dto.UpdateUserRequest;
import com.datn.backend.dto.UserResponse;

public interface UserService {
    List<UserResponse> getAllUsers();
    UserResponse getUser(Long id);
    UserResponse createUser(CreateUserRequest request);
    UserResponse updateUser(Long id, UpdateUserRequest request);
    UserResponse toggleActive(Long id);
    UserResponse resetPassword(Long id);
    void deleteUser(Long id);
}
