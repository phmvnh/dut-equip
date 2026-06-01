import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { equipApi } from '../api/equipApi';
import StatusPill from '../components/StatusPill';

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-wider text-gray-400 font-medium">{label}</span>
      <span className="text-sm text-gray-800 font-medium break-words">{value}</span>
    </div>
  );
}

export default function EquipmentQrViewPage() {
  const { code = '' } = useParams<{ code: string }>();

  const { data: equipment, isLoading, isError } = useQuery({
    queryKey: ['equip-by-code', code],
    queryFn: () => equipApi.getByCode(code),
    enabled: !!code,
    retry: false,
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header tối giản — không có Navbar */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
            DUT
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-gray-900 leading-tight">DUT Equip</h1>
            <p className="text-[11px] text-gray-500 leading-tight">Hệ thống quản lý thiết bị · ĐH Bách Khoa Đà Nẵng</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-md w-full mx-auto px-4 py-5">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <svg className="w-8 h-8 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
            </svg>
            <p className="text-sm text-gray-400">Đang tải thông tin thiết bị...</p>
          </div>
        )}

        {isError && (
          <div className="bg-white rounded-2xl border border-gray-200 px-6 py-10 text-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12 text-gray-300 mx-auto mb-3">
              <circle cx="12" cy="12" r="9" />
              <path strokeLinecap="round" d="M9 9l6 6M15 9l-6 6" />
            </svg>
            <p className="text-base font-semibold text-gray-700 mb-1">Không tìm thấy thiết bị</p>
            <p className="text-sm text-gray-500">Mã <span className="font-mono">{code}</span> không tồn tại trong hệ thống.</p>
          </div>
        )}

        {equipment && (
          <div className="space-y-4">
            {/* Banner cảnh báo nếu đã ngừng dùng */}
            {(equipment.status === 'DISPOSED' || equipment.hidden) && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-800">
                Thiết bị này đã ngừng sử dụng trong hệ thống.
              </div>
            )}

            {/* Ảnh + tên */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-br from-slate-50 to-gray-100 aspect-[4/3] flex items-center justify-center overflow-hidden">
                {equipment.mainImageUrl ? (
                  <img src={equipment.mainImageUrl} alt={equipment.name} className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-20 h-20 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                    <rect x="2" y="3" width="20" height="14" rx="2.5" />
                    <path strokeLinecap="round" d="M8 21h8M12 17v4" />
                  </svg>
                )}
              </div>
              <div className="px-4 py-3">
                <h2 className="text-lg font-semibold text-gray-900 leading-snug mb-1">{equipment.name}</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-mono text-gray-600">{equipment.code}</span>
                  <StatusPill status={equipment.status} />
                </div>
              </div>
            </div>

            {/* Thông tin */}
            <div className="bg-white rounded-2xl border border-gray-200 px-4 py-4">
              <h3 className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-3">Thông tin</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <InfoRow label="Loại thiết bị" value={equipment.equipTypeName} />
                <InfoRow label="Vị trí" value={equipment.buildingName} />
                {equipment.purchasePrice != null && (
                  <InfoRow
                    label="Giá trị"
                    value={Number(equipment.purchasePrice).toLocaleString('vi-VN') + ' ₫'}
                  />
                )}
                {equipment.warrantyUntil && (
                  <InfoRow
                    label="Bảo hành đến"
                    value={new Date(equipment.warrantyUntil).toLocaleDateString('vi-VN')}
                  />
                )}
              </div>
            </div>

            {/* Mô tả */}
            {equipment.description && (
              <div className="bg-white rounded-2xl border border-gray-200 px-4 py-4">
                <h3 className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">Mô tả</h3>
                <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{equipment.description}</p>
              </div>
            )}

            {/* Thông số */}
            {equipment.specifications && equipment.specifications.trim() && (
              <div className="bg-white rounded-2xl border border-gray-200 px-4 py-4">
                <h3 className="text-xs uppercase tracking-wider text-gray-400 font-semibold mb-2">Thông số kỹ thuật</h3>
                <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{equipment.specifications}</p>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="px-4 py-4 text-center text-[11px] text-gray-400">
        Truy cập qua QR · Không cần đăng nhập ·{' '}
        <Link to="/" className="text-blue-500 hover:underline">Trang chủ</Link>
      </footer>
    </div>
  );
}
