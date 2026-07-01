import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  dashboardApi,
  type BorrowTrendPoint,
  type BuildingStats,
  type DashboardStats,
  type PurposeKey,
  type PurposeStats,
  type TrendMode,
} from '../../api/dashboardApi';
import type { ActivityLogItem, ActivityType } from '../../types/activityLog';
import { aiApi, type AiJobSummary, type AiPrediction, type RiskLevel } from '../../api/aiApi';
import { useToastStore } from '../../store/toastStore';
import MaintenanceFormModal from '../../components/MaintenanceFormModal';

// ============ Static config ============

const PURPOSE_META: Record<PurposeKey, { label: string; color: string }> = {
  TEACHING:        { label: 'Giảng dạy',  color: '#6366f1' },
  PRACTICE:        { label: 'Thực hành',  color: '#22d3ee' },
  RESEARCH:        { label: 'Nghiên cứu', color: '#f59e0b' },
  CONFERENCE:      { label: 'Hội nghị',   color: '#f472b6' },
  EXTRACURRICULAR: { label: 'Ngoại khóa', color: '#34d399' },
  OTHER:           { label: 'Khác',       color: '#94a3b8' },
};

const ACTIVITY_META: Record<ActivityType, { label: string; color: string }> = {
  BORROW_APPROVED:         { label: 'Duyệt đơn',         color: '#16a34a' },
  BORROW_REJECTED:         { label: 'Từ chối đơn',       color: '#b91c1c' },
  BORROW_RETURN_CONFIRMED: { label: 'Xác nhận trả',      color: '#0891b2' },
  MAINTENANCE_CREATED:     { label: 'Tạo bảo trì',       color: '#a16207' },
  MAINTENANCE_COMPLETED:   { label: 'Hoàn thành BT',     color: '#16a34a' },
  MAINTENANCE_CANCELLED:   { label: 'Hủy bảo trì',       color: '#6b7280' },
  COMPENSATION_CREATED:    { label: 'Tạo bồi thường',    color: '#9333ea' },
  COMPENSATION_PAID:       { label: 'Nhận bồi thường',   color: '#16a34a' },
  COMPENSATION_CANCELLED:  { label: 'Hủy bồi thường',    color: '#6b7280' },
  COMPLAINT_RESOLVED:      { label: 'Xử lý khiếu nại',   color: '#2563eb' },
  EQUIPMENT_ADDED:         { label: 'Thêm thiết bị',     color: '#2563eb' },
  EQUIPMENT_DISPOSED:      { label: 'Thanh lý',          color: '#6b7280' },
  USER_CREATED:            { label: 'Thêm giảng viên',   color: '#0891b2' },
  PROCUREMENT_CREATED:     { label: 'Lập đề nghị mua sắm',  color: '#2563eb' },
  PROCUREMENT_APPROVED:    { label: 'Duyệt mua sắm',        color: '#16a34a' },
  PROCUREMENT_COMPLETED:   { label: 'Nghiệm thu mua sắm',   color: '#16a34a' },
  PROCUREMENT_REJECTED:    { label: 'Từ chối mua sắm',      color: '#b91c1c' },
  DISPOSAL_CREATED:        { label: 'Lập đề nghị thanh lý', color: '#6b7280' },
  DISPOSAL_APPROVED:       { label: 'Duyệt thanh lý',       color: '#16a34a' },
  DISPOSAL_COMPLETED:      { label: 'Hoàn tất thanh lý',    color: '#6b7280' },
  DISPOSAL_REJECTED:       { label: 'Từ chối thanh lý',     color: '#b91c1c' },
};

const TREND_MODE_META: Record<TrendMode, { btnLabel: string; unit: string; xInterval: number | 'preserveStartEnd' }> = {
  day:   { btnLabel: 'Ngày',  unit: 'ngày',  xInterval: 'preserveStartEnd' },
  week:  { btnLabel: 'Tuần',  unit: 'tuần',  xInterval: 0 },
  month: { btnLabel: 'Tháng', unit: 'tháng', xInterval: 0 },
};

// Bảng "Thiết bị cần bảo trì sắp tới" — dữ liệu từ AI service (Python + Gemini).
const RISK_LABEL: Record<RiskLevel, { label: string; bg: string; color: string }> = {
  HIGH:   { label: 'Cao',        bg: '#fee2e2', color: '#b91c1c' },
  MEDIUM: { label: 'Trung bình', bg: '#fef9c3', color: '#a16207' },
  LOW:    { label: 'Thấp',       bg: '#dbeafe', color: '#1d4ed8' },
};

// ============ Icons (inline SVG) ============

const ICON_CLASS = 'w-5 h-5';

const ICON_GRID = (
  <svg className={ICON_CLASS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

const ICON_CHECK = (
  <svg className={ICON_CLASS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const ICON_CLIPBOARD = (
  <svg className={ICON_CLASS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 2h6a1 1 0 0 1 1 1v2H8V3a1 1 0 0 1 1-1z" />
    <rect x="5" y="5" width="14" height="16" rx="2" />
  </svg>
);

const ICON_WRENCH = (
  <svg className={ICON_CLASS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-2.5 2.5-2.5z" />
  </svg>
);

const ICON_ALERT = (
  <svg className={ICON_CLASS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

// ============ Helpers ============

function pct(part: number, total: number): string {
  if (total <= 0) return '0.0%';
  return ((part / total) * 100).toFixed(1) + '%';
}

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const diff = Math.max(0, Date.now() - t);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec} giây trước`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} phút trước`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} giờ trước`;
  const day = Math.floor(hr / 24);
  if (day === 1) return 'Hôm qua';
  if (day < 7) return `${day} ngày trước`;
  return new Date(iso).toLocaleDateString('vi-VN');
}

function getPredictionTimestampMs(prediction: AiPrediction): number {
  if (typeof prediction.generatedAtEpochMillis === 'number') return prediction.generatedAtEpochMillis;
  const parsed = new Date(prediction.generatedAt).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

const cardStyle: React.CSSProperties = {
  borderRadius: 16,
  border: '1px solid rgba(0,0,0,0.04)',
  boxShadow: '0 1px 2px rgba(0,0,0,0.03), 0 12px 28px -18px rgba(0,0,0,0.14)',
};

// ============ Component ============

export default function DashboardPage() {
  const [trendMode, setTrendMode] = useState<TrendMode>('day');

  const statsQ = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => dashboardApi.getStats(),
  });

  const trendQ = useQuery({
    queryKey: ['dashboard', 'borrow-trend', trendMode],
    queryFn: () => dashboardApi.getBorrowTrend(trendMode),
  });

  const purposeQ = useQuery({
    queryKey: ['dashboard', 'purpose'],
    queryFn: () => dashboardApi.getBorrowByPurpose(12),
  });

  const buildingQ = useQuery({
    queryKey: ['dashboard', 'building'],
    queryFn: () => dashboardApi.getEquipmentByBuilding(),
  });

  const activitiesQ = useQuery({
    queryKey: ['dashboard', 'recent-activities'],
    queryFn: () => dashboardApi.getRecentActivities(10),
  });

  // Khi != null → bật polling 2s. Tắt polling khi job vừa bấm chuyển sang trạng thái
  // kết thúc — nhận diện bằng run_id đổi khác (không dùng mốc thời gian client/server
  // vì 2 đồng hồ lệch nhau, job xong dưới 1s sẽ có finished_at < lúc client ghi nhận pollSince).
  const [pollSince, setPollSince] = useState<number | null>(null);
  const pollTimeoutRef = useRef<number | null>(null);
  const prevJobRunIdRef = useRef<string | null>(null);

  // Modal chi tiết khi click vào 1 dòng AI prediction
  const [selectedAi, setSelectedAi] = useState<AiPrediction | null>(null);
  // Modal tạo phiếu bảo trì, mở từ modal chi tiết AI
  const [maintTarget, setMaintTarget] = useState<{ equipmentId: number; equipmentCode: string; equipmentName: string; description?: string } | null>(null);

  const aiQ = useQuery({
    queryKey: ['ai', 'predictions'],
    queryFn: () => aiApi.getPredictions({ limit: 50 }),
    refetchInterval: pollSince ? 2000 : false,
  });

  const aiJobQ = useQuery<AiJobSummary>({
    queryKey: ['ai', 'jobs', 'latest'],
    queryFn: () => aiApi.getLatestJob(),
    refetchInterval: pollSince ? 2000 : false,
  });

  const showToast = useToastStore((s) => s.show);

  // Phát hiện job vừa bấm đã kết thúc — so run_id với lượt trước khi bấm, không so thời gian.
  useEffect(() => {
    if (!pollSince || !aiJobQ.data?.run_id) return;
    if (aiJobQ.data.run_id === prevJobRunIdRef.current) return; // vẫn là job cũ, job mới chưa kịp ghi/refetch
    if (aiJobQ.data.status === 'RUNNING') return; // job mới đã bắt đầu, đợi xong

    const stopPolling = () => {
      setPollSince(null);
      if (pollTimeoutRef.current) {
        window.clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
    };

    if (aiJobQ.data.status === 'FAILED' || aiJobQ.data.status === 'PARTIAL') {
      stopPolling();
      showToast(aiJobQ.data.error_message || 'Lần phân tích này gặp lỗi — kiểm tra log AI service', 'error');
      return;
    }
    if (aiJobQ.data.status !== 'DONE') return;

    stopPolling();
    if (aiJobQ.data.n_llm && aiJobQ.data.n_llm > 0) {
      showToast('AI đã cập nhật dự đoán mới', 'success');
    } else {
      showToast('Lần chạy này không có dữ liệu mới để gửi lên Gemini', 'info');
    }
  }, [aiJobQ.data, pollSince, showToast]);

  // Cleanup timeout khi unmount
  useEffect(() => {
    return () => {
      if (pollTimeoutRef.current) window.clearTimeout(pollTimeoutRef.current);
    };
  }, []);

  const aiRun = useMutation({
    mutationFn: () => aiApi.runNow(),
    onMutate: () => {
      // Chốt run_id hiện tại TRƯỚC khi gọi /run, để phân biệt job mới với job cũ.
      prevJobRunIdRef.current = aiJobQ.data?.run_id ?? null;
    },
    onSuccess: (resp) => {
      if (resp.status === 'started' || resp.status === 'busy') {
        const since = Date.now();
        setPollSince(since);
        showToast('AI đang phân tích — bảng sẽ tự cập nhật khi có kết quả', 'info');
        // Safety: dừng polling sau 5 phút nếu Python lỗi hoặc quá lâu.
        // Một lần chạy quét ~31 loại, có throttle để không vượt 15 request/phút Gemini → ~2,5 phút.
        if (pollTimeoutRef.current) window.clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = window.setTimeout(() => {
          setPollSince((cur) => (cur === since ? null : cur));
          showToast('AI chạy quá lâu — kiểm tra log Python service', 'error');
        }, 300000);
      } else {
        showToast(resp.message || 'Không gọi được AI service', 'error');
      }
    },
    onError: () => showToast('Lỗi gọi AI — kiểm tra service Python đã chạy chưa', 'error'),
  });

  const stats: DashboardStats | undefined = statsQ.data;
  const trendData: BorrowTrendPoint[] = trendQ.data ?? [];
  const trendMeta = TREND_MODE_META[trendMode];
  const trendTotal = trendData.reduce((s, p) => s + p.count, 0);

  // Purpose: chỉ giữ các slice có value > 0 để donut không có lát trống
  const purposeAll: PurposeStats[] = purposeQ.data ?? [];
  const purposeShown = purposeAll.filter((p) => p.count > 0);
  const purposeTotal = purposeAll.reduce((s, p) => s + p.count, 0);

  const buildingData: BuildingStats[] = buildingQ.data ?? [];
  // Chỉ hiển thị khu có thiết bị — tránh hàng trống lèo tèo
  const buildingShown = buildingData.filter((b) => b.count > 0);
  const buildingTotal = buildingShown.reduce((s, b) => s + b.count, 0);

  const activities: ActivityLogItem[] = activitiesQ.data ?? [];

  return (
    <div className="space-y-6">
      {/* Block 1: 5 stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Tổng thiết bị"
          value={stats?.total}
          sub={stats ? `▲ ${stats.newThisMonth} mới tháng này` : '—'}
          subColor="#16a34a"
          iconBg="#dbeafe"
          iconColor="#2563eb"
          icon={ICON_GRID}
          loading={statsQ.isLoading}
        />
        <StatCard
          label="Sẵn sàng"
          value={stats?.available}
          sub={stats ? `${pct(stats.available, stats.total)} kho thiết bị` : '—'}
          subColor="#16a34a"
          iconBg="#dcfce7"
          iconColor="#16a34a"
          icon={ICON_CHECK}
          loading={statsQ.isLoading}
        />
        <StatCard
          label="Đang mượn"
          value={stats?.borrowed}
          sub={stats ? `${pct(stats.borrowed, stats.total)} · ${stats.nearOverdue} sắp quá hạn` : '—'}
          subColor="#1d4ed8"
          iconBg="#dbeafe"
          iconColor="#1d4ed8"
          icon={ICON_CLIPBOARD}
          loading={statsQ.isLoading}
        />
        <StatCard
          label="Đang bảo trì"
          value={stats?.maintenance}
          sub={stats ? `${pct(stats.maintenance, stats.total)} kho thiết bị` : '—'}
          subColor="#a16207"
          iconBg="#fef9c3"
          iconColor="#a16207"
          icon={ICON_WRENCH}
          loading={statsQ.isLoading}
        />
        <StatCard
          label="Hỏng"
          value={stats?.broken}
          sub={stats ? `${pct(stats.broken, stats.total)} · cần xử lý` : '—'}
          subColor="#b91c1c"
          iconBg="#fee2e2"
          iconColor="#b91c1c"
          icon={ICON_ALERT}
          loading={statsQ.isLoading}
        />
      </div>

      {/* Block 2: Line + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Line chart */}
        <div className="lg:col-span-2 bg-white" style={cardStyle}>
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold tracking-tight text-gray-900">Lượt mượn theo {trendMeta.unit}</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {trendQ.isLoading
                  ? 'Đang tải…'
                  : `Tổng ${trendTotal} lượt · ${trendData.length} ${trendMeta.unit} gần nhất`}
              </p>
            </div>
            <div
              className="flex rounded-lg overflow-hidden shrink-0"
              style={{ border: '1px solid #e5e7eb' }}
            >
              {(['day', 'week', 'month'] as const).map((mode) => {
                const active = mode === trendMode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setTrendMode(mode)}
                    className="text-xs px-3 py-1.5 font-medium transition-colors"
                    style={{
                      backgroundColor: active ? '#2563eb' : 'transparent',
                      color: active ? 'white' : '#6b7280',
                    }}
                  >
                    {TREND_MODE_META[mode].btnLabel}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="px-3 py-4">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trendData} margin={{ top: 8, right: 16, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                  interval={trendMeta.xInterval}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: '#374151', fontWeight: 500 }}
                  formatter={(value) => [`${value} lượt mượn`, '']}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fill="url(#trendFill)"
                  dot={{ r: 3, fill: '#2563eb' }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut chart */}
        <div className="bg-white" style={cardStyle}>
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold tracking-tight text-gray-900">Mục đích sử dụng</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {purposeQ.isLoading ? 'Đang tải…' : `12 tháng · ${purposeTotal} đơn`}
            </p>
          </div>
          <div className="px-5 py-4">
            <div className="relative">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={purposeShown.length > 0 ? purposeShown : [{ purpose: 'OTHER', count: 1 }]}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={purposeShown.length > 1 ? 2 : 0}
                    dataKey="count"
                    stroke="none"
                  >
                    {(purposeShown.length > 0 ? purposeShown : [{ purpose: 'OTHER' as PurposeKey, count: 1 }]).map((p) => (
                      <Cell
                        key={p.purpose}
                        fill={purposeShown.length > 0 ? PURPOSE_META[p.purpose].color : '#e5e7eb'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12 }}
                    formatter={(value, _name, item) => {
                      const num = Number(value) || 0;
                      const payload = (item as { payload?: PurposeStats })?.payload;
                      const key = payload?.purpose;
                      const meta = key ? PURPOSE_META[key] : undefined;
                      return [`${num} đơn · ${pct(num, purposeTotal)}`, meta?.label ?? 'Mục đích'];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-2xl font-semibold tabular-nums leading-tight">{purposeTotal}</div>
                <div className="text-xs text-gray-500 mt-0.5">đơn mượn</div>
              </div>
            </div>
            <ul className="mt-3 space-y-1.5">
              {purposeAll.map((p) => {
                const meta = PURPOSE_META[p.purpose];
                return (
                  <li key={p.purpose} className="flex items-center text-xs">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0 mr-2" style={{ backgroundColor: meta.color }} />
                    <span className="flex-1 text-gray-700">{meta.label}</span>
                    <span className="text-gray-500 tabular-nums">
                      {p.count} · {pct(p.count, purposeTotal)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      {/* Block 4: Bảng "Thiết bị cần bảo trì" — AI Gemini */}
      <div className="bg-white" style={cardStyle}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2 flex-wrap">
          <h2 className="font-semibold tracking-tight text-gray-900">Thiết bị cần bảo trì, sửa chữa sắp tới</h2>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: '#f3e8ff', color: '#7e22ce' }}
          >
            AI gợi ý
          </span>
          {pollSince && (
            <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
              Đang chờ AI…
            </span>
          )}
          <button
            type="button"
            onClick={() => aiRun.mutate()}
            disabled={aiRun.isPending || pollSince !== null}
            className="ml-auto text-xs px-3 py-1.5 rounded-md font-medium transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#2563eb', color: 'white' }}
          >
            {aiRun.isPending ? 'Đang gọi…' : pollSince ? 'Đang phân tích…' : 'Phân tích ngay'}
          </button>
        </div>
        {/* 7 dòng × ~64px + thead 40 ≈ 488. Bọc scroll, sticky header */}
        <div className="overflow-y-auto" style={{ maxHeight: 488 }}>
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-5 py-2.5 font-medium">Mã</th>
                <th className="px-5 py-2.5 font-medium">Tên thiết bị</th>
                <th className="px-5 py-2.5 font-medium">Loại</th>
                <th className="px-5 py-2.5 font-medium">Khu</th>
                <th className="px-5 py-2.5 font-medium whitespace-nowrap">Lần BT cuối</th>
                <th className="px-5 py-2.5 font-medium">Mức độ</th>
                <th className="px-5 py-2.5 font-medium">Lý do (AI)</th>
              </tr>
            </thead>
            <tbody>
              {aiQ.isLoading && (
                <tr>
                  <td className="px-5 py-4 text-gray-400 text-xs" colSpan={7}>Đang tải dự đoán AI…</td>
                </tr>
              )}
              {!aiQ.isLoading && (aiQ.data?.filter(m => m.riskLevel === 'HIGH' || m.riskLevel === 'MEDIUM').length ?? 0) === 0 && (
                <tr>
                  <td className="px-5 py-4 text-gray-400 text-xs" colSpan={7}>
                    Không có thiết bị rủi ro Cao hoặc Trung bình — bấm "Phân tích ngay" để cập nhật
                  </td>
                </tr>
              )}
              {(aiQ.data ?? [])
                .filter(m => m.riskLevel === 'HIGH' || m.riskLevel === 'MEDIUM')
                .map((m) => {
                const r = RISK_LABEL[m.riskLevel];
                return (
                  <tr
                    key={m.equipmentId}
                    onClick={() => setSelectedAi(m)}
                    className="border-t border-gray-100 cursor-pointer hover:bg-blue-50/40 transition-colors"
                  >
                    <td className="px-5 py-3 text-xs whitespace-nowrap">{m.equipmentCode}</td>
                    <td className="px-5 py-3">{m.equipmentName}</td>
                    <td className="px-5 py-3 text-gray-500">{m.equipTypeName}</td>
                    <td className="px-5 py-3 text-gray-500">{m.buildingName}</td>
                    <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{m.lastMaintenanceText}</td>
                    <td className="px-5 py-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap inline-block"
                        style={{ backgroundColor: r.bg, color: r.color }}
                      >
                        {r.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-600 max-w-md">{m.reason}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal chi tiết AI prediction */}
      {selectedAi && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelectedAi(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-lg truncate">{selectedAi.equipmentName}</h3>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                    style={{ backgroundColor: RISK_LABEL[selectedAi.riskLevel].bg, color: RISK_LABEL[selectedAi.riskLevel].color }}
                  >
                    Rủi ro {RISK_LABEL[selectedAi.riskLevel].label}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{selectedAi.equipmentCode} · AI cập nhật {formatRelative(selectedAi.generatedAt)}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAi(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none shrink-0"
                aria-label="Đóng"
              >×</button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div><div className="text-xs text-gray-500">Loại thiết bị</div><div>{selectedAi.equipTypeName}</div></div>
                <div><div className="text-xs text-gray-500">Khu/Tòa</div><div>{selectedAi.buildingName}</div></div>
                <div><div className="text-xs text-gray-500">Lần bảo trì gần nhất</div><div>{selectedAi.lastMaintenanceText}</div></div>
                <div><div className="text-xs text-gray-500">Điểm rủi ro</div><div className="tabular-nums">{selectedAi.riskScore}/100</div></div>
                <div>
                  <div className="text-xs text-gray-500">Khả năng hỏng trong 7 ngày</div>
                  <div className={selectedAi.willFailIn7d ? 'text-red-600 font-medium' : 'text-gray-700'}>
                    {selectedAi.willFailIn7d ? 'Có khả năng cao' : 'Thấp'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Khuyến nghị bảo trì trong</div>
                  <div>{selectedAi.daysToMaintenance !== null ? `${selectedAi.daysToMaintenance} ngày` : '—'}</div>
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-500 mb-1">Phân tích từ AI</div>
                <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-md px-3 py-2.5">
                  {selectedAi.reason}
                </p>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedAi(null)}
                className="text-sm px-4 py-2 rounded-md font-medium text-gray-600 hover:bg-gray-100"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  setMaintTarget({
                    equipmentId: selectedAi.equipmentId,
                    equipmentCode: selectedAi.equipmentCode,
                    equipmentName: selectedAi.equipmentName,
                    description: selectedAi.reason,
                  });
                  setSelectedAi(null);
                }}
                className="text-sm px-4 py-2 rounded-md font-medium text-white"
                style={{ backgroundColor: '#2563eb' }}
              >
                Tạo phiếu bảo trì
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal tạo phiếu bảo trì với thiết bị đã chọn từ AI */}
      {maintTarget && (
        <MaintenanceFormModal
          preset={maintTarget}
          onClose={() => setMaintTarget(null)}
          onSuccess={() => {
            setMaintTarget(null);
            showToast('Đã tạo phiếu bảo trì', 'success');
          }}
        />
      )}

      {/* Block 5: Bảng "Hoạt động gần đây" */}
      <div className="bg-white" style={cardStyle}>
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold tracking-tight text-gray-900">Hoạt động gần đây</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="text-left text-gray-500 bg-gray-50">
            <tr>
              <th className="px-5 py-2.5 font-medium">Thời gian</th>
              <th className="px-5 py-2.5 font-medium">Loại</th>
              <th className="px-5 py-2.5 font-medium">Tiêu đề</th>
              <th className="px-5 py-2.5 font-medium">Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {activitiesQ.isLoading && (
              <tr>
                <td className="px-5 py-4 text-gray-400 text-xs" colSpan={4}>Đang tải…</td>
              </tr>
            )}
            {!activitiesQ.isLoading && activities.length === 0 && (
              <tr>
                <td className="px-5 py-4 text-gray-400 text-xs" colSpan={4}>Chưa có hoạt động</td>
              </tr>
            )}
            {activities.map((a, idx) => {
              const meta = ACTIVITY_META[a.type];
              return (
                <tr key={`${a.type}-${a.targetType}-${a.targetId}-${idx}`} className="border-t border-gray-100">
                  <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{formatRelative(a.timestamp)}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: meta?.color ?? '#6b7280' }} />
                      {meta?.label ?? a.type}
                    </span>
                  </td>
                  <td className="px-5 py-3">{a.title}</td>
                  <td className="px-5 py-3 text-gray-600 text-xs">{a.description}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Block cuối: Bar chart phân bố theo khu */}
      <div className="bg-white" style={cardStyle}>
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold tracking-tight text-gray-900">Phân bố thiết bị theo khu/tòa</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {buildingQ.isLoading
              ? 'Đang tải…'
              : `${buildingShown.length} khu · ${buildingTotal} thiết bị`}
          </p>
        </div>
        <div className="px-5 py-4">
          <ResponsiveContainer width="100%" height={Math.max(260, buildingShown.length * 32)}>
            <BarChart
              data={buildingShown}
              layout="vertical"
              margin={{ top: 4, right: 36, bottom: 4, left: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={170}
                tick={{ fontSize: 12, fill: '#374151' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: '#f3f4f6' }}
                contentStyle={{ border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12 }}
                formatter={(value) => [`${value} thiết bị`, '']}
              />
              <Bar dataKey="count" fill="#2563eb" radius={[0, 6, 6, 0]} barSize={18}>
                <LabelList dataKey="count" position="right" fill="#374151" fontSize={12} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ============ StatCard subcomponent ============

interface StatCardProps {
  label: string;
  value: number | undefined;
  sub: string;
  subColor: string;
  iconBg: string;
  iconColor: string;
  icon: React.ReactNode;
  loading?: boolean;
}

function StatCard({ label, value, sub, subColor, iconBg, iconColor, icon, loading }: StatCardProps) {
  return (
    <div className="bg-white p-5" style={cardStyle}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-gray-500">{label}</div>
          <div className="text-3xl font-semibold mt-2 tracking-tight tabular-nums">
            {loading || value === undefined ? '—' : value}
          </div>
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          {icon}
        </div>
      </div>
      <div className="text-xs mt-3" style={{ color: subColor }}>{sub}</div>
    </div>
  );
}
