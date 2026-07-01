import axiosClient from './axiosClient';
import type { Equipment } from '../types/equipment';

export interface EquipListParams {
  equipTypeId?: number;
  buildingId?: number;
  status?: string;
  keyword?: string;
}

export interface EquipCreatePayload {
  code: string;
  name: string;
  equipTypeId: number;
  buildingId: number;
  specifications?: string;
  description?: string;
  purchasePrice?: number;
  warrantyUntil?: string;    // YYYY-MM-DD
  usefulLifeYears?: number;  // khấu hao đường thẳng
  acquisitionDate?: string;  // YYYY-MM-DD — ngày đưa vào sử dụng
}

export const equipApi = {
  getAll: (params?: EquipListParams) =>
    axiosClient.get<Equipment[]>('/equips', { params }).then((r) => r.data),

  getById: (id: number) =>
    axiosClient.get<Equipment>(`/equips/${id}`).then((r) => r.data),

  getByCode: (code: string) =>
    axiosClient.get<Equipment>(`/equips/by-code/${encodeURIComponent(code)}`).then((r) => r.data),

  create: (data: EquipCreatePayload) =>
    axiosClient.post<Equipment>('/equips', data).then((r) => r.data),

  update: (id: number, data: EquipCreatePayload) =>
    axiosClient.put<Equipment>(`/equips/${id}`, data).then((r) => r.data),

  delete: (id: number) =>
    axiosClient.delete(`/equips/${id}`).then((r) => r.data),

  uploadImage: (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosClient
      .post<Equipment>(`/equips/${id}/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  // Upload >=1 ảnh phụ — BE bọc trong ApiResponse, unwrap về Equipment
  uploadExtraImages: (id: number, files: File[]) => {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    return axiosClient
      .post<{ data: Equipment }>(`/equips/${id}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data.data);
  },

  deleteExtraImage: (equipId: number, imageId: number) =>
    axiosClient
      .delete<{ data: Equipment }>(`/equips/${equipId}/images/${imageId}`)
      .then((r) => r.data.data),

  hide: (id: number) =>
    axiosClient.post<Equipment>(`/equips/${id}/hide`).then((r) => r.data),

  show: (id: number) =>
    axiosClient.post<Equipment>(`/equips/${id}/show`).then((r) => r.data),
};
