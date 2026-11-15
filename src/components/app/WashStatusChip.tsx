import {
  CalendarCheck,
  CheckCircle2,
  CircleSlash,
  CloudRain,
  Droplets,
  MapPin,
  TriangleAlert,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { WashStatus } from '@/types/domain';
import { StatusChip, type Tone } from '../ui/StatusChip';

// eslint-disable-next-line react-refresh/only-export-components
export const WASH_STATUS: Record<WashStatus, { label: string; tone: Tone; icon: LucideIcon }> = {
  scheduled: { label: 'Scheduled', tone: 'primary', icon: CalendarCheck },
  washer_on_site: { label: 'Washer on site', tone: 'info', icon: MapPin },
  in_progress: { label: 'Washing now', tone: 'info', icon: Droplets },
  completed: { label: 'Completed', tone: 'success', icon: CheckCircle2 },
  skipped: { label: 'Skipped', tone: 'neutral', icon: CircleSlash },
  missed: { label: 'Missed', tone: 'danger', icon: TriangleAlert },
  weather_delayed: { label: 'Weather delay', tone: 'warning', icon: CloudRain },
};

export function WashStatusChip({ status }: { status: WashStatus }) {
  const s = WASH_STATUS[status];
  return (
    <StatusChip tone={s.tone} icon={s.icon}>
      {s.label}
    </StatusChip>
  );
}
