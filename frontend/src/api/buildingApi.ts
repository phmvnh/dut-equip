import axiosClient from './axiosClient';

export type BuildingEnvironmentStability = 'STABLE' | 'VOLATILE';

export interface BuildingResponse {
  id: number;
  name: string;
  environmentStability: BuildingEnvironmentStability;
}

// 15 khu/tòa nhà seed sẵn — dùng khi API chưa sẵn sàng
export const MOCK_BUILDINGS: BuildingResponse[] = [
  { id: 1,  name: 'Khu A – Giảng đường',        environmentStability: 'STABLE' },
  { id: 2,  name: 'Khu B – Xưởng Cơ khí',       environmentStability: 'VOLATILE' },
  { id: 3,  name: 'Khu C – Phòng thí nghiệm',   environmentStability: 'STABLE' },
  { id: 4,  name: 'Khu D – Văn phòng Khoa',     environmentStability: 'STABLE' },
  { id: 5,  name: 'Khu E – Điện – Điện tử',     environmentStability: 'STABLE' },
  { id: 6,  name: 'Khu F – Công nghệ Thông tin',environmentStability: 'STABLE' },
  { id: 7,  name: 'Khu G – Hóa – Môi trường',   environmentStability: 'VOLATILE' },
  { id: 8,  name: 'Khu H – Xây dựng',           environmentStability: 'VOLATILE' },
  { id: 9,  name: 'Nhà thi đấu đa năng',        environmentStability: 'VOLATILE' },
  { id: 10, name: 'Hội trường A',               environmentStability: 'STABLE' },
  { id: 11, name: 'Hội trường B',               environmentStability: 'STABLE' },
  { id: 12, name: 'Thư viện',                   environmentStability: 'STABLE' },
  { id: 13, name: 'Nhà Hành chính',             environmentStability: 'STABLE' },
  { id: 14, name: 'Trung tâm Nghiên cứu',       environmentStability: 'STABLE' },
  { id: 15, name: 'Khu Cơ sở Vật chất',         environmentStability: 'VOLATILE' },
];

export interface BuildingRequest {
  name: string;
  environmentStability: BuildingEnvironmentStability;
}

export const buildingApi = {
  getAll: () =>
    axiosClient
      .get<BuildingResponse[]>('/buildings')
      .then((r) => r.data)
      .catch(() => MOCK_BUILDINGS),
  create: (data: BuildingRequest) =>
    axiosClient.post<BuildingResponse>('/buildings', data).then((r) => r.data),
  update: (id: number, data: BuildingRequest) =>
    axiosClient.put<BuildingResponse>(`/buildings/${id}`, data).then((r) => r.data),
  delete: (id: number) => axiosClient.delete(`/buildings/${id}`),
};
