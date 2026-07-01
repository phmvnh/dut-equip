// Khớp với DisposalResponse từ backend (/api/v1/disposals)
export type DisposalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
export type DisposalMethod = 'DESTROY' | 'SELL' | 'TRANSFER' | 'OTHER';

export const DISPOSAL_METHOD_LABELS: Record<DisposalMethod, string> = {
  DESTROY: 'Phá dỡ/hủy bỏ',
  SELL: 'Bán (đấu giá/chỉ định)',
  TRANSFER: 'Điều chuyển',
  OTHER: 'Hình thức khác',
};

export interface Disposal {
  id: number;
  code: string;
  equipmentId: number;
  equipmentCode: string;
  equipmentName: string;
  requestedByName: string;
  reason?: string;
  proposedMethod?: DisposalMethod;
  estimatedValue?: number;
  note?: string;
  status: DisposalStatus;
  decisionNo?: string;
  decisionDate?: string;
  approverName?: string;
  decisionFileUrl?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectReason?: string;
  actualMethod?: DisposalMethod;
  proceeds?: number;
  disposalDate?: string;
  completedAt?: string;
  createdAt: string;
}

export interface DisposalCreatePayload {
  equipmentId: number;
  reason: string;
  proposedMethod: DisposalMethod;
  estimatedValue?: number;
  note?: string;
}

export interface DisposalApprovePayload {
  decisionNo: string;
  decisionDate: string;   // YYYY-MM-DD
  approverName: string;
  decisionFileUrl?: string;
}

export interface DisposalCompletePayload {
  actualMethod: DisposalMethod;
  proceeds?: number;
  disposalDate: string;   // YYYY-MM-DD
}
