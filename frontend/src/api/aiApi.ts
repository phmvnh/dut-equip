import axiosClient from './axiosClient';

export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface AiPrediction {
  equipmentId: number;
  equipmentCode: string;
  equipmentName: string;
  equipTypeName: string;
  buildingName: string;
  riskLevel: RiskLevel;
  riskScore: number;
  daysToMaintenance: number | null;
  willFailIn7d: boolean;
  reason: string;
  lastMaintenanceText: string;
  generatedAt: string;
}

export interface AiRunResponse {
  status: string;
  message: string;
}

export const aiApi = {
  getPredictions: (params?: { risk?: RiskLevel; limit?: number }) =>
    axiosClient.get<AiPrediction[]>('/admin/ai/predictions', { params }).then((r) => r.data),

  runNow: () =>
    axiosClient.post<AiRunResponse>('/admin/ai/run').then((r) => r.data),
};
