import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { activityLogApi } from '../../api/activityLogApi';
import type { ActivityPeriod } from '../../types/activityLog';
import { ACTIVITY_BADGE_CLASS, ACTIVITY_TARGET_LABEL, getActivityLink } from '../../utils/activityBadge';
import { formatRelative, formatDateTime } from '../../utils/formatRelative';

const PAGE_SIZE = 30;

const PERIOD_TABS: { key: ActivityPeriod; label: string }[] = [
  { key: 'TODAY',        label: 'Hôm nay' },
  { key: 'LAST_7_DAYS',  label: '7 ngày' },
  { key: 'LAST_30_DAYS', label: '30 ngày' },
  { key: 'ALL',          label: 'Tất cả' },
];

export default function ActivityLogsPage() {
  const navigate = useNavigate();
  const { search } = useOutletContext<{ search: string }>();
  const [period, setPeriod] = useState<ActivityPeriod>('LAST_7_DAYS');
  const [page, setPage] = useState(0);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['activity-logs', period, search, page],
    queryFn: () => activityLogApi.list({
      period,
      keyword: search.trim() || undefined,
      page,
      size: PAGE_SIZE,
    }),
  });

  const items = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;

  function changePeriod(p: ActivityPeriod) {
    setPeriod(p);
    setPage(0);
  }

  const cardStyle: React.CSSProperties = { border: '1px solid #e5e7eb', borderRadius: 10 };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div
        className="bg-white px-2 py-1 flex gap-1 overflow-x-auto"
        style={cardStyle}
      >
        {PERIOD_TABS.map((t) => {
          const active = period === t.key;
          return (
            <button
              key={t.key}
              onClick={() => changePeriod(t.key)}
              className="px-4 py-2 text-sm rounded-lg font-medium transition-colors whitespace-nowrap"
              style={{
                backgroundColor: active ? '#2563eb' : 'transparent',
                color: active ? 'white' : '#4b5563',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="bg-white overflow-hidden" style={cardStyle}>
        {isLoading && (
          <div className="px-6 py-12 flex justify-center">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {isError && !isLoading && (
          <div className="px-6 py-12 text-center text-sm text-red-500">
            Không thể tải lịch sử hoạt động
          </div>
        )}

        {!isLoading && !isError && items.length === 0 && (
          <div className="px-6 py-16 flex flex-col items-center gap-2 text-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12 text-gray-300">
              <circle cx="12" cy="12" r="9" />
              <path strokeLinecap="round" d="M12 7v5l3 2" />
            </svg>
            <p className="text-sm text-gray-500">Chưa có hoạt động nào trong khoảng thời gian này</p>
          </div>
        )}

        {!isLoading && !isError && items.length > 0 && (
          <div className="divide-y divide-gray-100">
            {items.map((a, idx) => {
              const link = getActivityLink(a.type);
              return (
                <button
                  key={`${a.type}-${a.targetType}-${a.targetId}-${a.timestamp}-${idx}`}
                  onClick={() => link && navigate(link)}
                  disabled={!link}
                  className="w-full text-left px-6 py-4 hover:bg-gray-50 transition-colors duration-150 flex items-start gap-4 disabled:cursor-default disabled:hover:bg-white"
                >
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap shrink-0 mt-0.5 ${ACTIVITY_BADGE_CLASS[a.targetType]}`}
                  >
                    {ACTIVITY_TARGET_LABEL[a.targetType]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug text-gray-900 font-medium">{a.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{a.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatRelative(a.timestamp)} · {formatDateTime(a.timestamp)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {!isLoading && !isError && items.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
            <span className="text-gray-500">
              {totalPages > 1
                ? `Trang ${page + 1} / ${totalPages} · ${data?.totalElements ?? 0} hoạt động`
                : `${data?.totalElements ?? 0} hoạt động`}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Trước
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sau →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
