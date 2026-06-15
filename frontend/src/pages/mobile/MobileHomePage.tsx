import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Equipment } from '../../types/equipment';
import { equipApi } from '../../api/equipApi';
import { equipTypeApi } from '../../api/equipTypeApi';
import { borrowApi } from '../../api/borrowApi';
import { settingApi } from '../../api/settingApi';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';
import MobileEquipCard from '../../components/mobile/MobileEquipCard';
import MobileBottomNav from '../../components/mobile/MobileBottomNav';
import MobileSheet from '../../components/mobile/MobileSheet';
import MobileBorrowSheet from '../../components/mobile/MobileBorrowSheet';
import MobileToast from '../../components/mobile/MobileToast';
import { useEquipDetailContent } from '../../components/mobile/MobileEquipDetailSheet';
import { useHideOnScroll } from '../../hooks/useHideOnScroll';

// Sheet chi tiết — tách riêng để gọi hook useEquipDetailContent đúng quy tắc hook
function DetailSheet({ equipment, onClose, onBorrow }: { equipment: Equipment; onClose: () => void; onBorrow: (e: Equipment) => void }) {
  const { body, footer } = useEquipDetailContent(equipment, onBorrow);
  return (
    <MobileSheet onClose={onClose} footer={footer}>
      {body}
    </MobileSheet>
  );
}

export default function MobileHomePage() {
  const [typeFilter, setTypeFilter] = useState<number | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [detailEquip, setDetailEquip] = useState<Equipment | null>(null);
  const [borrowEquip, setBorrowEquip] = useState<Equipment | null>(null);
  const [emailBannerDismissed, setEmailBannerDismissed] = useState(false);

  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.show);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isUser = !!user && user.role !== 'ADMIN';
  const hideBrand = useHideOnScroll();

  const { data: equipTypes = [] } = useQuery({
    queryKey: ['equip-types'],
    queryFn: () => equipTypeApi.getAll(),
  });

  const { data: equipmentsRaw = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['equipments', { equipTypeId: typeFilter }, search],
    queryFn: () => equipApi.getAll({ equipTypeId: typeFilter, keyword: search.trim() || undefined }),
  });

  const equipments = useMemo(() => {
    const statusOrder: Record<Equipment['status'], number> = {
      AVAILABLE: 0, BORROWED: 1, MAINTENANCE: 2, BROKEN: 3, DISPOSED: 4,
    };
    return equipmentsRaw
      .filter((e) => e.status !== 'DISPOSED' && !e.hidden)
      .slice()
      .sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
  }, [equipmentsRaw]);

  const { data: myBorrows = [] } = useQuery({
    queryKey: ['my-borrows'],
    queryFn: () => borrowApi.getMy(),
    enabled: isUser,
  });
  const { data: setting } = useQuery({
    queryKey: ['settings'],
    queryFn: settingApi.get,
    enabled: isUser,
  });

  const activeBorrows = useMemo(
    () => myBorrows.filter((b) => b.status === 'PENDING' || b.status === 'APPROVED'),
    [myBorrows]
  );
  const myActiveEquipIds = useMemo(() => new Set(activeBorrows.map((b) => b.equipmentId)), [activeBorrows]);

  function handleBorrowClick(eq: Equipment) {
    if (!user) {
      showToast('Vui lòng đăng nhập để mượn thiết bị', 'error');
      navigate('/login');
      return;
    }
    if (myActiveEquipIds.has(eq.id)) {
      showToast('Bạn đang có đơn mượn đang xử lý cho thiết bị này', 'error');
      return;
    }
    if (setting && activeBorrows.length >= setting.maxConcurrent) {
      showToast(`Bạn đang mượn tối đa ${setting.maxConcurrent} thiết bị`, 'error');
      return;
    }
    setDetailEquip(null);
    setBorrowEquip(eq);
  }

  return (
    <div className="min-h-[100dvh] bg-parchment font-sf">
      {/* Header 2 tầng — frosted; tầng thương hiệu tự ẩn khi lướt xuống */}
      <header
        className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-black/[0.06]"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        {/* Tầng 1 — logo + tên app: co lại khi lướt xuống, hiện lại khi lướt lên */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-out ${
            hideBrand ? 'max-h-0 opacity-0' : 'max-h-16 opacity-100'
          }`}
        >
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <div className="flex items-center gap-2">
              <img src="/logo_dut_equip_no_bg.png" alt="" className="w-7 h-7 object-contain" />
              <span className="text-[17px] font-bold text-ink tracking-[-0.01em]">DUT Equip</span>
            </div>
            {!user && (
              <button
                onClick={() => navigate('/login')}
                className="h-8 px-4 rounded-full bg-action text-white text-sm font-semibold active:bg-action-press active:scale-95 transition"
              >
                Đăng nhập
              </button>
            )}
          </div>
        </div>

        {/* Tầng 2 — search (luôn hiện) */}
        <div className="px-4 pb-2.5 pt-2">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm thiết bị..."
              className="w-full h-10 pl-9 pr-3 rounded-full bg-black/[0.05] border border-transparent text-[15px] outline-none focus:bg-white focus:border-action/40"
            />
          </div>
        </div>

        {/* Chips loại thiết bị */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-2.5 no-scrollbar">
          <Chip active={typeFilter === undefined} onClick={() => setTypeFilter(undefined)}>Tất cả</Chip>
          {equipTypes.map((t) => (
            <Chip key={t.id} active={typeFilter === t.id} onClick={() => setTypeFilter(t.id)}>
              {t.name}
            </Chip>
          ))}
        </div>
      </header>

      {/* Danh sách */}
      <main className="px-4 pt-4 pb-24">
        {isUser && user && !user.personalEmail && !emailBannerDismissed && (
          <div className="mb-3 flex items-start gap-2.5 rounded-2xl bg-amber-50 border border-amber-200 px-3.5 py-3">
            <svg className="w-5 h-5 mt-0.5 shrink-0 text-amber-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M22 6.75v10.5A2.25 2.25 0 0 1 19.75 19.5H4.25A2.25 2.25 0 0 1 2 17.25V6.75m20 0A2.25 2.25 0 0 0 19.75 4.5H4.25A2.25 2.25 0 0 0 2 6.75m20 0-10 6.25L2 6.75" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-amber-800 leading-snug">
                Chưa có <span className="font-semibold">Gmail cá nhân</span> để nhận thông báo qua email. Cập nhật trong hồ sơ để nhận nhắc trả, duyệt đơn…
              </p>
              <Link
                to="/account/profile"
                className="inline-block mt-2 h-8 px-3 leading-8 rounded-lg bg-amber-100 text-amber-800 border border-amber-300 text-sm font-semibold active:bg-amber-200"
              >
                Cập nhật ngay
              </Link>
            </div>
            <button
              onClick={() => setEmailBannerDismissed(true)}
              title="Đóng"
              className="shrink-0 w-7 h-7 -mr-1 rounded-lg flex items-center justify-center text-amber-500 active:bg-amber-100"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-3 flex gap-3 animate-pulse">
                <div className="w-[88px] h-[88px] rounded-xl bg-gray-100" />
                <div className="flex-1 py-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                  <div className="h-9 bg-gray-100 rounded-lg mt-3" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <p className="text-sm text-gray-500">Không thể tải danh sách thiết bị</p>
            <button onClick={() => refetch()} className="h-10 px-5 rounded-full bg-action text-white text-sm font-semibold active:bg-action-press active:scale-95 transition">
              Thử lại
            </button>
          </div>
        ) : equipments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <svg className="w-12 h-12 text-gray-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
            </svg>
            <p className="text-sm text-gray-400">Không tìm thấy thiết bị phù hợp</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-3">{equipments.length} thiết bị</p>
            <div className="space-y-3">
              {equipments.map((e) => (
                <MobileEquipCard key={e.id} equipment={e} onDetail={setDetailEquip} onBorrow={handleBorrowClick} />
              ))}
            </div>
          </>
        )}
      </main>

      {detailEquip && (
        <DetailSheet equipment={detailEquip} onClose={() => setDetailEquip(null)} onBorrow={handleBorrowClick} />
      )}

      {borrowEquip && (
        <MobileBorrowSheet
          equipment={borrowEquip}
          onClose={() => setBorrowEquip(null)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['my-borrows'] })}
        />
      )}

      <MobileBottomNav />
      <MobileToast />
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 h-8 px-3.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
        active ? 'bg-action text-white' : 'bg-black/[0.05] text-gray-600'
      }`}
    >
      {children}
    </button>
  );
}
