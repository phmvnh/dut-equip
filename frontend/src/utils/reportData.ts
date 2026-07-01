// Nguồn dữ liệu báo cáo — định nghĩa cột DÙNG CHUNG cho cả PDF (reportPdf.ts) và
// Excel (reportExcel.ts) để hai định dạng luôn khớp nhau. Dữ liệu lọc client-side
// từ các API đã có (borrow / maintenance / equipment).
import type { BorrowResponse } from '../api/borrowApi';
import type { MaintenanceLog } from '../types/maintenance';
import type { Equipment } from '../types/equipment';
import type { Procurement } from '../types/procurement';
import { statusConfig } from './statusConfig';

// ===== Kiểu cột chung =====
// value() luôn trả string|number để render bảng PDF và ô Excel như nhau.
export interface ReportColumn<T> {
  header: string;
  value: (row: T) => string | number;
  // gợi ý canh phải cho cột số/tiền (PDF)
  numeric?: boolean;
  // tổng cột — nhận toàn bộ rows, trả chuỗi hiển thị ở dòng "Tổng cộng" cuối bảng PDF
  total?: (rows: T[]) => string | number;
}

export interface ReportSummary {
  label: string;
  value: string;
}

export type ReportKey = 'borrow' | 'maintenance' | 'inventory' | 'procurement';

export interface ReportMeta {
  key: ReportKey;
  title: string;   // tiêu đề in hoa trên phiếu
  fileName: string; // tên file Excel (không đuôi)
}

export const REPORT_META: Record<ReportKey, ReportMeta> = {
  borrow:      { key: 'borrow',      title: 'Báo cáo mượn / trả thiết bị', fileName: 'bao-cao-muon-tra' },
  maintenance: { key: 'maintenance', title: 'Báo cáo bảo trì thiết bị',    fileName: 'bao-cao-bao-tri' },
  inventory:   { key: 'inventory',   title: 'Báo cáo tồn kho thiết bị',     fileName: 'bao-cao-ton-kho' },
  procurement: { key: 'procurement', title: 'Báo cáo mua sắm thiết bị',    fileName: 'bao-cao-mua-sam' },
};

// ===== Nhãn tiếng Việt =====
const BORROW_STATUS_VN: Record<string, string> = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đang mượn',
  RETURNED: 'Đã trả',
  OVERDUE: 'Quá hạn',
  REJECTED: 'Từ chối',
  CANCELLED: 'Đã hủy',
};

const MAINTENANCE_STATUS_VN: Record<string, string> = {
  IN_PROGRESS: 'Đang xử lý',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

const PROCUREMENT_STATUS_VN: Record<string, string> = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

const PURPOSE_VN: Record<string, string> = {
  TEACHING: 'Giảng dạy',
  PRACTICE: 'Thực hành',
  RESEARCH: 'Nghiên cứu',
  CONFERENCE: 'Hội nghị',
  EXTRACURRICULAR: 'Ngoại khóa',
  OTHER: 'Khác',
};

// ===== Helpers định dạng =====
const fmtDateTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—';
const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('vi-VN') : '—');
const fmtMoney = (v?: number | null) =>
  v != null ? Number(v).toLocaleString('vi-VN') + ' đ' : '—';

// So sánh trên phần ngày (YYYY-MM-DD) — chuỗi ISO so sánh trực tiếp được.
function inRange(iso: string | undefined, from: string, to: string): boolean {
  if (!iso) return false;
  const d = iso.slice(0, 10);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

// Đúng/trễ hạn — chỉ xét đơn đã trả
function onTimeLabel(b: BorrowResponse): string {
  if (b.status !== 'RETURNED' || !b.actualReturnDateTime) return '—';
  return new Date(b.actualReturnDateTime) <= new Date(b.returnDateTime) ? 'Đúng hạn' : 'Trễ hạn';
}

// ===== Định nghĩa cột từng báo cáo =====
export const BORROW_COLUMNS: ReportColumn<BorrowResponse>[] = [
  { header: 'Mã đơn', value: (b) => `#${b.id}` },
  { header: 'Người mượn', value: (b) => b.userName },
  { header: 'Thiết bị', value: (b) => b.equipmentName },
  { header: 'Mã TB', value: (b) => b.equipmentCode },
  { header: 'Khu', value: (b) => b.buildingName ?? '—' },
  { header: 'Phòng', value: (b) => b.room ?? '—' },
  { header: 'Mục đích', value: (b) => PURPOSE_VN[b.purpose ?? ''] ?? (b.purpose ?? '—') },
  { header: 'Ngày mượn', value: (b) => fmtDateTime(b.borrowDateTime) },
  { header: 'Hạn trả', value: (b) => fmtDateTime(b.returnDateTime) },
  { header: 'Trả thực tế', value: (b) => fmtDateTime(b.actualReturnDateTime) },
  { header: 'Trạng thái', value: (b) => BORROW_STATUS_VN[b.status] ?? b.status },
  { header: 'Đúng hạn', value: onTimeLabel },
];

export const MAINTENANCE_COLUMNS: ReportColumn<MaintenanceLog>[] = [
  { header: 'Mã phiếu', value: (m) => m.code },
  { header: 'Thiết bị', value: (m) => m.equipmentName },
  { header: 'Mã TB', value: (m) => m.equipmentCode },
  { header: 'Khu', value: (m) => m.equipmentBuildingName ?? '—' },
  { header: 'Kỹ thuật viên', value: (m) => m.technicianName ?? '—' },
  { header: 'Bắt đầu', value: (m) => fmtDate(m.startDate) },
  { header: 'Kết thúc', value: (m) => fmtDate(m.endDate) },
  {
    header: 'Chi phí',
    value: (m) => fmtMoney(m.cost),
    numeric: true,
    total: (rows) => fmtMoney(rows.reduce((s, m) => s + (m.cost ?? 0), 0)),
  },
  { header: 'Trạng thái', value: (m) => MAINTENANCE_STATUS_VN[m.status] ?? m.status },
];

export const INVENTORY_COLUMNS: ReportColumn<Equipment>[] = [
  { header: 'Mã', value: (e) => e.code },
  { header: 'Tên thiết bị', value: (e) => e.name },
  { header: 'Loại', value: (e) => e.equipTypeName },
  { header: 'Khu', value: (e) => e.buildingName },
  { header: 'Trạng thái', value: (e) => statusConfig[e.status]?.label ?? e.status },
  { header: 'Nguyên giá', value: (e) => fmtMoney(e.purchasePrice), numeric: true,
    total: (rows) => fmtMoney(rows.reduce((s, e) => s + (e.purchasePrice ?? 0), 0)) },
  { header: 'Ngày SD', value: (e) => fmtDate(e.acquisitionDate) },
  { header: 'KH/năm', value: (e) => fmtMoney(e.annualDepreciation), numeric: true },
  { header: 'Giá trị còn lại', value: (e) => fmtMoney(e.currentBookValue), numeric: true,
    total: (rows) => fmtMoney(rows.reduce((s, e) => s + (e.currentBookValue ?? 0), 0)) },
  { header: 'Bảo hành đến', value: (e) => fmtDate(e.warrantyUntil) },
];

export const PROCUREMENT_COLUMNS: ReportColumn<Procurement>[] = [
  { header: 'Mã đề nghị', value: (p) => p.code },
  { header: 'Tiêu đề', value: (p) => p.title },
  { header: 'Người đề nghị', value: (p) => p.requestedByName },
  { header: 'Nhà cung cấp', value: (p) => p.supplier ?? '—' },
  { header: 'Số mặt hàng', value: (p) => p.totalItems, numeric: true },
  { header: 'Tổng số lượng', value: (p) => p.totalQuantity, numeric: true },
  {
    header: 'Giá trị dự kiến',
    value: (p) => fmtMoney(p.estimatedTotal),
    numeric: true,
    total: (rows) => fmtMoney(rows.reduce((s, p) => s + (p.estimatedTotal ?? 0), 0)),
  },
  { header: 'Trạng thái', value: (p) => PROCUREMENT_STATUS_VN[p.status] ?? p.status },
  { header: 'Ngày tạo', value: (p) => fmtDate(p.createdAt) },
];

// ===== Lọc dữ liệu theo kỳ =====
export function filterBorrows(borrows: BorrowResponse[], from: string, to: string): BorrowResponse[] {
  return borrows
    .filter((b) => inRange(b.borrowDateTime, from, to))
    .sort((a, b) => a.borrowDateTime.localeCompare(b.borrowDateTime));
}

export function filterMaintenance(logs: MaintenanceLog[], from: string, to: string): MaintenanceLog[] {
  return logs
    .filter((m) => inRange(m.startDate, from, to))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export function sortInventory(equips: Equipment[]): Equipment[] {
  // Loại thiết bị đã thanh lý khỏi báo cáo tồn kho
  return equips
    .filter((e) => e.status !== 'DISPOSED')
    .sort((a, b) => a.code.localeCompare(b.code));
}

export function filterProcurement(items: Procurement[], from: string, to: string): Procurement[] {
  return items
    .filter((p) => inRange(p.createdAt, from, to))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

// ===== Dòng tổng kết =====
export function borrowSummary(rows: BorrowResponse[]): ReportSummary[] {
  const returned = rows.filter((b) => b.status === 'RETURNED');
  const onTime = returned.filter(
    (b) => b.actualReturnDateTime && new Date(b.actualReturnDateTime) <= new Date(b.returnDateTime),
  ).length;
  const overdue = rows.filter((b) => b.status === 'OVERDUE').length;
  return [
    { label: 'Tổng số đơn', value: String(rows.length) },
    { label: 'Đã trả đúng hạn', value: `${onTime}/${returned.length}` },
    { label: 'Đang quá hạn', value: String(overdue) },
  ];
}

export function maintenanceSummary(rows: MaintenanceLog[]): ReportSummary[] {
  const totalCost = rows.reduce((s, m) => s + (m.cost ?? 0), 0);
  const completed = rows.filter((m) => m.status === 'COMPLETED').length;
  return [
    { label: 'Tổng số phiếu', value: String(rows.length) },
    { label: 'Đã hoàn thành', value: String(completed) },
    { label: 'Tổng chi phí', value: fmtMoney(totalCost) },
  ];
}

export function inventorySummary(rows: Equipment[]): ReportSummary[] {
  const count = (s: string) => rows.filter((e) => e.status === s).length;
  return [
    { label: 'Tổng thiết bị', value: String(rows.length) },
    { label: 'Sẵn sàng', value: String(count('AVAILABLE')) },
    { label: 'Đang mượn', value: String(count('BORROWED')) },
    { label: 'Bảo trì / Hỏng', value: String(count('MAINTENANCE') + count('BROKEN')) },
  ];
}

export function procurementSummary(rows: Procurement[]): ReportSummary[] {
  const completed = rows.filter((p) => p.status === 'COMPLETED').length;
  const totalValue = rows.reduce((s, p) => s + (p.estimatedTotal ?? 0), 0);
  return [
    { label: 'Tổng số đề nghị', value: String(rows.length) },
    { label: 'Đã hoàn thành', value: String(completed) },
    { label: 'Tổng giá trị dự kiến', value: fmtMoney(totalValue) },
  ];
}
