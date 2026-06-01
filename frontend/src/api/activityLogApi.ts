import axiosClient from './axiosClient';
import type { ActivityLogItem, ActivityPeriod } from '../types/activityLog';
import type { PageResponse } from '../types/notification';

export interface ActivityLogParams {
  period?: ActivityPeriod;
  keyword?: string;
  page?: number;
  size?: number;
}

export const activityLogApi = {
  list: (params: ActivityLogParams = {}) =>
    axiosClient
      .get<PageResponse<ActivityLogItem>>('/admin/activity-logs', { params })
      .then((r) => r.data),
};
