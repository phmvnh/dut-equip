import type { Equipment } from '../types/equipment';
import { useAuthStore } from '../store/authStore';
import StatusPill from './StatusPill';

interface EquipmentRowCardProps {
  equipment: Equipment;
  onDetail?: (equipment: Equipment) => void;
  onBorrow?: (equipment: Equipment) => void;
}

export default function EquipmentRowCard({ equipment, onDetail, onBorrow }: EquipmentRowCardProps) {
  const isAdmin = useAuthStore((s) => s.user?.role === 'ADMIN');
  const canBorrow = !isAdmin && equipment.status === 'AVAILABLE';

  return (
    <div
      onClick={() => onDetail?.(equipment)}
      className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md hover:border-gray-200 transition-all duration-200 flex flex-col group cursor-pointer"
    >

      {/* Image area */}
      <div className="relative bg-gradient-to-br from-slate-50 to-gray-100 aspect-[4/3] flex items-center justify-center overflow-hidden">
        {equipment.mainImageUrl ? (
          <img
            src={equipment.mainImageUrl}
            alt={equipment.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <svg
            className="w-14 h-14 text-gray-300 group-hover:text-gray-400 transition-colors duration-200"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"
          >
            <rect x="2" y="3" width="20" height="14" rx="2.5" />
            <path strokeLinecap="round" d="M8 21h8M12 17v4" />
          </svg>
        )}
        <div className="absolute top-3 left-3">
          <StatusPill status={equipment.status} />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 leading-snug line-clamp-2 mb-1">
            {equipment.name}
          </h3>
          <p className="text-sm text-gray-400 mb-2">{equipment.code}</p>
          {/* {equipment.description && (
            <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
              {equipment.description}
            </p>
          )} */}
        </div>

        {/* Meta tags — mỗi tag một dòng cho đồng bộ */}
        <div className="flex flex-col gap-1.5 items-start">
          <span className="inline-flex max-w-full items-center px-2 py-0.5 rounded-md bg-gray-50 text-sm text-gray-500 border border-gray-100 truncate">
            {equipment.equipTypeName}
          </span>
          <span className="inline-flex max-w-full items-center px-2 py-0.5 rounded-md bg-gray-50 text-sm text-gray-500 border border-gray-100 truncate">
            {equipment.buildingName}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1 border-t border-gray-50">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDetail?.(equipment);
            }}
            className="flex-1 h-9 rounded-lg bg-gray-100 text-gray-700 border border-gray-300 text-sm font-medium hover:bg-gray-200 transition-all duration-150"
          >
            Chi tiết
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (canBorrow) onBorrow?.(equipment);
            }}
            disabled={!canBorrow}
            title={isAdmin ? 'Quản trị viên không được mượn thiết bị' : undefined}
            className={`flex-1 h-9 rounded-lg text-sm font-semibold border transition-all duration-150 ${
              canBorrow
                ? 'bg-blue-100 text-blue-600 border-blue-300 hover:bg-blue-200'
                : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
            }`}
          >
            Mượn ngay
          </button>
        </div>
      </div>
    </div>
  );
}
