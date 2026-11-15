import { addDays } from 'date-fns';
import {
  CalendarDays,
  CalendarSync,
  CloudRain,
  PauseCircle,
  PlayCircle,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DayCapacityCard } from '@/components/app/DayCapacityCard';
import { WashStatusChip } from '@/components/app/WashStatusChip';
import { Button } from '@/components/ui/Button';
import { Card, SectionTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SelectField } from '@/components/ui/Field';
import { BottomSheet } from '@/components/ui/Sheet';
import { StatusChip } from '@/components/ui/StatusChip';
import { toast } from '@/components/ui/toast';
import { ADD_ONS, PAUSE_RULES, PLANS } from '@/config/business';
import { WASH_TYPE_LABEL } from '@/config/copy';
import { carLabel } from '@/data/cars';
import { cn } from '@/lib/cn';
import { toISODate, WEEKDAY_LABEL } from '@/lib/dates';
import {
  formatDateLong,
  formatDateNumeric,
  formatDateShort,
  SERVICE_WINDOW_LABEL,
} from '@/lib/format';
import {
  canPause,
  canSkip,
  dayChangeEffectiveFrom,
  nextServiceDate,
  pauseEffects,
} from '@/lib/rules';
import { capacityByDay, upcomingWashes } from '@/lib/selectors';
import { useDemoStore } from '@/store/demoStore';
import { useCustomer } from '@/store/hooks';
import type { Car, Subscription, Wash, Weekday } from '@/types/domain';
import { attempt } from '../shared/attempt';
import { SkipSheet } from '../shared/SkipSheet';

function CarPicker({
  subs,
  cars,
  value,
  onChange,
}: {
  subs: Subscription[];
  cars: Car[];
  value: string;
  onChange: (id: string) => void;
}) {
  if (subs.length < 2) return null;
  return (
    <SelectField label="Car" value={value} onChange={(e) => onChange(e.target.value)}>
      {subs.map((s) => {
        const car = cars.find((c) => c.id === s.carId);
        return (
          <option key={s.id} value={s.id}>
            {car ? carLabel(car) : 'Car'} · {PLANS[s.plan].name}
          </option>
        );
      })}
    </SelectField>
  );
}

function PauseSheet({
  subs,
  cars,
  onClose,
}: {
  subs: Subscription[];
  cars: Car[];
  onClose: () => void;
}) {
  const [subId, setSubId] = useState(subs[0].id);
  const [weeks, setWeeks] = useState(2);
  const sub = subs.find((s) => s.id === subId)!;
  const now = new Date();
  const check = canPause(sub, now);
  const effects = pauseEffects(sub, weeks, now);

  const pause = () => {
    if (attempt(() => useDemoStore.getState().pauseSubscription(sub.id, weeks))) {
      toast.success(
        'Subscription paused',
        `Washes resume from ${formatDateLong(effects.resumeDate)}.`,
      );
      onClose();
    }
  };

  return (
    <BottomSheet
      open
      onOpenChange={(open) => !open && onClose()}
      title="Pause subscription"
      description="Going away? Pause for 1 to 4 weeks. Billing pauses too."
      footer={
        check.allowed ? (
          <Button block onClick={pause}>
            Pause for {weeks} week{weeks > 1 ? 's' : ''}
          </Button>
        ) : (
          <Button block variant="secondary" onClick={onClose}>
            OK
          </Button>
        )
      }
    >
      <div className="space-y-4">
        <CarPicker subs={subs} cars={cars} value={subId} onChange={setSubId} />
        {check.allowed ? (
          <>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">How long?</legend>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: PAUSE_RULES.maxWeeks }, (_, i) => i + 1).map((n) => (
                  <label
                    key={n}
                    className={cn(
                      'rounded-btn grid min-h-14 cursor-pointer place-items-center border-2 text-center font-semibold',
                      weeks === n ? 'border-primary bg-primary-soft text-primary' : 'border-border',
                    )}
                  >
                    <input
                      type="radio"
                      name="pause-weeks"
                      className="sr-only"
                      checked={weeks === n}
                      onChange={() => setWeeks(n)}
                    />
                    <span>
                      {n}
                      <span className="block text-xs font-normal">week{n > 1 ? 's' : ''}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <ul className="bg-bg rounded-card space-y-2 p-3 text-sm" aria-live="polite">
              <li>
                <span className="text-ink-2">No washes until:</span>{' '}
                <strong className="font-semibold">{formatDateLong(effects.resumeDate)}</strong>
              </li>
              <li>
                <span className="text-ink-2">Next payment moves from</span>{' '}
                {formatDateNumeric(effects.nextBillingBefore)}{' '}
                <span className="text-ink-2">to</span>{' '}
                <strong className="font-semibold">
                  {formatDateNumeric(effects.nextBillingAfter)}
                </strong>
              </li>
              <li className="text-ink-2">
                You can pause once every {PAUSE_RULES.cooldownMonths} months. Your wash day is kept
                for you.
              </li>
            </ul>
          </>
        ) : (
          <p role="alert">
            {check.reason === 'cooldown'
              ? `You can pause once every ${PAUSE_RULES.cooldownMonths} months. You can pause again from ${formatDateLong(check.availableFrom)}.`
              : 'This subscription is already paused.'}
          </p>
        )}
      </div>
    </BottomSheet>
  );
}

function ChangeDaySheet({
  subs,
  cars,
  onClose,
}: {
  subs: Subscription[];
  cars: Car[];
  onClose: () => void;
}) {
  const { compound } = useCustomer();
  const allSubs = useDemoStore((s) => s.subscriptions);
  const [subId, setSubId] = useState(subs[0].id);
  const [day, setDay] = useState<Weekday | null>(null);
  const sub = subs.find((s) => s.id === subId)!;
  const now = new Date();
  const premium = sub.weeklyDays.length > 1;
  const others = capacityByDay(compound, allSubs).filter((d) => !sub.weeklyDays.includes(d.day));
  const effective = dayChangeEffectiveFrom(now);

  const change = () => {
    if (!day) return;
    if (attempt(() => useDemoStore.getState().changeWeeklyDay(sub.id, day))) {
      toast.success(
        `Wash day changed to ${WEEKDAY_LABEL[day]}`,
        `Starts the week of ${formatDateShort(effective)}.`,
      );
      onClose();
    }
  };

  return (
    <BottomSheet
      open
      onOpenChange={(open) => !open && onClose()}
      title="Change wash day"
      description={
        premium
          ? undefined
          : `Your current day is ${WEEKDAY_LABEL[sub.weeklyDays[0]]}. The change starts next week.`
      }
      footer={
        premium ? (
          <Button block variant="secondary" onClick={onClose}>
            OK
          </Button>
        ) : (
          <Button block disabled={!day} onClick={change}>
            {day ? `Change to ${WEEKDAY_LABEL[day]}` : 'Choose a day'}
          </Button>
        )
      }
    >
      <div className="space-y-4">
        <CarPicker
          subs={subs}
          cars={cars}
          value={subId}
          onChange={(id) => {
            setSubId(id);
            setDay(null);
          }}
        />
        {premium ? (
          <p>
            Premium cars are washed on both of your compound’s wash days, so there is no day to
            change.
          </p>
        ) : (
          others.map((d) => (
            <DayCapacityCard
              key={d.day}
              day={d.day}
              nextDate={nextServiceDate([d.day], addDays(effective, -1))}
              spotsLeft={d.left}
              selected={day === d.day}
              onSelect={setDay}
              onJoinWaitlist={(full) =>
                toast.show(
                  `You are on the ${WEEKDAY_LABEL[full]} waitlist`,
                  'We will message you if a spot opens.',
                )
              }
            />
          ))
        )}
      </div>
    </BottomSheet>
  );
}

export function SchedulePage() {
  const { customer, cars, subscriptions } = useCustomer();
  const washes = useDemoStore((s) => s.washes);
  const [skipping, setSkipping] = useState<Wash | null>(null);
  const [sheet, setSheet] = useState<'pause' | 'day' | null>(null);
  const now = new Date();
  const today = toISODate(now);

  const upcoming = upcomingWashes(washes, customer.id, now).slice(0, 4);
  // Washes recently moved by the weather, so the customer sees what happened.
  const delayed = washes.filter(
    (w) =>
      w.customerId === customer.id &&
      w.status === 'weather_delayed' &&
      (w.rescheduledTo ?? '') >= today,
  );
  const paused = subscriptions.filter((s) => s.status === 'paused');
  const pausable = subscriptions.filter((s) => s.status === 'active');
  const pendingChange = subscriptions.find(
    (s) => s.pendingDayChange && s.pendingDayChange.effectiveFrom > today,
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl">Schedule</h1>

      {paused.map((sub) => (
        <Card key={sub.id} className="border-warning/30 bg-warning-soft shadow-none">
          <p className="flex items-center gap-2 font-semibold">
            <PauseCircle className="text-warning size-5" aria-hidden />
            Paused until {formatDateLong(sub.pausedUntil!)}
          </p>
          <p className="text-ink-2 mt-1 text-sm">No washes and no billing until then.</p>
          <Button
            variant="secondary"
            block
            className="mt-3"
            onClick={() => {
              useDemoStore.getState().resumeSubscription(sub.id);
              toast.success('Welcome back', 'Your washes are back on the schedule.');
            }}
          >
            <PlayCircle className="size-5" aria-hidden />
            Resume now
          </Button>
        </Card>
      ))}

      {pendingChange?.pendingDayChange && (
        <p className="bg-primary-soft text-primary rounded-card px-3 py-2.5 text-sm">
          Your wash day changes to {WEEKDAY_LABEL[pendingChange.pendingDayChange.to]} from{' '}
          {formatDateShort(pendingChange.pendingDayChange.effectiveFrom)}.
        </p>
      )}

      {delayed.map((wash) => (
        <Card key={wash.id} className="flex items-start gap-3">
          <CloudRain className="text-warning mt-0.5 size-6 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">Weather delay</p>
            <p className="text-ink-2 text-sm">
              Your {formatDateShort(wash.scheduledDate)} wash moved to{' '}
              <strong className="text-ink font-semibold">
                {formatDateLong(wash.rescheduledTo!)}
              </strong>
              .
            </p>
          </div>
        </Card>
      ))}

      <section aria-labelledby="upcoming-title">
        <SectionTitle id="upcoming-title" className="mb-3">
          Upcoming washes
        </SectionTitle>
        {upcoming.length === 0 ? (
          <Card>
            <EmptyState
              icon={CalendarDays}
              title={
                paused.length ? 'No washes while you are paused.' : 'You have no upcoming washes.'
              }
            />
          </Card>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((wash) => {
              const car = cars.find((c) => c.id === wash.carId);
              const skippable = canSkip(wash, now).allowed;
              return (
                <li key={wash.id}>
                  <Card>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-lg font-semibold">
                          {formatDateLong(wash.scheduledDate)}
                        </p>
                        <p className="text-ink-2 text-sm">
                          {SERVICE_WINDOW_LABEL} · {WASH_TYPE_LABEL[wash.type]}
                          {cars.length > 1 && car ? ` · ${carLabel(car)}` : ''}
                        </p>
                      </div>
                      {wash.status !== 'scheduled' && <WashStatusChip status={wash.status} />}
                    </div>
                    {(wash.addOns.length > 0 || wash.rescheduledFrom) && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {wash.rescheduledFrom && (
                          <StatusChip tone="warning" icon={CloudRain}>
                            Moved from {formatDateShort(wash.rescheduledFrom)}
                          </StatusChip>
                        )}
                        {wash.addOns.map((id) => (
                          <StatusChip key={id} tone="primary" icon={Sparkles}>
                            {ADD_ONS[id].name}
                          </StatusChip>
                        ))}
                      </div>
                    )}
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSkipping(wash)}
                        aria-label={`Skip wash on ${formatDateLong(wash.scheduledDate)}`}
                      >
                        Skip
                      </Button>
                      <Link
                        to={`/customer/addons?wash=${wash.id}`}
                        className="text-primary hover:bg-primary-soft rounded-btn inline-flex min-h-10 items-center px-3 text-sm font-semibold"
                      >
                        Add extras
                      </Link>
                      {!skippable && wash.status === 'scheduled' && (
                        <span className="text-ink-2 ml-auto self-center text-xs">
                          Too late to skip
                        </span>
                      )}
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {subscriptions.length > 0 && (
        <section className="grid gap-2" aria-label="Manage schedule">
          {pausable.length > 0 && (
            <Button variant="secondary" block onClick={() => setSheet('pause')}>
              <PauseCircle className="size-5" aria-hidden />
              Pause subscription
            </Button>
          )}
          <Button variant="secondary" block onClick={() => setSheet('day')}>
            <CalendarSync className="size-5" aria-hidden />
            Change wash day
          </Button>
        </section>
      )}

      <SkipSheet wash={skipping} onClose={() => setSkipping(null)} />
      {sheet === 'pause' && pausable.length > 0 && (
        <PauseSheet subs={pausable} cars={cars} onClose={() => setSheet(null)} />
      )}
      {sheet === 'day' && (
        <ChangeDaySheet subs={subscriptions} cars={cars} onClose={() => setSheet(null)} />
      )}
    </div>
  );
}
