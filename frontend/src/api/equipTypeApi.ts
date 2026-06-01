import axiosClient from './axiosClient';

export interface EquipTypeResponse {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface EquipTypeRequest {
  name: string;
}

export const equipTypeApi = {
  getAll: () => axiosClient.get<EquipTypeResponse[]>('/equip-types').then((r) => r.data),
  create: (data: EquipTypeRequest) =>
    axiosClient.post<EquipTypeResponse>('/equip-types', data).then((r) => r.data),
  update: (id: number, data: EquipTypeRequest) =>
    axiosClient.put<EquipTypeResponse>(`/equip-types/${id}`, data).then((r) => r.data),
  delete: (id: number) => axiosClient.delete(`/equip-types/${id}`),
};
