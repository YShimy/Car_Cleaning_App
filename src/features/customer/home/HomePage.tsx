import {
  CalendarDays,
  CarFront,
  ChevronRight,
  Clock,
  Gift,
  MessageCircle,
  PauseCircle,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '@/components/app/Avatar';
import { Timeline, type TimelineStep } from '@/components/app/Timeline';
import { WashStatusChip } from '@/components/app/WashStatusChip';
import { Button, buttonVariants } from '@/components/ui/Button';
import { Card, SectionTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/toast';
import { ADD_ONS, PLANS, REFERRAL_FREE_WEEKS } from '@/config/business';
import { WASH_TYPE_LABEL } from '@/config/copy';
import { carLabel } from '@/data/cars';
import { cn } from '@/lib/cn';
import { toISODate } from '@/lib/dates';
import {
  firstName,
  formatDateLong,
  formatDateNumeric,
  formatDateShort,
  formatTime,
  SERVICE_WINDOW_LABEL,
} from '@/lib/format';
import { nextBillingDate } from '@/lib/rules';
import { lastCompletedWash, monthlyUsage, upcomingWashes } from '@/lib/selectors';
import { useInitialLoading } from '@/lib/useInitialLoading';
import { useDemoStore } from '@/store/demoStore';
import { useCustomer } from '@/store/hooks';
import type { Wash, Washer } from '@/types/domain';
import { SkipSheet } from '../shared/SkipSheet';
import { WashThumb } from '../shared/WashThumb';

function LiveStatus({
  wash,
  washer,
  compoundName,
}: {
  wash: Wash;
  washer: Washer;
  compoundName: string;
}) {
  const name = firstName(washer.name);
  const arrived = wash.status !== 'scheduled';
  const washing = wash.status === 'in_progress';
  const done = wash.status === 'completed';
  const steps: TimelineStep[] = [
    {
      title: arrived
        ? `${name} arrived at ${compoundName}`
        : `${name} is on the way to ${compoundName}`,
      detail: wash.arrivedAt ? formatTime(wash.arrivedAt) : `Between ${SERVICE_WINDOW_LABEL}`,
      state: arrived ? 'done' : 'current',
    },
    {
      title: done ? 'Car washed' : washing ? 'Washing your car now' : 'Washing your car',
      detail: wash.startedAt ? `Started ${formatTime(wash.startedAt)}` : undefined,
      state: done ? 'done' : washing ? 'current' : arrived ? 'current' : 'upcoming',
    },
    {
      title: 'Done — see photos',
      detail: wash.completedAt ? formatTime(wash.completedAt) : undefined,
      state: done ? 'done' : 'upcoming',
    },
  ];
  // "On site" means the washer is in the compound and this car is next.
  if (wash.status === 'washer_on_site')
    steps[1] = { ...steps[1], title: 'Your car is next', state: 'upcoming' };

  return (
    <Card aria-live="polite">
      <div className="mb-4 flex items-center justify-between gap-2">
        <SectionTitle>Today’s wash</SectionTitle>
        <WashStatusChip status={wash.status} />
      </div>
      <Timeline steps={steps} />
      {done && (
        <Link
          to={`/customer/washes/${wash.id}`}
          className={cn(buttonVariants({ block: true }), 'mt-4')}
        >
          See before and after photos
        </Link>
      )}
      <div className="border-border mt-4 flex items-center gap-3 border-t pt-4">
        <Avatar initials={washer.photoInitials} />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{washer.name}</p>
          <p className="text-ink-2 flex flex-wrap items-center gap-x-2 text-sm">
            <span className="text-success inline-flex items-center gap-1 font-medium">
              <ShieldCheck className="size-4" aria-hidden /> ID verified
            </span>
            <span className="inline-flex items-center gap-1">
              <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden />
              {washer.rating.toFixed(1)}
            </span>
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          aria-label={`Message ${name} on WhatsApp`}
          onClick={() =>
            toast.show('Demo: would open WhatsApp', `A chat with ${name} about today’s wash.`)
          }
        >
          <MessageCircle className="text-whatsapp size-4" aria-hidden />
          WhatsApp
        </Button>
      </div>
    </Card>
  );
}

export function HomePage() {
  const { customer, compound, cars, primary, subscriptions } = useCustomer();
  const washes = useDemoStore((s) => s.washes);
  const washers = useDemoStore((s) => s.washers);
  const loading = useInitialLoading('customer-home');
  const [skipping, setSkipping] = useState<Wash | null>(null);
  const now = new Date();
  const today = toISODate(now);

  const upcoming = upcomingWashes(washes, customer.id, now);
  const todays = washes.find(
    (w) =>
      w.customerId === customer.id &&
      w.scheduledDate === today &&
      ['scheduled', 'washer_on_site', 'in_progress', 'completed'].includes(w.status),
  );
  const next =
    upcoming.find((w) => w.id !== todays?.id) ??
    (todays?.status === 'scheduled' ? todays : undefined);
  const nextCar = cars.find((c) => c.id === next?.carId);
  const last = lastCompletedWash(washes, customer.id);
  const lastCar = cars.find((c) => c.id === last?.carId);
  const paused = subscriptions.find((s) => s.status === 'paused');
  const usage = primary ? monthlyUsage(washes, primary.id, now) : null;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(customer.referralCode);
      toast.success('Code copied');
    } catch {
      toast.show(`Your code is ${customer.referralCode}`);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl">Hello, {firstName(customer.name)}</h1>
        <p className="text-ink-2">{compound.name}</p>
      </div>

      {loading ? (
        <SkeletonList rows={3} />
      ) : (
        <>
          {todays && todays.status !== 'scheduled' && (
            <LiveStatus
              wash={todays}
              washer={washers.find((w) => w.id === todays.washerId)!}
              compoundName={compound.name}
            />
          )}

          {next && nextCar ? (
            <Card className="border-primary/30">
              <div className="flex items-start justify-between gap-2">
                <p className="text-ink-2 text-sm font-medium">Next wash</p>
                <WashStatusChip status={next.status} />
              </div>
              <p className="mt-1 text-2xl font-semibold">{formatDateLong(next.scheduledDate)}</p>
              <ul className="text-ink-2 mt-2 space-y-1 text-sm">
                <li className="flex items-center gap-2">
                  <Clock className="size-4 shrink-0" aria-hidden />
                  {SERVICE_WINDOW_LABEL}
                </li>
                <li className="flex items-center gap-2">
                  <CarFront className="size-4 shrink-0" aria-hidden />
                  {carLabel(nextCar)} · {nextCar.parkingSpot}
                </li>
                <li className="flex items-center gap-2">
                  <CalendarDays className="size-4 shrink-0" aria-hidden />
                  {WASH_TYPE_LABEL[next.type]}
                  {next.addOns.length > 0 &&
                    ` + ${next.addOns.map((id) => ADD_ONS[id].name).join(', ')}`}
                </li>
              </ul>
              {next.rescheduledFrom && (
                <p className="text-warning mt-2 text-sm">
                  Moved from {formatDateShort(next.rescheduledFrom)} because of the weather.
                </p>
              )}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={() => setSkipping(next)}>
                  Skip this wash
                </Button>
                <Link
                  to={`/customer/addons?wash=${next.id}`}
                  className={buttonVariants({ variant: 'secondary' })}
                >
                  Add extras
                </Link>
              </div>
            </Card>
          ) : paused ? (
            <Card>
              <div className="flex items-start gap-3">
                <PauseCircle className="text-warning mt-0.5 size-6 shrink-0" aria-hidden />
                <div>
                  <p className="font-semibold">Your subscription is paused</p>
                  <p className="text-ink-2 text-sm">
                    Washes and billing resume on {formatDateLong(paused.pausedUntil!)}.
                  </p>
                </div>
              </div>
              <Link
                to="/customer/schedule"
                className={cn(buttonVariants({ variant: 'secondary', block: true }), 'mt-4')}
              >
                Manage pause
              </Link>
            </Card>
          ) : (
            !todays && (
              <Card>
                <EmptyState icon={CalendarDays} title="You have no upcoming washes." />
              </Card>
            )
          )}

          {last && lastCar && (
            <Card>
              <SectionTitle className="mb-3">Last wash</SectionTitle>
              <Link to={`/customer/washes/${last.id}`} className="flex items-center gap-3">
                <WashThumb
                  car={lastCar}
                  beforeSeed={last.beforePhotoSeed}
                  afterSeed={last.afterPhotoSeed}
                  className="h-16 w-28 shrink-0"
                />
                <span className="flex-1">
                  <span className="block font-medium">{formatDateShort(last.scheduledDate)}</span>
                  <span className="text-ink-2 block text-sm">
                    {last.rating
                      ? `You rated it ${last.rating.stars} of 5`
                      : 'Before and after photos'}
                  </span>
                </span>
                <ChevronRight className="text-ink-2 size-5" aria-hidden />
              </Link>
              {!last.rating && (
                <Link
                  to={`/customer/washes/${last.id}#rate`}
                  className={cn(buttonVariants({ variant: 'secondary', block: true }), 'mt-3')}
                >
                  <Star className="size-4" aria-hidden />
                  Rate this wash
                </Link>
              )}
            </Card>
          )}

          {primary && usage && (
            <Card>
              <div className="flex items-center justify-between">
                <SectionTitle>Your plan</SectionTitle>
                <Link
                  to="/customer/account"
                  className="text-primary text-sm font-medium underline underline-offset-2"
                >
                  Manage
                </Link>
              </div>
              <p className="mt-1 font-medium">
                {PLANS[primary.plan].name}
                {subscriptions.length > 1 && (
                  <span className="text-ink-2 font-normal"> · {subscriptions.length} cars</span>
                )}
              </p>
              <p className="text-ink-2 mt-1 text-sm">
                This month: {usage.exteriorDone} of {usage.exteriorTotal} exterior
                {usage.interiorTotal > 0 &&
                  ` · ${usage.interiorDone} of ${usage.interiorTotal} interior`}
              </p>
              <p className="text-ink-2 text-sm">
                {primary.cancelAt
                  ? `Ends on ${formatDateNumeric(primary.cancelAt)}`
                  : `Renews on ${formatDateNumeric(nextBillingDate(primary, now))}`}
              </p>
            </Card>
          )}

          <Card className="bg-primary-soft border-primary/20 shadow-none">
            <div className="flex items-start gap-3">
              <Gift className="text-primary mt-0.5 size-6 shrink-0" aria-hidden />
              <div className="flex-1">
                <p className="font-semibold">Refer a neighbour</p>
                <p className="text-ink-2 text-sm">
                  You both get {REFERRAL_FREE_WEEKS} free week when they subscribe with your code.
                </p>
                <button
                  type="button"
                  onClick={copyCode}
                  className="border-primary text-primary bg-surface tabular mt-3 min-h-11 rounded-lg border border-dashed px-4 font-semibold tracking-wider"
                  aria-label={`Copy referral code ${customer.referralCode}`}
                >
                  {customer.referralCode}
                </button>
              </div>
            </div>
          </Card>
        </>
      )}

      <SkipSheet wash={skipping} onClose={() => setSkipping(null)} />
    </div>
  );
}
