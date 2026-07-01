import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Equipment } from '../../types/equipment';
import { equipApi } from '../../api/equipApi';
import { borrowApi } from '../../api/borrowApi';
import { statusConfig, statusDotColor } from '../../utils/statusConfig';
import EquipmentScheduleList from '../EquipmentScheduleList';

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-400 w-28 shrink-0">{label}</span>
      <span className="text-sm text-gray-700 font-medium flex-1">{value}</span>
    </div>
  );
}

/**
 * Nội dung chi tiết thiết bị cho mobile — đặt trong MobileSheet.
 * Trả về { body, footer } để host (MobileHomePage) lắp vào sheet.
 */
export function useEquipDetailContent(equipment: Equipment, onBorrow: (e: Equipment) => void) {
  const { data: detail } = useQuery({
    queryKey: ['equip-detail', equipment.id],
    queryFn: () => equipApi.getById(equipment.id),
  });

  const { data: currentBorrower } = useQuery({
    queryKey: ['equip-current-borrower', equipment.id],
    queryFn: () => borrowApi.getCurrentBorrower(equipment.id),
    enabled: equipment.status === 'BORROWED',
  });

  const extraImages = detail?.images ?? equipment.images ?? [];
  const images = useMemo(() => {
    const arr: string[] = [];
    if (equipment.mainImageUrl) arr.push(equipment.mainImageUrl);
    for (const img of extraImages) arr.push(img.url);
    return arr;
  }, [equipment.mainImageUrl, extraImages]);

  const { label } = statusConfig[equipment.status];
  // Cho mượn cả khi đang BORROWED (đặt khung giờ trống tương lai); BE chặn nếu trùng giờ.
  const canBorrow = equipment.status === 'AVAILABLE' || equipment.status === 'BORROWED';
  const formattedPrice = equipment.purchasePrice
    ? Number(equipment.purchasePrice).toLocaleString('vi-VN') + ' ₫'
    : null;

  const body = (
    <div className="px-5 py-4">
      {/* Gallery ngang cuộn */}
      <div className="-mx-5 px-5 mb-4">
        {images.length > 0 ? (
          <div className="flex gap-2.5 overflow-x-auto overscroll-x-contain snap-x snap-mandatory pb-1">
            {images.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={equipment.name}
                className="snap-center shrink-0 w-[78%] aspect-[4/3] object-cover rounded-2xl bg-gray-100"
              />
            ))}
          </div>
        ) : (
          <div className="w-full aspect-[4/3] rounded-2xl bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
            <svg className="w-16 h-16 text-blue-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <rect x="2" y="3" width="20" height="14" rx="2.5" />
              <path strokeLinecap="round" d="M8 21h8M12 17v4" />
            </svg>
          </div>
        )}
      </div>

      <h2 className="text-[20px] font-bold text-ink leading-snug tracking-[-0.015em] text-balance">{equipment.name}</h2>
      <div className="flex items-center gap-2 mt-1.5 mb-4">
        <span className="text-sm text-gray-400 tabular-nums">{equipment.code}</span>
        <span className="text-gray-300">·</span>
        <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
          <span className={`w-1.5 h-1.5 rounded-full ${statusDotColor[equipment.status]}`} />
          {label}
        </span>
      </div>

      <div className="bg-gray-50 rounded-2xl px-3.5 py-1 mb-4">
        <InfoRow label="Loại thiết bị" value={equipment.equipTypeName} />
        <InfoRow label="Vị trí" value={equipment.buildingName} />
        {formattedPrice && <InfoRow label="Giá trị" value={<span className="tabular-nums">{formattedPrice}</span>} />}
      </div>

      {equipment.description && (
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Mô tả</h4>
          <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{equipment.description}</p>
        </div>
      )}

      {equipment.specifications?.trim() && (
        <div className="mb-2">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Thông số kỹ thuật</h4>
          <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{equipment.specifications}</p>
        </div>
      )}

      {currentBorrower && (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl px-3.5 py-3 mb-4">
          <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <div className="text-xs text-amber-800 leading-relaxed">
            <span className="font-semibold">{currentBorrower.userName}</span>
            {' '}đang mượn thiết bị này
            {currentBorrower.userPhone && <span> · <span className="font-semibold">{currentBorrower.userPhone}</span></span>}
            {currentBorrower.room && <span> · tại {currentBorrower.room}</span>}
            <span className="block">
              Hạn trả:{' '}
              <span className="font-semibold">
                {new Date(currentBorrower.returnDateTime).toLocaleString('vi-VN', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
            </span>
          </div>
        </div>
      )}

      {/* Các khung giờ đã có người đặt — giúp người mượn chọn khung giờ trống */}
      {equipment.status !== 'DISPOSED' && (
        <EquipmentScheduleList equipmentId={equipment.id} className="mt-4" />
      )}
    </div>
  );

  const footer = (
    <button
      onClick={() => canBorrow && onBorrow(equipment)}
      disabled={!canBorrow}
      className={`w-full h-12 rounded-full text-[15px] font-semibold transition ${
        canBorrow ? 'bg-action text-white active:bg-action-press active:scale-[0.98]' : 'bg-gray-100 text-gray-400'
      }`}
    >
      {canBorrow ? 'Mượn thiết bị này' : 'Thiết bị không khả dụng'}
    </button>
  );

  return { body, footer };
}
