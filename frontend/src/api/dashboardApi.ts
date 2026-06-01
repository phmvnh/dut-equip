import axiosClient from './axiosClient';
import type { ActivityLogItem } from '../types/activityLog';

export interface DashboardStats {
  total: number;
  available: number;
  borrowed: number;
  maintenance: number;
  broken: number;
  newThisMonth: number;
  overdueCount: number;
  nearOverdue: number;
}

export interface BorrowTrendPoint {
  label: string;
  count: number;
}

export type TrendMode = 'day' | 'week' | 'month';

export type PurposeKey =
  | 'TEACHING'
  | 'PRACTICE'
  | 'RESEARCH'
  | 'CONFERENCE'
  | 'EXTRACURRICULAR'
  | 'OTHER';

export interface PurposeStats {
  purpose: PurposeKey;
  count: number;
}

export interface BuildingStats {
  buildingId: number;
  name: string;
  count: number;
}

export const dashboardApi = {
  getStats: () =>
    axiosClient.get<DashboardStats>('/admin/dashboard/stats').then((r) => r.data),

  getBorrowTrend: (mode: TrendMode) =>
    axiosClient
      .get<BorrowTrendPoint[]>('/admin/dashboard/borrow-trend', { params: { mode } })
      .then((r) => r.data),

  getBorrowByPurpose: (months = 12) =>
    axiosClient
      .get<PurposeStats[]>('/admin/dashboard/borrow-by-purpose', { params: { months } })
      .then((r) => r.data),

  getEquipmentByBuilding: () =>
    axiosClient.get<BuildingStats[]>('/admin/dashboard/equipment-by-building').then((r) => r.data),

  getRecentActivities: (limit = 10) =>
    axiosClient
      .get<ActivityLogItem[]>('/admin/dashboard/recent-activities', { params: { limit } })
      .then((r) => r.data),
};
