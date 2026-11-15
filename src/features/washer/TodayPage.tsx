import { CalendarOff, ChevronRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CarIllustration } from '@/components/app/CarIllustration';
import { WashStatusChip } from '@/components/app/WashStatusChip';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressBar } from '@/components/ui/ProgressSteps';
import { SkeletonList } from '@/components/ui/Skeleton';
import { StatusChip } from '@/components/ui/StatusChip';
import { ADD_ONS } from '@/config/business';
import { WASH_TYPE_LABEL } from '@/config/copy';
import { CAR_COLOR_LABEL, carLabel } from '@/data/cars';
import { cn } from '@/lib/cn';
import { toISODate } from '@/lib/dates';
import { formatDateLong } from '@/lib/format';
import { useInitialLoading } from '@/lib/useInitialLoading';
import { useDemoStore } from '@/store/demoStore';
import type { Car, Wash } from '@/types/domain';

const spotNumber = (car: Car) => Number(car.parkingSpot.replace(/\D/g, '')) || 0;

export function TodayPage() {
  const washerId = useDemoStore((s) => s.session.washerId);
  const washes = useDemoStore((s) => s.washes);
  const cars = useDemoStore((s) => s.cars);
  const compounds = useDemoStore((s) => s.compounds);
  const loading = useInitialLoading('washer-today');
  const now = new Date();
  const today = toISODate(now);

  const mine = washes.filter(
    (w) => w.washerId === washerId && w.scheduledDate === today && w.status !== 'weather_delayed',
  );
  const active = mine.filter((w) => w.status !== 'skipped');
  const done = active.filter((w) => w.status === 'completed').length;
  const carOf = (w: Wash) => cars.find((c) => c.id === w.carId)!;
  const todaysCompounds = compounds.filter((c) => mine.some((w) => w.compoundId === c.id));

  // Group by parking zone, in the compound's zone order, then by spot: a walking order.
  const groups = todaysCompounds.flatMap((compound) =>
    compound.parkingZones
      .map((zone) => ({
        key: `${compound.id}|${zone}`,
        zone,
        washes: mine
          .filter((w) => w.compoundId === compound.id && carOf(w).parkingZone === zone)
          .sort((a, b) => spotNumber(carOf(a)) - spotNumber(carOf(b))),
      }))
      .filter((g) => g.washes.length > 0),
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="text-ink-2 text-sm">{formatDateLong(now)}</p>
        <h1 className="text-2xl">{todaysCompounds.map((c) => c.name).join(' · ') || 'Today'}</h1>
      </div>

      {loading ? (
        <SkeletonList rows={4} />
      ) : mine.length === 0 ? (
        <Card>
          <EmptyState
            icon={CalendarOff}
            title="No washes on your route today. In Profile you can view another washer for the demo."
          />
        </Card>
      ) : (
        <>
          <Card>
            <p className="mb-2 text-xl font-semibold">
              {done} of {active.length} done
            </p>
            <ProgressBar
              value={done}
              max={active.length}
              tone="success"
              label="Washes done today"
            />
          </Card>

          {groups.map((group) => (
            <section key={group.key} aria-label={group.zone}>
              <h2 className="text-ink-2 mb-2 text-sm font-semibold tracking-wide uppercase">
                {group.zone}
              </h2>
              <ul className="space-y-2">
                {group.washes.map((wash) => {
                  const car = carOf(wash);
                  const finished = wash.status === 'completed' || wash.status === 'skipped';
                  return (
                    <li key={wash.id}>
                      <Link to={`/washer/wash/${wash.id}`}>
                        <Card
                          className={cn(
                            'flex min-h-20 items-center gap-3 p-3',
                            finished && 'opacity-60',
                          )}
                        >
                          <CarIllustration
                            bodyType={car.bodyType}
                            color={car.color}
                            state={wash.status === 'completed' ? 'clean' : 'dirty'}
                            seed={wash.beforePhotoSeed ?? 3}
                            className="h-14 w-20 shrink-0 rounded-md"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-lg leading-tight font-semibold">
                              {car.parkingSpot} · {carLabel(car)}
                            </p>
                            <p className="text-ink-2 truncate text-sm">
                              {CAR_COLOR_LABEL[car.color]} · {car.plate} ·{' '}
                              {WASH_TYPE_LABEL[wash.type]}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              <WashStatusChip status={wash.status} />
                              {wash.addOns.map((id) => (
                                <StatusChip key={id} tone="warning" icon={Sparkles}>
                                  {ADD_ONS[id].name}
                                </StatusChip>
                              ))}
                            </div>
                          </div>
                          <ChevronRight className="text-ink-2 size-6 shrink-0" aria-hidden />
                        </Card>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
