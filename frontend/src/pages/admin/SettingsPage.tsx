import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingApi, type SettingRequest } from '../../api/settingApi';
import { useToastStore } from '../../store/toastStore';

const EMPTY: SettingRequest = {
  maxBorrowDays: 7,
  maxConcurrent: 5,
  defaultPassword: 'Dut@12345',
  contactEmail: 'phongthietbi@dut.udn.vn',
  contactPhone: '0236.3842.414',
  workingHours: '7:30 - 17:00 (Thứ 2 - Thứ 6)',
};

const INPUT_CLASS = 'w-full px-3 py-2 text-sm rounded-lg outline-none focus:border-blue-500';
const INPUT_STYLE = { border: '1px solid #e5e7eb' };

export default function SettingsPage() {
  const qc = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const [form, setForm] = useState<SettingRequest>(EMPTY);

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingApi.get,
  });

  useEffect(() => {
    if (data) {
      setForm({
        maxBorrowDays: data.maxBorrowDays,
        maxConcurrent: data.maxConcurrent,
        defaultPassword: data.defaultPassword,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        workingHours: data.workingHours,
      });
    }
  }, [data]);

  const updateMut = useMutation({
    mutationFn: settingApi.update,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      toast('Đã lưu cài đặt');
    },
    onError: (e: any) => {
      toast(e.response?.data?.message ?? 'Có lỗi xảy ra', 'error');
    },
  });

  const update = <K extends keyof SettingRequest>(key: K, value: SettingRequest[K]) =>
    setForm((s) => ({ ...s, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMut.mutate(form);
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl">
        <p className="text-sm text-gray-400">Đang tải cài đặt...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        <section
          className="bg-white p-6 space-y-5"
          style={{ border: '1px solid #e5e7eb', borderRadius: 10 }}
        >
          <h2 className="text-base font-semibold">Quy định mượn trả</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Số ngày mượn tối đa</label>
              <input
                type="number"
                min={1}
                value={form.maxBorrowDays === 0 ? '' : form.maxBorrowDays}
                onChange={(e) => update('maxBorrowDays', e.target.value === '' ? 0 : Number(e.target.value))}
                className={INPUT_CLASS}
                style={INPUT_STYLE}
              />
              <p className="text-xs text-gray-500 mt-1">Áp dụng khi giảng viên tạo đơn mượn mới</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Số đơn đồng thời</label>
              <input
                type="number"
                min={1}
                value={form.maxConcurrent === 0 ? '' : form.maxConcurrent}
                onChange={(e) => update('maxConcurrent', e.target.value === '' ? 0 : Number(e.target.value))}
                className={INPUT_CLASS}
                style={INPUT_STYLE}
              />
              <p className="text-xs text-gray-500 mt-1">Tổng số đơn APPROVED của một giảng viên</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Mật khẩu mặc định</label>
            <input
              type="text"
              value={form.defaultPassword}
              onChange={(e) => update('defaultPassword', e.target.value)}
              className={INPUT_CLASS}
              style={INPUT_STYLE}
            />
            <p className="text-xs text-gray-500 mt-1">Mật khẩu cấp cho tài khoản mới</p>
          </div>
        </section>

        <section
          className="bg-white p-6 space-y-5"
          style={{ border: '1px solid #e5e7eb', borderRadius: 10 }}
        >
          <h2 className="text-base font-semibold">Thông tin liên hệ phòng thiết bị</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email phòng thiết bị</label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={(e) => update('contactEmail', e.target.value)}
                placeholder="phongthietbi@dut.udn.vn"
                className={INPUT_CLASS}
                style={INPUT_STYLE}
              />
              <p className="text-xs text-gray-500 mt-1">Email hiển thị cho giảng viên khi cần liên hệ</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Số điện thoại</label>
              <input
                type="tel"
                value={form.contactPhone}
                onChange={(e) => update('contactPhone', e.target.value)}
                className={INPUT_CLASS}
                style={INPUT_STYLE}
              />
              <p className="text-xs text-gray-500 mt-1">Hotline phòng thiết bị</p>
            </div>
          </div>


          <div>
            <label className="block text-sm font-medium mb-1.5">Giờ làm việc</label>
            <input
              type="text"
              value={form.workingHours}
              onChange={(e) => update('workingHours', e.target.value)}
              placeholder="7:30 - 17:00 (Thứ 2 - Thứ 7)"
              className={INPUT_CLASS}
              style={INPUT_STYLE}
            />
            <p className="text-xs text-gray-500 mt-1">Giờ phòng thiết bị tiếp nhận giao - nhận</p>
          </div>

        </section>

        <button
          type="submit"
          disabled={updateMut.isPending}
          className="w-full py-2.5 text-sm font-medium bg-blue-100 text-blue-800 border border-blue-300 rounded-lg hover:bg-blue-200 disabled:opacity-60"
        >
          {updateMut.isPending ? 'Đang lưu...' : 'Lưu cài đặt'}
        </button>
      </form>
    </div>
  );
}
