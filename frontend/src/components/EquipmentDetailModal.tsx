import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Equipment } from '../types/equipment';
import { useAuthStore } from '../store/authStore';
import { equipApi } from '../api/equipApi';
import { borrowApi } from '../api/borrowApi';
import StatusPill from './StatusPill';
import EquipmentScheduleList from './EquipmentScheduleList';

interface Props {
  equipment: Equipment;
  onClose: () => void;
  onBorrow?: (equipment: Equipment) => void;
  onEdit?: (equipment: Equipment) => void;
  onDelete?: (equipment: Equipment) => void;
  onCreateMaintenance?: (equipment: Equipment) => void;
  onToggleHidden?: (equipment: Equipment) => void;
  onDispose?: (equipment: Equipment) => void;
  onShowQr?: (equipment: Equipment) => void;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-400 w-32 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-700 font-medium flex-1">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">{title}</h4>
      <div className="bg-gray-50 rounded-xl px-3 py-1">{children}</div>
    </div>
  );
}

export default function EquipmentDetailModal({ equipment, onClose, onBorrow, onEdit, onDelete, onCreateMaintenance, onToggleHidden, onDispose, onShowQr }: Props) {
  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN');

  // List view không trả `images` → fetch chi tiết để lấy ảnh phụ
  const { data: detail } = useQuery({
    queryKey: ['equip-detail', equipment.id],
    queryFn: () => equipApi.getById(equipment.id),
  });
  const extraImages = detail?.images ?? equipment.images ?? [];

  // Admin xem thiết bị đang BORROWED → fetch đơn active để biết phòng/người mượn
  const isBorrowed = equipment.status === 'BORROWED';
  const { data: activeBorrow } = useQuery({
    queryKey: ['equip-active-borrow', equipment.id],
    queryFn: () => borrowApi.getActiveByEquipment(equipment.id),
    enabled: isAdmin && isBorrowed,
  });

  // Gộp ảnh chính + ảnh phụ thành 1 gallery, ảnh chính luôn đầu tiên
  const allImages = useMemo(() => {
    const arr: { url: string; key: string }[] = [];
    if (equipment.mainImageUrl) arr.push({ url: equipment.mainImageUrl, key: 'main' });
    for (const img of extraImages) arr.push({ url: img.url, key: `e-${img.id}` });
    return arr;
  }, [equipment.mainImageUrl, extraImages]);

  const totalImages = allImages.length;
  const [activeIdx, setActiveIdx] = useState(0);
  // Clamp khi ảnh phụ tải xong làm tổng số thay đổi
  const safeIdx = totalImages === 0 ? 0 : Math.min(activeIdx, totalImages - 1);
  const currentImage = allImages[safeIdx];

  const [zoomed, setZoomed] = useState(false);

  const goPrev = () => setActiveIdx((i) => (totalImages === 0 ? 0 : (i - 1 + totalImages) % totalImages));
  const goNext = () => setActiveIdx((i) => (totalImages === 0 ? 0 : (i + 1) % totalImages));

  // Cho mượn cả khi đang BORROWED (đặt khung giờ trống tương lai); BE chặn nếu trùng giờ.
  const canBorrow = !isAdmin && (equipment.status === 'AVAILABLE' || equipment.status === 'BORROWED');
  const isAdminMode = !!(onEdit || onDelete || onCreateMaintenance || onToggleHidden || onDispose || onShowQr);
  // BE từ chối tạo phiếu BT khi thiết bị đang BORROWED
  const canCreateMaintenance = equipment.status !== 'BORROWED' && equipment.status !== 'DISPOSED';
  const isDisposed = equipment.status === 'DISPOSED';
  const canDispose = !isDisposed && equipment.status !== 'BORROWED';
  // Không cho ẩn thiết bị BORROWED/DISPOSED (BE cũng chặn)
  const canToggleHidden = equipment.status !== 'BORROWED' && !isDisposed;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (zoomed) setZoomed(false);
        else onClose();
      } else if (totalImages > 1) {
        if (e.key === 'ArrowLeft') goPrev();
        else if (e.key === 'ArrowRight') goNext();
      }
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose, zoomed, totalImages]);

  const formattedPrice = equipment.purchasePrice
    ? Number(equipment.purchasePrice).toLocaleString('vi-VN') + ' ₫'
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1.5">
              <h2 className="text-lg font-semibold text-gray-900 leading-snug line-clamp-2">
                {equipment.name}
              </h2>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-700">{equipment.code}</span>
              <StatusPill status={equipment.status} />
              {equipment.hidden && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600 border border-gray-200">
                  Đã ẩn khỏi HomePage
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Top row — image + general/purchase info */}
          <div className="flex gap-5">
            <div className="shrink-0 w-56">
              <div className="relative bg-gradient-to-br from-blue-50 to-slate-100 rounded-xl aspect-[4/3] flex items-center justify-center overflow-hidden ring-1 ring-gray-100 shadow-sm">
                {currentImage ? (
                  <img
                    src={currentImage.url}
                    alt={equipment.name}
                    className="w-full h-full object-contain cursor-zoom-in"
                    onClick={() => setZoomed(true)}
                  />
                ) : (
                  <svg
                    className="w-20 h-20 text-blue-200"
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"
                  >
                    <rect x="2" y="3" width="20" height="14" rx="2.5" />
                    <path strokeLinecap="round" d="M8 21h8M12 17v4" />
                  </svg>
                )}

                {totalImages > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); goPrev(); }}
                      className="absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/85 hover:bg-white text-gray-700 flex items-center justify-center shadow-sm"
                      aria-label="Ảnh trước"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); goNext(); }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/85 hover:bg-white text-gray-700 flex items-center justify-center shadow-sm"
                      aria-label="Ảnh sau"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[11px] font-medium text-white bg-black/55 px-1.5 py-0.5 rounded-full tabular-nums">
                      {safeIdx + 1} / {totalImages}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              {isAdmin && isBorrowed && activeBorrow && (
                <Section title="Đang được mượn">
                  <InfoRow
                    label="Phòng"
                    value={
                      activeBorrow.room 
                        ? <>
                            {activeBorrow.room && <span>{activeBorrow.room}</span>}
                          </>
                        : <span className="text-gray-400">—</span>
                    }
                  />
                  <InfoRow label="Người mượn" value={activeBorrow.userName} />
                  <InfoRow
                    label="Hạn trả"
                    value={new Date(activeBorrow.returnDateTime).toLocaleString('vi-VN', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  />
                </Section>
              )}

              <Section title="Thông tin chung">
                <InfoRow label="Loại thiết bị" value={equipment.equipTypeName} />
                <InfoRow label="Vị trí hiện trại" value={equipment.buildingName} />
                {isAdmin && (
                  <InfoRow
                    label="Lượt sử dụng"
                    value={<span className="tabular-nums">{equipment.usageCount ?? 0}</span>}
                  />
                )}
              </Section>
            </div>
          </div>

          {/* Bottom — description + specifications (full width) */}
          {equipment.description && (
            <Section title="Mô tả">
              <div className="py-2.5 text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                {equipment.description}
              </div>
            </Section>
          )}

          {equipment.specifications && equipment.specifications.trim() && (
            <Section title="Thông số kỹ thuật">
              <div className="py-2.5 text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                {equipment.specifications}
              </div>
            </Section>
          )}

          {(formattedPrice || equipment.warrantyUntil) && (
            <Section title="Thông tin mua sắm">
              {formattedPrice && <InfoRow label="Giá trị" value={formattedPrice} />}
              {equipment.warrantyUntil && (
                <InfoRow
                  label="Bảo hành đến"
                  value={new Date(equipment.warrantyUntil).toLocaleDateString('vi-VN')}
                />
              )}
            </Section>
          )}

          {isDisposed && (
            <Section title="Thông tin thanh lý">
              {equipment.disposalDate && (
                <InfoRow
                  label="Ngày thanh lý"
                  value={new Date(equipment.disposalDate).toLocaleDateString('vi-VN')}
                />
              )}
              {equipment.disposalValue != null && (
                <InfoRow
                  label="Giá trị thu hồi"
                  value={Number(equipment.disposalValue).toLocaleString('vi-VN') + ' ₫'}
                />
              )}
              {equipment.disposalReason && (
                <InfoRow
                  label="Lý do"
                  value={<span className="whitespace-pre-line">{equipment.disposalReason}</span>}
                />
              )}
            </Section>
          )}

          {/* Các khung giờ đã có người đặt — giúp người mượn chọn khung giờ trống */}
          {!isAdminMode && !isDisposed && (
            <EquipmentScheduleList equipmentId={equipment.id} className="mt-1" />
          )}
        </div>

        {/* Footer — bỏ nút "Đóng" vì đã có X góc phải */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          {isAdminMode ? (
            <>
              {onDelete && (
                <button
                  onClick={() => onDelete(equipment)}
                  className="h-9 px-5 rounded-lg text-sm font-semibold bg-red-100 text-red-700 border border-red-300 hover:bg-red-200 transition-all"
                >
                  Xóa
                </button>
              )}
              {onToggleHidden && !isDisposed && (
                <button
                  onClick={() => canToggleHidden && onToggleHidden(equipment)}
                  disabled={!canToggleHidden}
                  title={!canToggleHidden ? 'Không thể ẩn thiết bị đang được mượn' : undefined}
                  className={`h-9 px-5 rounded-lg text-sm font-semibold border transition-all ${
                    canToggleHidden
                      ? 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                      : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  }`}
                >
                  {equipment.hidden ? 'Hiển thị lại' : 'Ẩn thiết bị'}
                </button>
              )}
              {onDispose && !isDisposed && (
                <button
                  onClick={() => canDispose && onDispose(equipment)}
                  disabled={!canDispose}
                  title={!canDispose ? 'Không thể thanh lý thiết bị đang được mượn' : undefined}
                  className={`h-9 px-5 rounded-lg text-sm font-semibold border transition-all ${
                    canDispose
                      ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                      : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  }`}
                >
                  Thanh lý
                </button>
              )}
              {onCreateMaintenance && !isDisposed && (
                <button
                  onClick={() => canCreateMaintenance && onCreateMaintenance(equipment)}
                  disabled={!canCreateMaintenance}
                  title={!canCreateMaintenance ? 'Không thể tạo phiếu bảo trì khi thiết bị đang được mượn' : undefined}
                  className={`h-9 px-5 rounded-lg text-sm font-semibold border transition-all ${
                    canCreateMaintenance
                      ? 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
                      : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  }`}
                >
                  Tạo phiếu BT
                </button>
              )}
              {onShowQr && (
                <button
                  onClick={() => onShowQr(equipment)}
                  className="h-9 px-5 rounded-lg text-sm font-semibold bg-purple-100 text-purple-700 border border-purple-300 hover:bg-purple-200 transition-all"
                >
                  Tải QR
                </button>
              )}
              {onEdit && !isDisposed && (
                <button
                  onClick={() => onEdit(equipment)}
                  className="h-9 px-5 rounded-lg text-sm font-semibold bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200 transition-all"
                >
                  Sửa
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => canBorrow && onBorrow?.(equipment)}
              disabled={!canBorrow}
              title={isAdmin ? 'Quản trị viên không được mượn thiết bị' : undefined}
              className={`h-9 px-5 rounded-lg text-sm font-semibold border transition-all ${
                canBorrow
                  ? 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200'
                  : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
              }`}
            >
              {isAdmin ? 'Mượn thiết bị' : (canBorrow ? 'Mượn thiết bị' : 'Không thể mượn')}
            </button>
          )}
        </div>
      </div>

      {zoomed && currentImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/80"
          onClick={(e) => { e.stopPropagation(); setZoomed(false); }}
        >
          <img
            src={currentImage.url}
            alt=""
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          {totalImages > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goPrev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 hover:bg-white text-gray-800 flex items-center justify-center shadow-lg"
                aria-label="Ảnh trước"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goNext(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/90 hover:bg-white text-gray-800 flex items-center justify-center shadow-lg"
                aria-label="Ảnh sau"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <span className="absolute bottom-6 left-1/2 -translate-x-1/2 text-sm font-medium text-white bg-black/60 px-3 py-1 rounded-full tabular-nums">
                {safeIdx + 1} / {totalImages}
              </span>
            </>
          )}

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setZoomed(false); }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-gray-800 flex items-center justify-center text-2xl leading-none shadow-lg"
            aria-label="Đóng"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
