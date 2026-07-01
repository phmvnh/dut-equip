import axiosClient from './axiosClient';

// Upload chung cho ảnh scan quyết định/tờ trình đã ký (mua sắm & thanh lý)
export const uploadApi = {
  uploadDecisionFile: (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosClient
      .post<{ url: string }>('/uploads/decision-file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data.url);
  },
};
