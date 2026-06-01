import axiosClient from './axiosClient';
import type {
  MaintenanceLog,
  MaintenanceCreatePayload,
  MaintenanceUpdatePayload,
  MaintenanceListParams,
} from '../types/maintenance';

interface ApiResponseWrapper<T> {
  success: boolean;
  message: string;
  data: T;
}

export const maintenanceApi = {
  getAll: (params?: MaintenanceListParams) =>
    axiosClient.get<MaintenanceLog[]>('/maintenance', { params }).then((r) => r.data),

  getById: (id: number) =>
    axiosClient.get<MaintenanceLog>(`/maintenance/${id}`).then((r) => r.data),

  create: (data: MaintenanceCreatePayload) =>
    axiosClient.post<MaintenanceLog>('/maintenance', data).then((r) => r.data),

  update: (id: number, data: MaintenanceUpdatePayload) =>
    axiosClient.put<MaintenanceLog>(`/maintenance/${id}`, data).then((r) => r.data),

  complete: (id: number, payload?: { cost?: number; endDate?: string; buildingId?: number }) =>
    axiosClient
      .put<ApiResponseWrapper<MaintenanceLog>>(`/maintenance/${id}/complete`, payload ?? {})
      .then((r) => r.data.data),

  cancel: (id: number, reason?: string) =>
    axiosClient
      .put<ApiResponseWrapper<MaintenanceLog>>(`/maintenance/${id}/cancel`, { reason: reason ?? '' })
      .then((r) => r.data.data),
};
