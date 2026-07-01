import axiosClient from './axiosClient';

export interface UserResponse {
  id: number;
  fullName: string;
  email: string;
  role: 'USER' | 'ADMIN';
  faculty?: string;
  phone?: string;
  active: boolean;
  createdAt: string;
}

export interface CreateUserPayload {
  fullName: string;
  email: string;
  faculty?: string;
  phone?: string;
  role?: 'USER' | 'ADMIN';
}

export interface UpdateUserPayload {
  fullName: string;
  email: string;
  faculty?: string;
  phone?: string;
  role?: 'USER' | 'ADMIN';
}

export const userApi = {
  getAll: () => axiosClient.get<UserResponse[]>('/users').then((r) => r.data),
  create: (data: CreateUserPayload) =>
    axiosClient.post<UserResponse>('/users', data).then((r) => r.data),
  update: (id: number, data: UpdateUserPayload) =>
    axiosClient.put<UserResponse>(`/users/${id}`, data).then((r) => r.data),
  toggleActive: (id: number) =>
    axiosClient.patch<UserResponse>(`/users/${id}/toggle-active`).then((r) => r.data),
  resetPassword: (id: number) =>
    axiosClient.post<UserResponse>(`/users/${id}/reset-password`).then((r) => r.data),
  delete: (id: number) => axiosClient.delete(`/users/${id}`),
};
