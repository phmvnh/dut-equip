import { useEffect, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import type { Equipment } from '../types/equipment';

interface Props {
  equipment: Equipment;
  onClose: () => void;
}

export default function QrDownloadModal({ equipment, onClose }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  // URL encode trong QR — dùng origin hiện tại để dev/prod tự khớp
  const qrUrl = `${window.location.origin}/q/${encodeURIComponent(equipment.code)}`;

  function handleDownload() {
    const canvas = wrapRef.current?.querySelector('canvas');
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `qr-${equipment.code}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Mã QR thiết bị</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div ref={wrapRef} className="p-3 bg-white rounded-xl border border-gray-200">
          <QRCodeCanvas
            value={qrUrl}
            size={256}
            level="H"
            marginSize={2}
            bgColor="#ffffff"
            fgColor="#000000"
          />
        </div>

        <div className="w-full text-center">
          <p className="text-sm font-semibold text-gray-900 truncate" title={equipment.name}>
            {equipment.name}
          </p>
          <p className="text-xs font-mono text-gray-500">{equipment.code}</p>
        </div>

        <p className="text-[11px] text-gray-400 text-center break-all px-2">
          {qrUrl}
        </p>

        <div className="w-full flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 h-9 rounded-lg bg-gray-100 text-gray-700 border border-gray-300 text-sm hover:bg-gray-200"
          >
            Đóng
          </button>
          <button
            onClick={handleDownload}
            className="flex-1 h-9 rounded-lg bg-blue-100 text-blue-800 border border-blue-300 text-sm font-semibold hover:bg-blue-200 inline-flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Tải PNG
          </button>
        </div>
      </div>
    </div>
  );
}
