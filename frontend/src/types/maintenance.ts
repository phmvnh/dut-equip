export type MaintenanceStatus = 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type MaintenanceEquipmentStatus = 'AVAILABLE' | 'BORROWED' | 'MAINTENANCE' | 'BROKEN';

export interface MaintenanceLog {
  id: number;
  code: string;
  equipmentId: number;
  equipmentCode: string;
  equipmentName: string;
  equipmentImageUrl?: string;
  equipmentBuildingId?: number;
  equipmentBuildingName?: string;
  equipmentStatus: MaintenanceEquipmentStatus;
  technicianName?: string;
  startDate: string;   // YYYY-MM-DD
  endDate?: string;    // YYYY-MM-DD
  description: string;
  cost?: number;
  status: MaintenanceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceCreatePayload {
  equipmentId: number;
  technicianName?: string;
  startDate: string;
  endDate?: string;
  description: string;
  cost?: number;
}

export type MaintenanceUpdatePayload = Omit<MaintenanceCreatePayload, 'equipmentId'>;

export interface MaintenanceListParams {
  status?: MaintenanceStatus;
  equipmentId?: number;
  keyword?: string;
}
