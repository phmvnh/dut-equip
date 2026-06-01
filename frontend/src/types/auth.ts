export interface User {
  id: number;
  fullName: string;
  email: string;
  role: 'USER' | 'ADMIN';
  faculty?: string;
  phone?: string;
  avatarUrl?: string;
}

export interface AuthResponse {
  token: string;
  expiresIn: number;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  faculty?: string;
  phone?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileRequest {
  fullName: string;
  email: string;
  faculty?: string;
  phone?: string;
}
