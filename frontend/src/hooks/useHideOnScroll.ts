import { useEffect, useRef, useState } from 'react';

/**
 * Trả về true khi nên ẩn tầng header (đang lướt xuống và đã qua ngưỡng),
 * false khi lướt lên hoặc ở gần đỉnh trang. Dùng cho header co/giãn kiểu mobile.
 */
export function useHideOnScroll(threshold = 48): boolean {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const diff = y - lastY.current;
      // Bỏ qua rung nhỏ để tránh giật
      if (Math.abs(diff) < 6) return;
      if (y > threshold && diff > 0) setHidden(true);
      else if (diff < 0) setHidden(false);
      lastY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return hidden;
}
