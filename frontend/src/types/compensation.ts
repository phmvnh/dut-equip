export type CompensationStatus = 'PENDING' | 'PAID' | 'CANCELLED';

export type ComplaintStatus = 'PENDING_REVIEW' | 'ACCEPTED' | 'REJECTED' | 'ADJUSTED';

export interface Compensation {
  id: number;
  code: string;
  borrowId: number;
  userId: number;
  userName: string;
  userEmail: string;
  userPhone?: string;
  userFaculty?: string;
  equipmentId: number;
  equipmentCode: string;
  equipmentName: string;
  equipmentImageUrl?: string;
  buildingName?: string;
  borrowDateTime?: string;
  actualReturnDateTime?: string;
  amount: number;
  reason: string;
  preBorrowConditionNote?: string;
  damageDescription?: string;
  status: CompensationStatus;
  paidAt?: string;
  paymentProofUrl?: string;
  paymentProofSubmittedAt?: string;
  createdAt: string;
  updatedAt: string;

  hasComplaint: boolean;
  complaintReason?: string;
  complaintImageUrls?: string[];
  complaintCreatedAt?: string;
  complaintStatus?: ComplaintStatus;
  complaintResolvedAt?: string;
  complaintResolution?: string;
}

export interface CompensationCreatePayload {
  borrowId: number;
  amount: number;
  reason: string;
}

export interface ComplaintCreatePayload {
  reason: string;
  imageUrls?: string[];
}

export type ComplaintResolveAction = 'ACCEPT' | 'REJECT' | 'ADJUST';

export interface ComplaintResolvePayload {
  action: ComplaintResolveAction;
  newAmount?: number;
  note?: string;
}

export interface CompensationListParams {
  status?: CompensationStatus;
  userId?: number;
}
