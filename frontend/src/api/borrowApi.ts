import axiosClient from './axiosClient';

export type PurposeType =
  | 'TEACHING'
  | 'PRACTICE'
  | 'CONFERENCE'
  | 'RESEARCH'
  | 'EXTRACURRICULAR'
  | 'OTHER';

export type DamageSeverity = 'LIGHT' | 'MEDIUM' | 'SEVERE';

export interface CreateBorrowRequest {
  equipmentId: number;
  buildingId: number;
  room: string;
  borrowDateTime: string;
  returnDateTime: string;
  purpose: PurposeType;
  purposeNote?: string;
  note?: string;
  confirmed: boolean;
  confirmedOverlap?: boolean;
}

export interface ReportDamageRequest {
  severity: DamageSeverity;
  description: string;
  imageUrls?: string[];
}

export type EquipmentSnapshotStatus = 'AVAILABLE' | 'BORROWED' | 'MAINTENANCE' | 'BROKEN';

export interface BorrowResponse {
  id: number;
  equipmentId: number;
  equipmentName: string;
  equipmentCode: string;
  // Snapshot trạng thái thiết bị tại lúc trả response — dùng để quyết định hiện nút "Tạo phiếu BT"
  equipmentStatus?: EquipmentSnapshotStatus;
  // Snapshot giá thiết bị — FE pre-fill số tiền bồi thường
  equipmentPurchasePrice?: number;
  userId: number;
  userName: string;
  userEmail: string;
  userPhone?: string;
  buildingName?: string;
  room?: string;
  borrowDateTime: string;
  returnDateTime: string;
  actualReturnDateTime?: string;
  purpose?: string;
  purposeNote?: string;
  note?: string;
  status: string;
  rejectReason?: string;
  preBorrowConditionNote?: string;
  createdAt: string;
  damageReported: boolean;
  damageSeverity?: DamageSeverity;
  damageDescription?: string;
  damageImageUrls?: string[];
  damageReportedAt?: string;
}

// Thông tin người đang mượn — để người khác biết và liên hệ khi cần
export interface CurrentBorrowerInfo {
  userName: string;
  userPhone?: string;
  buildingName?: string;
  room?: string;
  returnDateTime: string;
}

// Khung giờ đã đặt của 1 thiết bị — không kèm thông tin người mượn (privacy)
export interface EquipmentScheduleSlot {
  borrowDateTime: string;
  returnDateTime: string;
  status: 'PENDING' | 'APPROVED' | 'OVERDUE';
}

export type BorrowStatus = 'PENDING' | 'APPROVED' | 'RETURNED' | 'OVERDUE' | 'REJECTED' | 'CANCELLED';

export type EquipmentReturnStatus = 'AVAILABLE' | 'MAINTENANCE' | 'BROKEN';

export const borrowApi = {
  create: (data: CreateBorrowRequest) =>
    axiosClient.post<BorrowResponse>('/borrows', data).then((r) => r.data),

  getMy: () =>
    axiosClient.get<BorrowResponse[]>('/borrows/my').then((r) => r.data),

  getAll: (status?: BorrowStatus) =>
    axiosClient
      .get<BorrowResponse[]>('/borrows', { params: status ? { status } : {} })
      .then((r) => r.data),

  // preBorrowConditionNote bắt buộc (BE validate NotBlank) — admin ghi tình trạng khi bàn giao
  approve: (id: number, preBorrowConditionNote: string) =>
    axiosClient
      .put<BorrowResponse>(`/borrows/${id}/approve`, { preBorrowConditionNote })
      .then((r) => r.data),

  reject: (id: number, reason: string) =>
    axiosClient.put<BorrowResponse>(`/borrows/${id}/reject`, { reason }).then((r) => r.data),

  // equipmentStatus chỉ áp dụng khi đơn có cờ damageReported. Đơn thường: bỏ qua, BE ép AVAILABLE.
  confirmReturn: (id: number, equipmentStatus?: EquipmentReturnStatus) =>
    axiosClient
      .put<BorrowResponse>(`/borrows/${id}/return`, equipmentStatus ? { equipmentStatus } : {})
      .then((r) => r.data),

  cancel: (id: number) =>
    axiosClient.put<BorrowResponse>(`/borrows/${id}/cancel`).then((r) => r.data),

  // Admin only — trả null nếu thiết bị không có đơn APPROVED/OVERDUE (BE trả 204)
  getActiveByEquipment: (equipmentId: number): Promise<BorrowResponse | null> =>
    axiosClient
      .get<BorrowResponse | ''>(`/borrows/active-by-equipment/${equipmentId}`)
      .then((r) => (r.status === 204 || !r.data ? null : (r.data as BorrowResponse))),

  // Mọi user đăng nhập — ai đang mượn thiết bị (chỉ tên + phòng + hạn trả, không kèm PII)
  getCurrentBorrower: (equipmentId: number): Promise<CurrentBorrowerInfo | null> =>
    axiosClient
      .get<CurrentBorrowerInfo | ''>(`/borrows/current-borrower/${equipmentId}`)
      .then((r) => (r.status === 204 || !r.data ? null : (r.data as CurrentBorrowerInfo))),

  // Mọi user đăng nhập — các khung giờ đã đặt (PENDING/APPROVED/OVERDUE) của thiết bị
  getScheduleByEquipment: (equipmentId: number): Promise<EquipmentScheduleSlot[]> =>
    axiosClient
      .get<EquipmentScheduleSlot[]>(`/borrows/schedule-by-equipment/${equipmentId}`)
      .then((r) => r.data),

  reportDamage: (id: number, payload: ReportDamageRequest) =>
    axiosClient.post<BorrowResponse>(`/borrows/${id}/report-damage`, payload).then((r) => r.data),

  uploadDamageImage: (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosClient
      .post<{ url: string }>('/uploads/damage-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data.url);
  },
};
