import axiosClient from './axiosClient';

export interface SettingResponse {
  maxBorrowDays: number;
  maxConcurrent: number;
  defaultPassword: string;
  contactEmail: string;
  contactPhone: string;
  workingHours: string;
  updatedAt: string;
}

export interface SettingRequest {
  maxBorrowDays: number;
  maxConcurrent: number;
  defaultPassword: string;
  contactEmail: string;
  contactPhone: string;
  workingHours: string;
}

export const settingApi = {
  get: () => axiosClient.get<SettingResponse>('/settings').then((r) => r.data),
  update: (data: SettingRequest) =>
    axiosClient.put<SettingResponse>('/settings', data).then((r) => r.data),
};
