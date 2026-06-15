import axiosClient from './axiosClient';
import type {
  Compensation,
  CompensationCreatePayload,
  CompensationListParams,
  ComplaintCreatePayload,
  ComplaintResolvePayload,
} from '../types/compensation';

interface ApiResponseWrapper<T> {
  success: boolean;
  message: string;
  data: T;
}

export const compensationApi = {
  getAll: (params?: CompensationListParams) =>
    axiosClient.get<Compensation[]>('/compensations', { params }).then((r) => r.data),

  getMy: () =>
    axiosClient.get<Compensation[]>('/compensations/my').then((r) => r.data),

  getById: (id: number) =>
    axiosClient.get<Compensation>(`/compensations/${id}`).then((r) => r.data),

  create: (data: CompensationCreatePayload) =>
    axiosClient.post<Compensation>('/compensations', data).then((r) => r.data),

  confirmPaid: (id: number) =>
    axiosClient
      .put<ApiResponseWrapper<Compensation>>(`/compensations/${id}/confirm-paid`, {})
      .then((r) => r.data.data),

  cancel: (id: number) =>
    axiosClient
      .put<ApiResponseWrapper<Compensation>>(`/compensations/${id}/cancel`, {})
      .then((r) => r.data.data),

  submitPaymentProof: (id: number, imageUrl: string) =>
    axiosClient
      .post<ApiResponseWrapper<Compensation>>(`/compensations/${id}/payment-proof`, { imageUrl })
      .then((r) => r.data.data),

  uploadPaymentProof: (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosClient
      .post<{ url: string }>('/uploads/payment-proof', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data.url);
  },

  submitComplaint: (id: number, payload: ComplaintCreatePayload) =>
    axiosClient
      .post<ApiResponseWrapper<Compensation>>(`/compensations/${id}/complaint`, payload)
      .then((r) => r.data.data),

  resolveComplaint: (id: number, payload: ComplaintResolvePayload) =>
    axiosClient
      .put<ApiResponseWrapper<Compensation>>(`/compensations/${id}/complaint/resolve`, payload)
      .then((r) => r.data.data),

  uploadComplaintImage: (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosClient
      .post<{ url: string }>('/uploads/complaint-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data.url);
  },
};
