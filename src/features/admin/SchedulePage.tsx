import { CalendarOff, CloudRain } from 'lucide-react';
import { useState } from 'react';
import { WashStatusChip } from '@/components/app/WashStatusChip';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { toast } from '@/components/ui/toast';
import { ADD_ONS } from '@/config/business';
import { WASH_TYPE_LABEL } from '@/config/copy';
import { carLabel } from '@/data/cars';
import { cn } from '@/lib/cn';
import { toISODate, WEEKDAY_LABEL, weekdayOf } from '@/lib/dates';
import { formatDateLong, formatTime } from '@/lib/format';
import { weatherDelayTarget } from '@/lib/rules';
import { useDemoStore } from '@/store/demoStore';
import type { Wash } from '@/types/domain';
import { AdminPage, FilterSelect } from './shared';

const BORDER: Record<Wash['status'], string> = {
  scheduled: 'border-l-primary',
  washer_on_site: 'border-l-info',
  in_progress: 'border-l-info',
  completed: 'border-l-success',
  skipped: 'border-l-border-strong',
  missed: 'border-l-danger',
  weather_delayed: 'border-l-amber-500',
};

/** Live work first, then what is still to do, then what is finished. */
const ORDER: Wash['status'][] = [
  'in_progress',
  'washer_on_site',
  'scheduled',
  'completed',
  'missed',
  'skipped',
  'weather_delayed',
];

export function SchedulePage() {
  const compounds = useDemoStore((s) => s.compounds);
  const washes = useDemoStore((s) => s.washes);
  const cars = useDemoStore((s) => s.cars);
  const customers = useDemoStore((s) => s.customers);
  const washers = useDemoStore((s) => s.washers);
  const today = toISODate(new Date());
  const [date, setDate] = useState(today);
  const [washerId, setWasherId] = useState('all');

  const weekday = weekdayOf(date);
  const dayWashes = washes.filter(
    (w) => w.scheduledDate === date && (washerId === 'all' || w.washerId === washerId),
  );
  const columns = compounds
    .filter(
      (c) =>
        c.serviceDays.includes(weekday) ||
        washes.some((w) => w.compoundId === c.id && w.scheduledDate === date),
    )
    .map((compound) => ({
      compound,
      washes: dayWashes.filter((w) => w.compoundId === compound.id),
    }))
    .filter((col) => col.washes.length > 0 || col.compound.status !== 'onboarding');
  const activeWashers = washers.filter((w) =>
    washes.some((x) => x.scheduledDate === date && x.washerId === w.id),
  );

  const delay = (compoundId: string, name: string) => {
    const { moved, movedTo } = useDemoStore.getState().markWeatherDelay(compoundId, date);
    toast.success(
      `${name}: ${moved} washes moved`,
      `New date ${formatDateLong(movedTo)}. Customers have been notified.`,
    );
  };

  return (
    <AdminPage
      title="Schedule board"
      subtitle={`${formatDateLong(date)} · ${dayWashes.length} washes`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-ink-2 flex items-center gap-1.5 text-sm">
            Date
            <input
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="border-border-strong text-ink bg-surface rounded-btn min-h-10 border px-2 text-sm"
            />
          </label>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setDate(today)}
            disabled={date === today}
          >
            Today
          </Button>
          <FilterSelect label="Washer" value={washerId} onChange={setWasherId}>
            <option value="all">All washers</option>
            {activeWashers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </FilterSelect>
        </div>
      }
    >
      {columns.length === 0 ? (
        <Card>
          <EmptyState
            icon={CalendarOff}
            title={`No compound is served on ${WEEKDAY_LABEL[weekday]}s.`}
          />
        </Card>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {columns.map(({ compound, washes: list }) => {
            const pending = list.filter(
              (w) => w.status === 'scheduled' || w.status === 'washer_on_site',
            ).length;
            const done = list.filter((w) => w.status === 'completed').length;
            return (
              <section
                key={compound.id}
                className="bg-border/40 rounded-card w-80 shrink-0 p-3"
                aria-label={compound.name}
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold">{compound.name}</h2>
                    <p className="text-ink-2 text-sm">
                      {done} of{' '}
                      {
                        list.filter((w) => w.status !== 'skipped' && w.status !== 'weather_delayed')
                          .length
                      }{' '}
                      done
                    </p>
                  </div>
                  {date >= today && pending > 0 && washerId === 'all' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => delay(compound.id, compound.name)}
                      title={`Moves ${pending} washes to ${formatDateLong(weatherDelayTarget(compound.serviceDays, date))}`}
                    >
                      <CloudRain className="size-4" aria-hidden />
                      Mark weather delay
                    </Button>
                  )}
                </div>
                {list.length === 0 ? (
                  <p className="text-ink-2 py-6 text-center text-sm">No washes match.</p>
                ) : (
                  <ul className="space-y-2">
                    {[...list]
                      .sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status))
                      .map((wash) => {
                        const car = cars.find((c) => c.id === wash.carId);
                        const customer = customers.find((c) => c.id === wash.customerId);
                        const washer = washers.find((w) => w.id === wash.washerId);
                        return (
                          <li
                            key={wash.id}
                            className={cn(
                              'bg-surface shadow-card rounded-lg border-l-4 p-3 text-sm',
                              BORDER[wash.status],
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium">
                                {car?.parkingSpot} · {car ? carLabel(car) : ''}
                              </p>
                              <WashStatusChip status={wash.status} />
                            </div>
                            <p className="text-ink-2">
                              {customer?.name} · {WASH_TYPE_LABEL[wash.type]}
                              {wash.addOns.length > 0 &&
                                ` + ${wash.addOns.map((a) => ADD_ONS[a].name).join(', ')}`}
                            </p>
                            <p className="text-ink-2 text-xs">
                              {washer?.name}
                              {wash.completedAt && ` · done ${formatTime(wash.completedAt)}`}
                              {wash.rescheduledTo &&
                                ` · moved to ${formatDateLong(wash.rescheduledTo)}`}
                              {wash.rescheduledFrom &&
                                ` · moved from ${formatDateLong(wash.rescheduledFrom)}`}
                            </p>
                          </li>
                        );
                      })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </AdminPage>
  );
}
