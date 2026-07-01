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
  generatedAtEpochMillis?: number;
}

export interface AiRunResponse {
  status: string;
  message: string;
}

export interface AiJobSummary {
  run_id?: string;
  status: string;
  trigger_source?: string;
  full_sweep?: boolean;
  started_at?: string;
  finished_at?: string | null;
  n_total?: number;
  n_llm?: number;
  n_llm_calls?: number;
  n_rule_low?: number;
  n_skipped?: number;
  n_failed?: number;
  n_chunks?: number;
  n_chunks_failed?: number;
  error_rate?: number | null;
  error_message?: string | null;
  message?: string;
}

export const aiApi = {
  getPredictions: (params?: { risk?: RiskLevel; limit?: number }) =>
    axiosClient.get<AiPrediction[]>('/admin/ai/predictions', { params }).then((r) => r.data),

  runNow: () =>
    axiosClient.post<AiRunResponse>('/admin/ai/run').then((r) => r.data),

  getLatestJob: () =>
    axiosClient.get<AiJobSummary>('/admin/ai/jobs/latest').then((r) => r.data),
};
