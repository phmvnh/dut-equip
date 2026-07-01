import axiosClient from './axiosClient';

export interface InventoryEventRequest {
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
}

export interface InventoryItemUpdateRequest {
  found: boolean;
  actualLocation?: string;
  actualCondition?: string;
  discrepancyNote?: string;
}

export interface InventoryItemInfo {
  id: number;
  equipmentId: number;
  equipmentCode: string;
  equipmentName: string;
  equipmentType: string;
  expectedLocation?: string;
  expectedStatus?: string;
  actualLocation?: string;
  actualCondition?: string;
  found: boolean;
  discrepancyNote?: string;
  checkedByName?: string;
  checkedAt?: string;
}

export interface InventoryEventResponse {
  id: number;
  code: string;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED';
  createdByName: string;
  totalItems: number;
  checkedItems: number;
  foundItems: number;
  createdAt: string;
  items?: InventoryItemInfo[];
}

export const inventoryApi = {
  getAll: () =>
    axiosClient.get<InventoryEventResponse[]>('/admin/inventory').then((r) => r.data),

  getById: (id: number) =>
    axiosClient.get<InventoryEventResponse>(`/admin/inventory/${id}`).then((r) => r.data),

  create: (data: InventoryEventRequest) =>
    axiosClient.post<InventoryEventResponse>('/admin/inventory', data).then((r) => r.data),

  start: (id: number) =>
    axiosClient.put<InventoryEventResponse>(`/admin/inventory/${id}/start`).then((r) => r.data),

  updateItem: (eventId: number, itemId: number, data: InventoryItemUpdateRequest) =>
    axiosClient
      .put<InventoryEventResponse>(`/admin/inventory/${eventId}/items/${itemId}`, data)
      .then((r) => r.data),

  complete: (id: number) =>
    axiosClient.put<InventoryEventResponse>(`/admin/inventory/${id}/complete`).then((r) => r.data),
};
