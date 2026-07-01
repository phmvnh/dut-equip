import axiosClient from './axiosClient';

export type DepartmentLoanStatus = 'ACTIVE' | 'RETURNED' | 'CANCELLED';

export interface DepartmentLoanResponse {
  id: number;
  code: string;
  equipmentId: number;
  equipmentCode: string;
  equipmentName: string;
  equipmentStatus: string;
  buildingName?: string;
  departmentName: string;
  contactPerson: string;
  contactPhone?: string;
  purpose?: string;
  approverName?: string;
  startDate: string;
  expectedReturnDate?: string;
  note?: string;
  requestFileUrl?: string;
  imageUrls?: string[];
  status: DepartmentLoanStatus;
  actualReturnDate?: string;
  conditionAtReturn?: string;
  createdById: number;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentLoanCreateRequest {
  equipmentId: number;
  departmentName: string;
  contactPerson: string;
  contactPhone?: string;
  purpose?: string;
  approverName?: string;
  startDate: string;
  expectedReturnDate?: string;
  note?: string;
  requestFileUrl?: string;
  imageUrls?: string[];
}

export interface DepartmentLoanReturnRequest {
  actualReturnDate: string;
  conditionAtReturn?: string;
  equipmentStatus: 'AVAILABLE' | 'MAINTENANCE' | 'BROKEN';
}

export const departmentLoanApi = {
  getAll: (status?: DepartmentLoanStatus) =>
    axiosClient
      .get<DepartmentLoanResponse[]>('/admin/department-loans', {
        params: status ? { status } : {},
      })
      .then((r) => r.data),

  getById: (id: number) =>
    axiosClient.get<DepartmentLoanResponse>(`/admin/department-loans/${id}`).then((r) => r.data),

  create: (data: DepartmentLoanCreateRequest) =>
    axiosClient.post<DepartmentLoanResponse>('/admin/department-loans', data).then((r) => r.data),

  returnLoan: (id: number, data: DepartmentLoanReturnRequest) =>
    axiosClient
      .put<DepartmentLoanResponse>(`/admin/department-loans/${id}/return`, data)
      .then((r) => r.data),

  cancel: (id: number) =>
    axiosClient
      .put<DepartmentLoanResponse>(`/admin/department-loans/${id}/cancel`)
      .then((r) => r.data),

  uploadImage: (file: File): Promise<{ url: string; name: string; size: number }> => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosClient
      .post<{ url: string; name: string; size: number }>('/uploads/dept-loan-file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  uploadRequestFile: (file: File): Promise<{ url: string; name: string; size: number }> => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosClient
      .post<{ url: string; name: string; size: number }>('/uploads/dept-loan-file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
};
