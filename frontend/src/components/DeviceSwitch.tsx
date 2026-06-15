import type { ReactElement } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';

interface DeviceSwitchProps {
  mobile: ReactElement;
  desktop: ReactElement;
}

/**
 * Chọn render giao diện mobile hoặc desktop theo bề rộng viewport.
 * Giữ nguyên URL cho cả hai — chỉ khác phần trình bày.
 */
export default function DeviceSwitch({ mobile, desktop }: DeviceSwitchProps) {
  const isMobile = useIsMobile();
  return isMobile ? mobile : desktop;
}
