export type EquipmentStatus = 'AVAILABLE' | 'BORROWED' | 'MAINTENANCE' | 'BROKEN' | 'DISPOSED';

export interface EquipmentImage {
  id: number;
  url: string;
}

// Khớp với EquipResponse từ backend (/api/v1/equips)
export interface Equipment {
  id: number;
  code: string;
  name: string;
  equipTypeId: number;
  equipTypeName: string;
  buildingId: number;
  buildingName: string;
  status: EquipmentStatus;
  specifications?: string;
  description?: string;
  mainImageUrl?: string;
  // Danh sách ảnh phụ — chỉ có dữ liệu khi gọi getById/getByCode hoặc sau upload/xóa ảnh phụ
  images?: EquipmentImage[];
  purchasePrice?: number;
  warrantyUntil?: string; // YYYY-MM-DD
  // Cờ ẩn khỏi HomePage — orthogonal với status, Admin set qua nút Ẩn/Hiện
  hidden?: boolean;
  // Thông tin thanh lý — chỉ có khi status = DISPOSED
  disposalReason?: string;
  disposalDate?: string;  // YYYY-MM-DD
  disposalValue?: number;
  createdAt?: string;
  updatedAt?: string;
  // Số lượt sử dụng — đếm đơn APPROVED + OVERDUE + RETURNED
  usageCount?: number;
}

export interface FilterParams {
  equipTypeId?: number;
  buildingId?: number;
  status?: EquipmentStatus;
}
