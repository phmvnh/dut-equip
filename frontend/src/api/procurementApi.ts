import axiosClient from './axiosClient';
import type {
  Procurement,
  ProcurementApprovePayload,
  ProcurementCreatePayload,
} from '../types/procurement';

export const procurementApi = {
  getAll: (status?: string) =>
    axiosClient
      .get<Procurement[]>('/procurements', { params: status ? { status } : {} })
      .then((r) => r.data),

  getById: (id: number) =>
    axiosClient.get<Procurement>(`/procurements/${id}`).then((r) => r.data),

  create: (data: ProcurementCreatePayload) =>
    axiosClient.post<Procurement>('/procurements', data).then((r) => r.data),

  approve: (id: number, data: ProcurementApprovePayload) =>
    axiosClient.put<Procurement>(`/procurements/${id}/approve`, data).then((r) => r.data),

  reject: (id: number, reason: string) =>
    axiosClient.put<Procurement>(`/procurements/${id}/reject`, { reason }).then((r) => r.data),

  cancel: (id: number) =>
    axiosClient.put<Procurement>(`/procurements/${id}/cancel`, {}).then((r) => r.data),

  receive: (id: number) =>
    axiosClient.put<Procurement>(`/procurements/${id}/receive`).then((r) => r.data),
};
