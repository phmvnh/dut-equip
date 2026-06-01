import { useRef } from 'react';
import { formatVND, parseVND } from '../utils/moneyFormat';

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: string | number | null | undefined;  // raw digits ('5000000') hoặc number
  onChange: (raw: string) => void;             // trả về raw digits string
};

// Input format theo đơn vị VNĐ: hiển thị xxx.xxx.xxx, value/onChange dùng raw digits
// Giữ caret position khi format để tránh con trỏ nhảy lung tung
export default function MoneyInput({ value, onChange, ...rest }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const display = formatVND(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const cursorPos = input.selectionStart ?? input.value.length;
    // Đếm số digit ở vị trí trước cursor → dùng để khôi phục cursor sau format
    const digitsBeforeCursor = (input.value.slice(0, cursorPos).match(/\d/g) || []).length;

    const raw = parseVND(input.value);
    const newFormatted = formatVND(raw);

    onChange(raw);

    // Set caret position sau khi React render xong
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      if (digitsBeforeCursor === 0) {
        el.setSelectionRange(0, 0);
        return;
      }
      let pos = 0;
      let count = 0;
      for (let i = 0; i < newFormatted.length; i++) {
        if (/\d/.test(newFormatted[i])) count++;
        if (count >= digitsBeforeCursor) {
          pos = i + 1;
          break;
        }
      }
      if (pos === 0) pos = newFormatted.length;
      el.setSelectionRange(pos, pos);
    });
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      value={display}
      onChange={handleChange}
      {...rest}
    />
  );
}
