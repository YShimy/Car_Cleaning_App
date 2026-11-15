/**
 * Derived data. Every number shown in the dashboards comes from here,
 * computed from the store — nothing is hard-coded.
 */
import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { PLAN_ORDER, PLANS } from '@/config/business';
import type {
  Compound,
  DemoData,
  ID,
  ISODate,
  PlanId,
  Subscription,
  Wash,
  Weekday,
} from '@/types/domain';
import { addDaysISO, toISODate, weekdayOf } from './dates';
import { capacityStatus, dayCapacity, dayLoad, type CapacityStatus } from './rules';

type Data = Pick<DemoData, 'subscriptions' | 'washes' | 'issues'>;

const ACTIVE_WASH: Wash['status'][] = ['scheduled', 'washer_on_site', 'in_progress'];
export const isUpcoming = (w: Wash) => ACTIVE_WASH.includes(w.status);

export const weekStart = (now: Date) => startOfWeek(now, { weekStartsOn: 0 });

const mean = (values: number[]): number | null =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;

// ---------------------------------------------------------------- capacity

export interface DayCapacity {
  day: Weekday;
  capacity: number;
  load: number;
  left: number;
  status: CapacityStatus;
}

export function capacityByDay(compound: Compound, subscriptions: Subscription[]): DayCapacity[] {
  const capacity = dayCapacity(compound);
  return compound.serviceDays.map((day) => {
    const load = dayLoad(subscriptions, compound.id, day);
    const left = Math.max(0, capacity - load);
    return { day, capacity, load, left, status: capacityStatus(left) };
  });
}

// -------------------------------------------------------------------- KPIs

export const activeSubscriptions = (subs: Subscription[]) =>
  subs.filter((s) => s.status === 'active');

export const monthlyRecurringRevenue = (subs: Subscription[]): number =>
  activeSubscriptions(subs).reduce((sum, s) => sum + s.monthlyPrice, 0);

/** Subscriptions cancelled in the last 30 days ÷ subscriptions live 30 days ago. */
export function monthlyChurnRate(subs: Subscription[], now: Date): number {
  const today = toISODate(now);
  const from = addDaysISO(today, -30);
  const churned = subs.filter(
    (s) => s.status === 'cancelled' && s.cancelAt && s.cancelAt > from && s.cancelAt <= today,
  ).length;
  const liveAtStart = subs.filter(
    (s) => s.startedAt <= from && (s.status !== 'cancelled' || (s.cancelAt ?? '') > from),
  ).length;
  return liveAtStart ? churned / liveAtStart : 0;
}

/** Completed on the scheduled day ÷ washes that should have happened (last 30 days). */
export function onTimeRate(washes: Wash[], now: Date): number {
  const today = toISODate(now);
  const from = addDaysISO(today, -30);
  let done = 0;
  let due = 0;
  for (const w of washes) {
    if (w.scheduledDate < from || w.scheduledDate >= today || w.rescheduledFrom) continue;
    if (w.status === 'completed') {
      done++;
      due++;
    } else if (w.status === 'missed' || w.status === 'weather_delayed') due++;
  }
  return due ? done / due : 1;
}

export const averageRating = (washes: Wash[]): number | null =>
  mean(washes.flatMap((w) => (w.rating ? [w.rating.stars] : [])));

export function washesThisWeek(washes: Wash[], now: Date) {
  const from = toISODate(weekStart(now));
  const to = addDaysISO(from, 6);
  let done = 0;
  let scheduled = 0;
  for (const w of washes) {
    if (w.scheduledDate < from || w.scheduledDate > to) continue;
    if (w.status === 'completed') done++;
    else if (isUpcoming(w)) scheduled++;
  }
  return { done, scheduled };
}

export const openIssues = (issues: DemoData['issues']) =>
  issues.filter((i) => i.status !== 'resolved').length;

export function kpis(data: Data, now: Date) {
  return {
    activeSubscribers: activeSubscriptions(data.subscriptions).length,
    mrr: monthlyRecurringRevenue(data.subscriptions),
    washesThisWeek: washesThisWeek(data.washes, now),
    onTimeRate: onTimeRate(data.washes, now),
    averageRating: averageRating(data.washes),
    openIssues: openIssues(data.issues),
    churnRate: monthlyChurnRate(data.subscriptions, now),
  };
}

// ------------------------------------------------------------------ charts

/** Live subscriptions at the end of each of the last `months` months. */
export function subscriberGrowth(subs: Subscription[], now: Date, months = 6) {
  return Array.from({ length: months }, (_, i) => {
    const monthDate = addMonths(startOfMonth(now), i - (months - 1));
    const cutoffDate = i === months - 1 ? startOfDay(now) : endOfMonth(monthDate);
    const cutoff = toISODate(cutoffDate);
    const subscribers = subs.filter(
      (s) =>
        s.startedAt <= cutoff &&
        s.status !== 'pending_payment' &&
        (s.status !== 'cancelled' || (s.cancelAt ?? '') > cutoff),
    ).length;
    return { month: format(monthDate, 'MMM'), subscribers };
  });
}

export function washesPerDay(washes: Wash[], now: Date, days = 14) {
  const today = startOfDay(now);
  const counts = new Map<ISODate, number>();
  for (const w of washes) {
    if (w.status === 'completed')
      counts.set(w.scheduledDate, (counts.get(w.scheduledDate) ?? 0) + 1);
  }
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(today, i - (days - 1));
    return {
      date: toISODate(date),
      label: format(date, 'd MMM'),
      washes: counts.get(toISODate(date)) ?? 0,
    };
  });
}

export function revenueByPlan(subs: Subscription[]) {
  const active = activeSubscriptions(subs);
  return PLAN_ORDER.map((plan: PlanId) => {
    const ofPlan = active.filter((s) => s.plan === plan);
    return {
      plan: PLANS[plan].name,
      revenue: ofPlan.reduce((sum, s) => sum + s.monthlyPrice, 0),
      subscribers: ofPlan.length,
    };
  });
}

export function compoundStats(data: Pick<DemoData, 'subscriptions' | 'washes'>, compoundId: ID) {
  const subs = data.subscriptions.filter((s) => s.compoundId === compoundId);
  const washes = data.washes.filter((w) => w.compoundId === compoundId);
  return {
    subscribers: activeSubscriptions(subs).length,
    mrr: monthlyRecurringRevenue(subs),
    averageRating: averageRating(washes),
  };
}

export function todayProgress(data: Pick<DemoData, 'compounds' | 'washes' | 'washers'>, now: Date) {
  const today = toISODate(now);
  const todayWashes = data.washes.filter((w) => w.scheduledDate === today);
  return data.compounds
    .map((compound) => {
      const washes = todayWashes.filter(
        (w) =>
          w.compoundId === compound.id && w.status !== 'skipped' && w.status !== 'weather_delayed',
      );
      const washerIds = [...new Set(washes.map((w) => w.washerId))];
      return {
        compound,
        total: washes.length,
        done: washes.filter((w) => w.status === 'completed').length,
        delayed: todayWashes.some(
          (w) => w.compoundId === compound.id && w.status === 'weather_delayed',
        ),
        washers: data.washers.filter((w) => washerIds.includes(w.id)),
      };
    })
    .filter((row) => row.total > 0 || row.delayed);
}

// ---------------------------------------------------------------- customer

const byDateAsc = (a: Wash, b: Wash) =>
  a.scheduledDate < b.scheduledDate ? -1 : a.scheduledDate > b.scheduledDate ? 1 : 0;

/** Upcoming washes (today onwards, not finished), soonest first. */
export const upcomingWashes = (washes: Wash[], customerId: ID, now: Date): Wash[] => {
  const today = toISODate(now);
  return washes
    .filter((w) => w.customerId === customerId && w.scheduledDate >= today && isUpcoming(w))
    .sort(byDateAsc);
};

/** Everything that already happened (or was skipped / delayed), newest first. */
export const pastWashes = (washes: Wash[], customerId: ID): Wash[] =>
  washes
    .filter((w) => w.customerId === customerId && !isUpcoming(w))
    .sort((a, b) => -byDateAsc(a, b) || ((a.completedAt ?? '') < (b.completedAt ?? '') ? 1 : -1));

export const lastCompletedWash = (washes: Wash[], customerId: ID): Wash | undefined =>
  pastWashes(washes, customerId).find((w) => w.status === 'completed');

/** "3 of 4 exterior · 1 of 1 interior" for the current calendar month. */
export function monthlyUsage(washes: Wash[], subscriptionId: ID, now: Date) {
  const from = toISODate(startOfMonth(now));
  const to = toISODate(endOfMonth(now));
  const usage = { exteriorDone: 0, exteriorTotal: 0, interiorDone: 0, interiorTotal: 0 };
  for (const w of washes) {
    if (w.subscriptionId !== subscriptionId || w.scheduledDate < from || w.scheduledDate > to)
      continue;
    if (w.status === 'skipped' || w.status === 'missed' || w.status === 'weather_delayed') continue;
    const done = w.status === 'completed';
    usage.exteriorTotal++;
    if (done) usage.exteriorDone++;
    if (w.type === 'exterior_interior') {
      usage.interiorTotal++;
      if (done) usage.interiorDone++;
    }
  }
  return usage;
}

// ------------------------------------------------------------------ washer

export const washMinutes = (w: Wash): number | null =>
  w.startedAt && w.completedAt
    ? (new Date(w.completedAt).getTime() - new Date(w.startedAt).getTime()) / 60_000
    : null;

export function washerStats(data: Pick<DemoData, 'washes' | 'issues'>, washerId: ID, now: Date) {
  const from = toISODate(weekStart(now));
  const today = toISODate(now);
  const mine = data.washes.filter((w) => w.washerId === washerId);
  const week = mine.filter((w) => w.scheduledDate >= from && w.scheduledDate <= today);
  const weekDone = week.filter((w) => w.status === 'completed');
  const todayWashes = mine.filter((w) => w.scheduledDate === today);
  const washIds = new Set(week.map((w) => w.id));
  return {
    washesThisWeek: weekDone.length,
    doneToday: todayWashes.filter((w) => w.status === 'completed').length,
    totalToday: todayWashes.filter((w) => w.status !== 'weather_delayed').length,
    averageMinutes: mean(mine.flatMap((w) => washMinutes(w) ?? [])),
    ratingsThisWeek: weekDone.flatMap((w) => (w.rating ? [w.rating] : [])),
    averageRating: averageRating(mine),
    issuesThisWeek: data.issues.filter((i) => i.washId && washIds.has(i.washId)).length,
    flaggedToday: todayWashes.filter((w) => w.status === 'skipped' && w.skipReason !== 'customer')
      .length,
  };
}

// ----------------------------------------------------------------- manager

/** Entry and exit per washer per service day, derived from wash times. */
export function accessLog(
  data: Pick<DemoData, 'washes' | 'washers'>,
  compoundId: ID,
  now: Date,
  days = 14,
) {
  const today = toISODate(now);
  const from = addDaysISO(today, -days);
  const groups = new Map<
    string,
    { date: ISODate; washerId: ID; entry: string; exit?: string; cars: number }
  >();
  for (const w of data.washes) {
    if (w.compoundId !== compoundId || w.scheduledDate < from || w.scheduledDate > today) continue;
    const first = w.arrivedAt ?? w.startedAt;
    if (!first) continue;
    const key = `${w.scheduledDate}|${w.washerId}`;
    const g = groups.get(key) ?? {
      date: w.scheduledDate,
      washerId: w.washerId,
      entry: first,
      cars: 0,
    };
    if (first < g.entry) g.entry = first;
    if (w.completedAt && (!g.exit || w.completedAt > g.exit)) g.exit = w.completedAt;
    if (w.status === 'completed') g.cars++;
    groups.set(key, g);
  }
  // A washer still working today has not left yet.
  const stillOnSite = new Set(
    data.washes
      .filter((w) => w.compoundId === compoundId && w.scheduledDate === today && isUpcoming(w))
      .map((w) => w.washerId),
  );
  return [...groups.values()]
    .map((g) => ({
      ...g,
      exit: g.date === today && stillOnSite.has(g.washerId) ? undefined : g.exit,
      washer: data.washers.find((w) => w.id === g.washerId)!,
    }))
    .sort((a, b) =>
      a.date === b.date ? a.entry.localeCompare(b.entry) : a.date < b.date ? 1 : -1,
    );
}

export function compoundSatisfaction(
  data: Pick<DemoData, 'washes' | 'issues'>,
  compoundId: ID,
  now: Date,
) {
  const monthStart = startOfMonth(now).toISOString();
  const washes = data.washes.filter((w) => w.compoundId === compoundId && w.status === 'completed');
  const complaints = data.issues.filter(
    (i) => i.compoundId === compoundId && i.createdAt >= monthStart,
  );
  return {
    averageRating: averageRating(washes),
    ratingsCount: washes.filter((w) => w.rating).length,
    washesCompleted: washes.length,
    complaints,
    complaintsResolved: complaints.filter((i) => i.status === 'resolved').length,
  };
}

/** Cars expected on each service day of the current week. */
export function expectedCarsThisWeek(
  data: Pick<DemoData, 'washes'>,
  compound: Compound,
  now: Date,
) {
  const start = weekStart(now);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
    .filter((d) => compound.serviceDays.includes(weekdayOf(d)))
    .map((date) => {
      const iso = toISODate(date);
      const washes = data.washes.filter(
        (w) =>
          w.compoundId === compound.id &&
          w.scheduledDate === iso &&
          w.status !== 'skipped' &&
          w.status !== 'weather_delayed',
      );
      return { date, cars: washes.length, washerIds: [...new Set(washes.map((w) => w.washerId))] };
    });
}

/** "Building 14" / "Villa 27" — unit-level reference with no resident name. */
export const anonymousUnit = (unit: string): string => unit.split(',')[0];
