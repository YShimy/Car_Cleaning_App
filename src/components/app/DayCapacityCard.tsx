import { CalendarDays, Check, Clock } from 'lucide-react';
import { cn } from '@/lib/cn';
import { WEEKDAY_LABEL } from '@/lib/dates';
import { formatDateShort, SERVICE_WINDOW_LABEL } from '@/lib/format';
import { capacityStatus } from '@/lib/rules';
import type { Weekday } from '@/types/domain';
import { StatusChip } from '../ui/StatusChip';

export function DayCapacityCard({
  day,
  nextDate,
  spotsLeft,
  selected,
  onSelect,
  onJoinWaitlist,
  locked,
}: {
  day: Weekday;
  nextDate: Date;
  spotsLeft: number;
  selected: boolean;
  onSelect?: (day: Weekday) => void;
  onJoinWaitlist?: (day: Weekday) => void;
  /** Shown as selected and not changeable (Premium uses both days). */
  locked?: boolean;
}) {
  const status = capacityStatus(spotsLeft);
  const full = status === 'full';
  const spotsLabel = `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left`;

  const body = (
    <>
      <span className="flex items-start justify-between gap-3">
        <span>
          <span className="block text-lg font-semibold">{WEEKDAY_LABEL[day]}</span>
          <span className="text-ink-2 mt-1 flex items-center gap-1.5 text-sm">
            <CalendarDays className="size-4" aria-hidden />
            Next: {formatDateShort(nextDate)}
          </span>
          <span className="text-ink-2 mt-0.5 flex items-center gap-1.5 text-sm">
            <Clock className="size-4" aria-hidden />
            {SERVICE_WINDOW_LABEL}
          </span>
        </span>
        {!full && (
          <span
            aria-hidden
            className={cn(
              'mt-1 grid size-6 shrink-0 place-items-center rounded-full border-2',
              selected ? 'border-primary bg-primary text-white' : 'border-border-strong',
            )}
          >
            {selected && <Check className="size-4" strokeWidth={3} />}
          </span>
        )}
      </span>
      <span className="mt-3 block">
        {status === 'available' && <StatusChip tone="success">{spotsLabel}</StatusChip>}
        {status === 'nearly_full' && <StatusChip tone="warning">Only {spotsLabel}</StatusChip>}
        {full && <StatusChip tone="danger">Full</StatusChip>}
      </span>
    </>
  );

  if (full) {
    return (
      <div className="rounded-card border-border bg-bg border-2 p-4" aria-disabled>
        <div className="opacity-70">{body}</div>
        <button
          type="button"
          onClick={() => onJoinWaitlist?.(day)}
          className="text-primary mt-2 min-h-11 text-sm font-semibold underline underline-offset-2"
        >
          Full — join waitlist
        </button>
      </div>
    );
  }

  return (
    <label
      className={cn(
        'rounded-card bg-surface block border-2 p-4 transition-colors',
        selected ? 'border-primary bg-primary-soft' : 'border-border',
        locked ? 'cursor-default' : 'cursor-pointer',
      )}
    >
      <input
        type={locked ? 'checkbox' : 'radio'}
        name="wash-day"
        value={day}
        checked={selected}
        disabled={locked}
        onChange={() => onSelect?.(day)}
        className="sr-only"
      />
      {body}
    </label>
  );
}
