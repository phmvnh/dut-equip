import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { inventoryApi, type InventoryEventRequest, type InventoryEventResponse, type InventoryItemInfo } from '../../api/inventoryApi';
import { useToastStore } from '../../store/toastStore';
import { printReportPDF } from '../../utils/reportPdf';

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  DRAFT:       { label: 'Nháp',         bg: '#f3f4f6', color: '#4b5563' },
  IN_PROGRESS: { label: 'Đang kiểm kê', bg: '#fef9c3', color: '#a16207' },
  COMPLETED:   { label: 'Hoàn thành',   bg: '#dcfce7', color: '#15803d' },
};

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('vi-VN');
}

function ProgressBar({ checked, total }: { checked: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((checked / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-gray-100">
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#16a34a' : '#2563eb' }}
        />
      </div>
      <span className="text-xs text-gray-500 tabular-nums whitespace-nowrap">{checked}/{total}</span>
    </div>
  );
}

export default function InventoryPage() {
  const qc = useQueryClient();
  const toast = useToastStore((s) => s.show);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<InventoryEventRequest>({ title: '', description: '', startDate: '', endDate: '' });
  const [formError, setFormError] = useState('');

  const [detailId, setDetailId] = useState<number | null>(null);
  const [checkingItem, setCheckingItem] = useState<InventoryItemInfo | null>(null);
  const [checkForm, setCheckForm] = useState({ found: true, actualLocation: '', actualCondition: '', discrepancyNote: '' });
  const [filterChecked, setFilterChecked] = useState<'ALL' | 'CHECKED' | 'UNCHECKED'>('ALL');

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: inventoryApi.getAll,
  });

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['inventory', detailId],
    queryFn: () => inventoryApi.getById(detailId!),
    enabled: detailId !== null,
  });

  const createMut = useMutation({
    mutationFn: inventoryApi.create,
    onSuccess: (ev) => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      toast(`Đã tạo đợt kiểm kê ${ev.code}`, 'success');
      setShowCreate(false);
      setForm({ title: '', description: '', startDate: '', endDate: '' });
    },
    onError: (e: any) => {
      const msg = e.response?.data?.message ?? 'Tạo đợt kiểm kê thất bại';
      setFormError(msg);
      toast(msg, 'error');
    },
  });

  const startMut = useMutation({
    mutationFn: (id: number) => inventoryApi.start(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory'] }); toast('Đã bắt đầu kiểm kê', 'success'); },
    onError: (e: any) => toast(e.response?.data?.message ?? 'Lỗi', 'error'),
  });

  const completeMut = useMutation({
    mutationFn: (id: number) => inventoryApi.complete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory'] }); toast('Đợt kiểm kê đã hoàn thành', 'success'); },
    onError: (e: any) => toast(e.response?.data?.message ?? 'Lỗi', 'error'),
  });

  const checkMut = useMutation({
    mutationFn: ({ itemId, data }: { itemId: number; data: typeof checkForm }) =>
      inventoryApi.updateItem(detailId!, itemId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory', detailId] });
      setCheckingItem(null);
      toast('Đã cập nhật kết quả kiểm kê', 'success');
    },
    onError: (e: any) => toast(e.response?.data?.message ?? 'Lỗi cập nhật', 'error'),
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setFormError('Tiêu đề không được để trống'); return; }
    createMut.mutate({ ...form, title: form.title.trim() });
  }

  function openCheckItem(item: InventoryItemInfo) {
    setCheckingItem(item);
    setCheckForm({
      found: item.found,
      actualLocation: item.actualLocation ?? item.expectedLocation ?? '',
      actualCondition: item.actualCondition ?? '',
      discrepancyNote: item.discrepancyNote ?? '',
    });
  }

  function exportInventoryReport(ev: InventoryEventResponse) {
    const items = ev.items ?? [];
    printReportPDF(
      { key: 'inventory', title: `Báo cáo kiểm kê tài sản — ${ev.code}`, fileName: `kiem-ke-${ev.code}` },
      [
        { header: 'Mã TB',      value: (i: InventoryItemInfo) => i.equipmentCode },
        { header: 'Tên thiết bị', value: (i: InventoryItemInfo) => i.equipmentName },
        { header: 'Loại',       value: (i: InventoryItemInfo) => i.equipmentType },
        { header: 'Vị trí kỳ vọng', value: (i: InventoryItemInfo) => i.expectedLocation ?? '—' },
        { header: 'Vị trí thực tế', value: (i: InventoryItemInfo) => i.actualLocation ?? '—' },
        { header: 'Tình trạng',  value: (i: InventoryItemInfo) => i.actualCondition ?? '—' },
        { header: 'Tìm thấy',   value: (i: InventoryItemInfo) => i.found ? 'Có' : 'Không' },
        { header: 'Ghi chú chênh lệch', value: (i: InventoryItemInfo) => i.discrepancyNote ?? '' },
        { header: 'Người kiểm', value: (i: InventoryItemInfo) => i.checkedByName ?? '—' },
      ],
      items,
      [
        { label: 'Tổng số thiết bị', value: String(ev.totalItems) },
        { label: 'Đã kiểm tra',      value: `${ev.checkedItems}/${ev.totalItems}` },
        { label: 'Tìm thấy đúng vị trí', value: String(ev.foundItems) },
        { label: 'Chênh lệch',       value: String(ev.checkedItems - ev.foundItems) },
      ],
    );
  }

  const filteredItems = (detail?.items ?? []).filter((item) => {
    if (filterChecked === 'CHECKED')   return item.checkedAt != null;
    if (filterChecked === 'UNCHECKED') return item.checkedAt == null;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex justify-end">
        <button
          onClick={() => { setShowCreate(true); setFormError(''); }}
          className="text-sm px-3.5 py-2 rounded-lg bg-blue-100 text-blue-800 border border-blue-300 font-medium hover:bg-blue-200"
        >
          + Tạo đợt kiểm kê
        </button>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl" style={{ border: '1px solid #e5e7eb' }}>
        {isLoading ? (
          <div className="py-12 text-center text-gray-400 text-sm">Đang tải...</div>
        ) : events.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">Chưa có đợt kiểm kê nào</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-5 py-2.5 font-medium">Mã đợt</th>
                <th className="px-5 py-2.5 font-medium">Tiêu đề</th>
                <th className="px-5 py-2.5 font-medium">Ngày tạo</th>
                <th className="px-5 py-2.5 font-medium">Tiến độ</th>
                <th className="px-5 py-2.5 font-medium">Trạng thái</th>
                <th className="px-5 py-2.5 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => {
                const s = STATUS_META[ev.status] ?? STATUS_META.DRAFT;
                return (
                  <tr key={ev.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-5 py-3 font-mono text-xs text-gray-600">{ev.code}</td>
                    <td className="px-5 py-3 font-medium text-gray-900">{ev.title}</td>
                    <td className="px-5 py-3 text-gray-500">{fmtDate(ev.createdAt)}</td>
                    <td className="px-5 py-3 w-48">
                      <ProgressBar checked={ev.checkedItems} total={ev.totalItems} />
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: s.bg, color: s.color }}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="inline-flex gap-2">
                        {ev.status === 'DRAFT' && (
                          <button
                            onClick={() => startMut.mutate(ev.id)}
                            disabled={startMut.isPending}
                            className="text-xs px-2.5 py-1 rounded-md bg-yellow-100 text-yellow-800 border border-yellow-300 hover:bg-yellow-200 font-semibold"
                          >
                            Bắt đầu
                          </button>
                        )}
                        {ev.status === 'IN_PROGRESS' && (
                          <button
                            onClick={() => completeMut.mutate(ev.id)}
                            disabled={completeMut.isPending}
                            className="text-xs px-2.5 py-1 rounded-md bg-green-100 text-green-800 border border-green-300 hover:bg-green-200 font-semibold"
                          >
                            Hoàn thành
                          </button>
                        )}
                        <button
                          onClick={() => setDetailId(ev.id)}
                          className="text-xs px-2.5 py-1 rounded-md bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200 font-semibold"
                        >
                          Chi tiết
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal tạo đợt kiểm kê */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Tạo đợt kiểm kê mới</h3>
            <form onSubmit={handleCreate} noValidate className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Tiêu đề <span className="text-red-500">*</span>
                </label>
                <input
                  autoFocus
                  value={form.title}
                  onChange={(e) => { setForm((f) => ({ ...f, title: e.target.value })); setFormError(''); }}
                  placeholder="VD: Kiểm kê tài sản năm 2025"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Ngày bắt đầu</label>
                  <input
                    type="date"
                    value={form.startDate ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Ngày kết thúc</label>
                  <input
                    type="date"
                    value={form.endDate ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Ghi chú</label>
                <textarea
                  rows={2}
                  value={form.description ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Mô tả phạm vi hoặc yêu cầu đặc biệt..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                />
              </div>
              <p className="text-[11px] text-gray-500">
                Hệ thống sẽ tự động tạo danh sách kiểm kê cho tất cả thiết bị chưa thanh lý.
              </p>
              {formError && <p className="text-xs text-red-500">{formError}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="h-9 px-4 rounded-lg bg-gray-100 text-gray-700 border border-gray-200 text-sm hover:bg-gray-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createMut.isPending}
                  className="h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
                >
                  {createMut.isPending ? 'Đang tạo...' : 'Tạo đợt kiểm kê'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal chi tiết đợt kiểm kê */}
      {detailId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setDetailId(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-semibold text-gray-900">
                  {detail ? `${detail.code} — ${detail.title}` : 'Đợt kiểm kê'}
                </h3>
                {detail && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: STATUS_META[detail.status]?.bg, color: STATUS_META[detail.status]?.color }}>
                    {STATUS_META[detail.status]?.label}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {detail && (
                  <button
                    onClick={() => exportInventoryReport(detail)}
                    className="text-xs px-2.5 py-1.5 rounded-md bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 font-medium"
                  >
                    Xuất báo cáo PDF
                  </button>
                )}
                <button
                  onClick={() => setDetailId(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Stats */}
            {detail && (
              <div className="px-6 py-3 border-b border-gray-100 grid grid-cols-4 gap-4 text-center">
                {[
                  { label: 'Tổng thiết bị', value: detail.totalItems, color: '#374151' },
                  { label: 'Đã kiểm tra',   value: detail.checkedItems, color: '#1d4ed8' },
                  { label: 'Tìm thấy đúng', value: detail.foundItems,   color: '#15803d' },
                  { label: 'Chênh lệch',    value: detail.checkedItems - detail.foundItems, color: '#b91c1c' },
                ].map((s) => (
                  <div key={s.label} className="bg-gray-50 rounded-lg py-2">
                    <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-xs text-gray-500">{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Filter */}
            <div className="px-6 py-2 border-b border-gray-100 flex gap-2">
              {(['ALL', 'UNCHECKED', 'CHECKED'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterChecked(f)}
                  className="text-xs px-3 py-1 rounded-md font-medium transition-colors"
                  style={{
                    backgroundColor: filterChecked === f ? '#2563eb' : '#f3f4f6',
                    color: filterChecked === f ? 'white' : '#4b5563',
                  }}
                >
                  {f === 'ALL' ? 'Tất cả' : f === 'UNCHECKED' ? 'Chưa kiểm' : 'Đã kiểm'}
                </button>
              ))}
            </div>

            {/* Items table */}
            <div className="flex-1 overflow-y-auto">
              {detailLoading ? (
                <div className="py-12 text-center text-gray-400 text-sm">Đang tải...</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-500 sticky top-0">
                    <tr>
                      <th className="px-5 py-2 font-medium">Mã TB</th>
                      <th className="px-5 py-2 font-medium">Tên thiết bị</th>
                      <th className="px-5 py-2 font-medium">Vị trí kỳ vọng</th>
                      <th className="px-5 py-2 font-medium whitespace-nowrap">Kết quả</th>
                      <th className="px-5 py-2 font-medium">Người kiểm</th>
                      <th className="px-5 py-2 font-medium text-right whitespace-nowrap">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-gray-400">Không có mục nào</td>
                      </tr>
                    ) : filteredItems.map((item) => (
                      <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-5 py-2.5 font-mono text-xs text-gray-600">{item.equipmentCode}</td>
                        <td className="px-5 py-2.5">
                          <div className="font-medium text-gray-900">{item.equipmentName}</div>
                          <div className="text-xs text-gray-400">{item.equipmentType}</div>
                        </td>
                        <td className="px-5 py-2.5 text-gray-500 text-xs">{item.expectedLocation ?? '—'}</td>
                        <td className="px-5 py-2.5 whitespace-nowrap">
                          {item.checkedAt ? (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                              style={{
                                backgroundColor: item.found ? '#dcfce7' : '#fee2e2',
                                color: item.found ? '#15803d' : '#b91c1c',
                              }}
                            >
                              {item.found ? 'Tìm thấy' : 'Không tìm thấy'}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">Chưa kiểm</span>
                          )}
                        </td>
                        <td className="px-5 py-2.5 text-xs text-gray-500">
                          {item.checkedByName ?? '—'}
                        </td>
                        <td className="px-5 py-2.5 text-right whitespace-nowrap">
                          {detail?.status !== 'COMPLETED' && (
                            <button
                              onClick={() => openCheckItem(item)}
                              className="text-xs px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 font-medium whitespace-nowrap min-w-[72px]"
                            >
                              {item.checkedAt ? 'Cập nhật' : 'Kiểm tra'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal kiểm tra từng thiết bị */}
      {checkingItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={() => setCheckingItem(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-gray-900 mb-1">Kết quả kiểm kê</h3>
            <p className="text-sm text-gray-500 mb-4">
              <span className="font-medium text-gray-900">{checkingItem.equipmentName}</span>
              {' '}({checkingItem.equipmentCode})
            </p>

            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-700 mb-2">Tìm thấy thiết bị?</p>
                <div className="flex gap-3">
                  {[true, false].map((v) => (
                    <label key={String(v)} className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                      checkForm.found === v ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        checked={checkForm.found === v}
                        onChange={() => setCheckForm((f) => ({ ...f, found: v }))}
                        className="accent-blue-600"
                      />
                      <span className={`text-sm font-medium ${checkForm.found === v ? 'text-blue-700' : 'text-gray-700'}`}>
                        {v ? 'Có, tìm thấy' : 'Không tìm thấy'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Vị trí thực tế</label>
                <input
                  value={checkForm.actualLocation}
                  onChange={(e) => setCheckForm((f) => ({ ...f, actualLocation: e.target.value }))}
                  placeholder={checkingItem.expectedLocation ?? 'Nhập vị trí tìm thấy...'}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tình trạng thực tế</label>
                <input
                  value={checkForm.actualCondition}
                  onChange={(e) => setCheckForm((f) => ({ ...f, actualCondition: e.target.value }))}
                  placeholder="VD: Hoạt động tốt, có vết trầy nhỏ..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {!checkForm.found && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Ghi chú chênh lệch</label>
                  <textarea
                    rows={2}
                    value={checkForm.discrepancyNote}
                    onChange={(e) => setCheckForm((f) => ({ ...f, discrepancyNote: e.target.value }))}
                    placeholder="Lý do không tìm thấy, hướng xử lý..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setCheckingItem(null)}
                className="h-9 px-4 rounded-lg bg-gray-100 text-gray-700 border border-gray-200 text-sm hover:bg-gray-200"
              >
                Hủy
              </button>
              <button
                onClick={() => checkMut.mutate({ itemId: checkingItem.id, data: checkForm })}
                disabled={checkMut.isPending}
                className="h-9 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
              >
                {checkMut.isPending ? 'Đang lưu...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
