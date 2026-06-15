import { useSyncExternalStore } from 'react';

// Ngưỡng coi là mobile — khớp Tailwind `md` (768px). Dưới ngưỡng → render giao diện mobile.
const MOBILE_QUERY = '(max-width: 767px)';

function subscribe(callback: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

function getSnapshot() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

// SSR / môi trường không có window — mặc định desktop
function getServerSnapshot() {
  return false;
}

/**
 * Phát hiện thiết bị theo bề rộng viewport (adaptive, không phải responsive).
 * Trả về true khi màn hình < 768px để chọn render component mobile riêng.
 */
export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
