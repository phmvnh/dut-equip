import axiosClient from './axiosClient';
import type {
  Disposal,
  DisposalApprovePayload,
  DisposalCompletePayload,
  DisposalCreatePayload,
} from '../types/disposal';

export const disposalApi = {
  getAll: (status?: string) =>
    axiosClient
      .get<Disposal[]>('/disposals', { params: status ? { status } : {} })
      .then((r) => r.data),

  getById: (id: number) =>
    axiosClient.get<Disposal>(`/disposals/${id}`).then((r) => r.data),

  create: (data: DisposalCreatePayload) =>
    axiosClient.post<Disposal>('/disposals', data).then((r) => r.data),

  approve: (id: number, data: DisposalApprovePayload) =>
    axiosClient.put<Disposal>(`/disposals/${id}/approve`, data).then((r) => r.data),

  reject: (id: number, reason: string) =>
    axiosClient.put<Disposal>(`/disposals/${id}/reject`, { reason }).then((r) => r.data),

  cancel: (id: number) =>
    axiosClient.put<Disposal>(`/disposals/${id}/cancel`, {}).then((r) => r.data),

  complete: (id: number, data: DisposalCompletePayload) =>
    axiosClient.put<Disposal>(`/disposals/${id}/complete`, data).then((r) => r.data),
};
