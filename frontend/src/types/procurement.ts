// Khớp với ProcurementResponse từ backend (/api/v1/procurements)
export type ProcurementStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';

export interface ProcurementItem {
  id: number;
  equipTypeId: number;
  equipTypeName: string;
  name: string;
  specifications?: string;
  quantity: number;
  unitPrice?: number;
  warrantyMonths?: number;
  usefulLifeYears?: number;
  targetBuildingId: number;
  targetBuildingName: string;
  receivedCodes?: string[];
}

export interface Procurement {
  id: number;
  code: string;
  title: string;
  requestedByName: string;
  reason?: string;
  supplier?: string;
  note?: string;
  status: ProcurementStatus;
  decisionNo?: string;
  decisionDate?: string;
  approverName?: string;
  decisionFileUrl?: string;
  approvedByName?: string;
  approvedAt?: string;
  rejectReason?: string;
  completedAt?: string;
  totalItems: number;
  totalQuantity: number;
  estimatedTotal?: number;
  createdAt: string;
  items?: ProcurementItem[];
}

export interface ProcurementItemPayload {
  equipTypeId: number;
  name: string;
  specifications?: string;
  quantity: number;
  unitPrice?: number;
  warrantyMonths?: number;
  usefulLifeYears?: number;
  targetBuildingId: number;
}

export interface ProcurementCreatePayload {
  title: string;
  reason?: string;
  supplier?: string;
  note?: string;
  items: ProcurementItemPayload[];
}

export interface ProcurementApprovePayload {
  decisionNo: string;
  decisionDate: string;   // YYYY-MM-DD
  approverName: string;
  decisionFileUrl?: string;
}
