// Format số tiền VND: "5000000" → "5.000.000"
export function formatVND(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined || raw === '') return '';
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Strip mọi ký tự không phải số: "5.000.000" → "5000000"
export function parseVND(formatted: string): string {
  return formatted.replace(/\D/g, '');
}
