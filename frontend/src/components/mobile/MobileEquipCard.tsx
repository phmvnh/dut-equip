import type { Equipment } from '../../types/equipment';
import { statusConfig, statusDotColor } from '../../utils/statusConfig';

interface Props {
  equipment: Equipment;
  onDetail: (equipment: Equipment) => void;
  onBorrow: (equipment: Equipment) => void;
}

export default function MobileEquipCard({ equipment, onDetail, onBorrow }: Props) {
  const canBorrow = equipment.status === 'AVAILABLE';
  const { label } = statusConfig[equipment.status];

  return (
    <div
      onClick={() => onDetail(equipment)}
      className="bg-white rounded-[20px] p-3.5 flex gap-3.5 ring-1 ring-black/[0.04] shadow-[0_1px_2px_rgba(0,0,0,0.03),0_10px_24px_-16px_rgba(0,0,0,0.12)] active:scale-[0.99] transition-transform"
    >
      {/* Thumbnail */}
      <div className="relative w-[92px] h-[92px] shrink-0 rounded-2xl bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center overflow-hidden">
        {equipment.mainImageUrl ? (
          <img src={equipment.mainImageUrl} alt={equipment.name} className="w-full h-full object-cover" />
        ) : (
          <svg className="w-9 h-9 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <rect x="2" y="3" width="20" height="14" rx="2.5" />
            <path strokeLinecap="round" d="M8 21h8M12 17v4" />
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <h3 className="text-[15px] font-semibold text-ink leading-snug line-clamp-2 tracking-[-0.01em]">{equipment.name}</h3>
        <p className="text-xs text-gray-400 mt-0.5 tabular-nums">{equipment.code}</p>

        <div className="flex items-center gap-1.5 mt-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${statusDotColor[equipment.status]}`} />
          <span className="text-[12px] font-medium text-gray-500">{label}</span>
          <span className="text-gray-300">·</span>
          <span className="text-[12px] text-gray-400 truncate">{equipment.equipTypeName}</span>
        </div>

        <div className="mt-auto pt-2.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (canBorrow) onBorrow(equipment);
            }}
            disabled={!canBorrow}
            className={`w-full h-9 rounded-full text-sm font-semibold transition ${
              canBorrow
                ? 'bg-action text-white active:bg-action-press active:scale-95'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            {canBorrow ? 'Mượn ngay' : 'Không khả dụng'}
          </button>
        </div>
      </div>
    </div>
  );
}
