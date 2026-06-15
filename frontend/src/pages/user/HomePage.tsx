import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Navbar from '../../components/Navbar';
import FilterBar from '../../components/FilterBar';
import EquipmentRowCard from '../../components/EquipmentRowCard';
import PersonalEmailBanner from '../../components/PersonalEmailBanner';
import EquipmentDetailModal from '../../components/EquipmentDetailModal';
import BorrowFormModal from '../../components/BorrowFormModal';
import Footer from '../../components/Footer';
import Toast from '../../components/Toast';
import type { Equipment, FilterParams } from '../../types/equipment';
import { equipApi } from '../../api/equipApi';
import { equipTypeApi } from '../../api/equipTypeApi';
import { borrowApi } from '../../api/borrowApi';
import { settingApi } from '../../api/settingApi';
import { useAuthStore } from '../../store/authStore';
import { useToastStore } from '../../store/toastStore';

const INITIAL_VISIBLE = 20;

export default function HomePage() {
  const [filters, setFilters] = useState<FilterParams>({});
  const [search, setSearch] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [borrowEquipment, setBorrowEquipment] = useState<Equipment | null>(null);
  const [duplicateAlertEquip, setDuplicateAlertEquip] = useState<Equipment | null>(null);
  const [limitAlertOpen, setLimitAlertOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);

  const user = useAuthStore((s) => s.user);
  const showToast = useToastStore((s) => s.show);
  const queryClient = useQueryClient();
  const isUser = !!user && user.role !== 'ADMIN';

  const { data: equipTypes = [] } = useQuery({
    queryKey: ['equip-types'],
    queryFn: () => equipTypeApi.getAll(),
  });

  const { data: equipmentsRaw = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['equipments', filters, search],
    queryFn: () =>
      equipApi.getAll({
        equipTypeId: filters.equipTypeId,
        status: filters.status,
        keyword: search.trim() || undefined,
      }),
  });

  // Ẩn khỏi giảng viên: thiết bị đã thanh lý hoặc Admin đặt cờ hidden
  // Sắp xếp theo trạng thái: AVAILABLE → BORROWED → MAINTENANCE → BROKEN
  const equipments = useMemo(() => {
    const statusOrder: Record<Equipment['status'], number> = {
      AVAILABLE: 0,
      BORROWED: 1,
      MAINTENANCE: 2,
      BROKEN: 3,
      DISPOSED: 4,
    };
    return equipmentsRaw
      .filter((e) => e.status !== 'DISPOSED' && !e.hidden)
      .slice()
      .sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
  }, [equipmentsRaw]);

  // Đổi bộ lọc / tìm kiếm → quay lại số lượng hiển thị ban đầu
  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
  }, [filters, search]);

  const visibleEquipments = useMemo(
    () => equipments.slice(0, visibleCount),
    [equipments, visibleCount]
  );
  const hasMore = visibleCount < equipments.length;

  // Đơn mượn active của user — pre-check để chặn click "Mượn ngay" trên thiết bị đã có đơn
  const { data: myBorrows = [] } = useQuery({
    queryKey: ['my-borrows'],
    queryFn: () => borrowApi.getMy(),
    enabled: isUser,
  });

  // Setting hệ thống — lấy maxConcurrent để pre-check giới hạn số đơn active
  const { data: setting } = useQuery({
    queryKey: ['settings'],
    queryFn: settingApi.get,
    enabled: isUser,
  });

  const activeBorrows = useMemo(
    () => myBorrows.filter((b) => b.status === 'PENDING' || b.status === 'APPROVED'),
    [myBorrows]
  );
  const myActiveEquipIds = useMemo(
    () => new Set(activeBorrows.map((b) => b.equipmentId)),
    [activeBorrows]
  );

  function handleBorrowClick(eq: Equipment) {
    if (!user) {
      showToast('Bạn chưa đăng nhập', 'error');
      return;
    }
    if (myActiveEquipIds.has(eq.id)) {
      setSelectedEquipment(null);
      setBorrowEquipment(null);
      setDuplicateAlertEquip(eq);
      return;
    }
    // Pre-check giới hạn số đơn active — chỉ block khi setting đã load để tránh false-positive
    if (setting && activeBorrows.length >= setting.maxConcurrent) {
      setSelectedEquipment(null);
      setBorrowEquipment(null);
      setLimitAlertOpen(true);
      return;
    }
    setSelectedEquipment(null);
    setBorrowEquipment(eq);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <PersonalEmailBanner />
      <FilterBar
        filters={filters}
        onChange={setFilters}
        search={search}
        onSearch={setSearch}
        equipTypes={equipTypes}
      />

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <svg className="w-8 h-8 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
            </svg>
            <p className="text-base text-gray-400">Đang tải danh sách thiết bị...</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <svg className="w-12 h-12 text-red-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-base text-gray-500">Không thể tải danh sách thiết bị</p>
            <button
              onClick={() => refetch()}
              className="h-9 px-4 rounded-lg bg-blue-100 text-blue-700 border border-blue-300 text-sm font-medium hover:bg-blue-200 transition-colors"
            >
              Thử lại
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-5">
              {equipments.length} thiết bị
              {(filters.equipTypeId || filters.status || search.trim()) && ' phù hợp với bộ lọc'}
            </p>

            {equipments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 gap-3">
                <svg className="w-12 h-12 text-gray-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
                </svg>
                <p className="text-base text-gray-400">Không tìm thấy thiết bị phù hợp</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {visibleEquipments.map((e) => (
                    <EquipmentRowCard
                      key={e.id}
                      equipment={e}
                      onDetail={setSelectedEquipment}
                      onBorrow={handleBorrowClick}
                    />
                  ))}
                </div>

                {hasMore && (
                  <div className="flex justify-center mt-8">
                    <button
                      onClick={() => setVisibleCount((c) => c + INITIAL_VISIBLE)}
                      className="h-10 px-6 rounded-lg bg-white text-blue-700 border border-blue-300 text-sm font-medium hover:bg-blue-50 transition-colors"
                    >
                      Xem thêm
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      {selectedEquipment && (
        <EquipmentDetailModal
          equipment={selectedEquipment}
          onClose={() => setSelectedEquipment(null)}
          onBorrow={handleBorrowClick}
        />
      )}

      {borrowEquipment && (
        <BorrowFormModal
          equipment={borrowEquipment}
          onClose={() => setBorrowEquipment(null)}
          onShowDetail={(eq) => {
            setBorrowEquipment(null);
            setSelectedEquipment(eq);
          }}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['my-borrows'] })}
        />
      )}

      {/* Popup: user đã đạt giới hạn số đơn mượn đồng thời */}
      {limitAlertOpen && setting && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setLimitAlertOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">Đã đạt giới hạn mượn</h3>
              <p className="text-sm text-gray-600">
                Bạn đang mượn tối đa <span className="font-medium">{setting.maxConcurrent}</span> thiết bị.
                Vui lòng trả bớt thiết bị hoặc huỷ đơn trước khi tạo đơn mới.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Popup: user click "Mượn ngay" trên thiết bị mình đã có đơn active */}
      {duplicateAlertEquip && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setDuplicateAlertEquip(null)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">Bạn đã mượn thiết bị này</h3>
              <p className="text-sm text-gray-600">
                Bạn đang có một đơn mượn đang xử lý cho <span className="font-medium">{duplicateAlertEquip.name}</span>.
                Vui lòng chờ admin duyệt hoặc huỷ đơn cũ trước khi tạo đơn mới.
              </p>
            </div>
          </div>
        </div>
      )}

      <Footer />

      <Toast />
    </div>
  );
}
