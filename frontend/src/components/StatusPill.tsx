import type { EquipmentStatus } from '../types/equipment';
import { statusConfig } from '../utils/statusConfig';

interface StatusPillProps {
  status: EquipmentStatus;
}

export default function StatusPill({ status }: StatusPillProps) {
  const { label, color } = statusConfig[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}
