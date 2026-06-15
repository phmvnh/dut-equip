import axiosClient from './axiosClient';
import type { AuthResponse, ChangePasswordRequest, LoginRequest, RegisterRequest, UpdatePersonalEmailRequest, UpdateProfileRequest, User } from '../types/auth';

export const authApi = {
  login: (data: LoginRequest) =>
    axiosClient.post<AuthResponse>('/auth/login', data).then((r) => r.data),

  register: (data: RegisterRequest) =>
    axiosClient.post<AuthResponse>('/auth/register', data).then((r) => r.data),

  me: () =>
    axiosClient.get<User>('/auth/me').then((r) => r.data),

  updateProfile: (data: UpdateProfileRequest) =>
    axiosClient.put<User>('/auth/me', data).then((r) => r.data),

  updatePersonalEmail: (data: UpdatePersonalEmailRequest) =>
    axiosClient.put<User>('/auth/me/personal-email', data).then((r) => r.data),

  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosClient
      .post<User>('/auth/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  changePassword: (data: ChangePasswordRequest) =>
    axiosClient.post<void>('/auth/change-password', data).then((r) => r.data),
};
