import axiosClient from './axiosClient';

export type BuildingEnvironmentStability = 'STABLE' | 'VOLATILE';

export interface BuildingResponse {
  id: number;
  name: string;
  environmentStability: BuildingEnvironmentStability;
}

export interface BuildingRequest {
  name: string;
  environmentStability: BuildingEnvironmentStability;
}

export const buildingApi = {
  getAll: () =>
    axiosClient.get<BuildingResponse[]>('/buildings').then((r) => r.data),
  create: (data: BuildingRequest) =>
    axiosClient.post<BuildingResponse>('/buildings', data).then((r) => r.data),
  update: (id: number, data: BuildingRequest) =>
    axiosClient.put<BuildingResponse>(`/buildings/${id}`, data).then((r) => r.data),
  delete: (id: number) => axiosClient.delete(`/buildings/${id}`),
};
