/**
 * Business rules as pure functions (PLAN.md section 4).
 * Nothing here reads the store or the clock: "now" is always passed in,
 * so every rule can be unit-tested.
 */
import { addDays, addMonths, differenceInCalendarDays, set, startOfDay } from 'date-fns';
import {
  ADD_ONS,
  DAMAGE_CLAIM_WINDOW_HOURS,
  FAMILY_DISCOUNT,
  NEARLY_FULL_THRESHOLD,
  PAUSE_RULES,
  PLANS,
  SKIP_CREDIT_ADD_ON,
  SKIP_CUTOFF_HOUR,
  WASHES_PER_WASHER_PER_DAY,
  WEEKS_PER_MONTH,
} from '@/config/business';
import type {
  AddOnId,
  ChecklistItem,
  Compound,
  ISODate,
  PlanId,
  Subscription,
  Wash,
  WashType,
  Weekday,
} from '@/types/domain';
import { fromISODate, toISODate, WEEKDAYS } from './dates';

// ---------------------------------------------------------------- capacity

/** Cars a compound can take on one service day. */
export const dayCapacity = (compound: Pick<Compound, 'washerIds'>): number =>
  compound.washerIds.length * WASHES_PER_WASHER_PER_DAY;

/** Cancelled subscriptions free their slot; paused and pending ones keep it. */
export const holdsSlot = (sub: Pick<Subscription, 'status'>): boolean => sub.status !== 'cancelled';

/** Subscriptions holding a slot on the given compound service day. */
export const dayLoad = (subscriptions: Subscription[], compoundId: string, day: Weekday): number =>
  subscriptions.reduce(
    (n, s) =>
      s.compoundId === compoundId && holdsSlot(s) && s.weeklyDays.includes(day) ? n + 1 : n,
    0,
  );

export const spotsLeft = (
  compound: Compound,
  subscriptions: Subscription[],
  day: Weekday,
): number => Math.max(0, dayCapacity(compound) - dayLoad(subscriptions, compound.id, day));

export type CapacityStatus = 'available' | 'nearly_full' | 'full';

export const capacityStatus = (left: number): CapacityStatus =>
  left <= 0 ? 'full' : left <= NEARLY_FULL_THRESHOLD ? 'nearly_full' : 'available';

/** Whether a plan can be placed on the chosen day(s) given current load. */
export const canSubscribeOnDays = (
  compound: Compound,
  subscriptions: Subscription[],
  days: Weekday[],
): boolean => days.every((d) => spotsLeft(compound, subscriptions, d) > 0);

// ------------------------------------------------------------------- dates

/**
 * The next date that falls on one of `days`.
 * `inclusive` allows `from` itself to count.
 */
export function nextServiceDate(days: Weekday[], from: Date, inclusive = false): Date {
  const start = startOfDay(from);
  for (let offset = inclusive ? 0 : 1; offset <= 7; offset++) {
    const candidate = addDays(start, offset);
    if (days.includes(WEEKDAYS[candidate.getDay()])) return candidate;
  }
  throw new Error('nextServiceDate: no service days given');
}

/** The next `count` service dates strictly after `from` (or including it). */
export function upcomingServiceDates(
  days: Weekday[],
  from: Date,
  count: number,
  inclusive = false,
): Date[] {
  const out: Date[] = [];
  let cursor = nextServiceDate(days, from, inclusive);
  while (out.length < count) {
    out.push(cursor);
    cursor = nextServiceDate(days, cursor);
  }
  return out;
}

/** First wash happens on the next service day after subscribing. */
export const firstWashDate = (days: Weekday[], now: Date): Date => nextServiceDate(days, now);

/** Day changes take effect next week; weeks start on Sunday. */
export function dayChangeEffectiveFrom(now: Date): Date {
  const start = startOfDay(now);
  return addDays(start, 7 - start.getDay());
}

/** A weather-delayed wash moves to the compound's next service day. */
export const weatherDelayTarget = (serviceDays: Weekday[], date: ISODate): ISODate =>
  toISODate(nextServiceDate(serviceDays, fromISODate(date)));

// -------------------------------------------------------------------- skip

/** Skipping is allowed until 8:00 PM the day before the wash. */
export const skipDeadline = (scheduledDate: ISODate): Date =>
  set(addDays(fromISODate(scheduledDate), -1), {
    hours: SKIP_CUTOFF_HOUR,
    minutes: 0,
    seconds: 0,
    milliseconds: 0,
  });

export type SkipCheck =
  { allowed: true } | { allowed: false; reason: 'past_cutoff' | 'not_scheduled' };

export function canSkip(wash: Pick<Wash, 'status' | 'scheduledDate'>, now: Date): SkipCheck {
  if (wash.status !== 'scheduled') return { allowed: false, reason: 'not_scheduled' };
  if (now.getTime() > skipDeadline(wash.scheduledDate).getTime()) {
    return { allowed: false, reason: 'past_cutoff' };
  }
  return { allowed: true };
}

// ----------------------------------------------------------------- pricing

/**
 * Monthly price of a plan for the customer's nth car (0-based).
 * Every car after the first gets the family discount.
 */
export const planPriceForCar = (plan: PlanId, carIndex: number): number => {
  const base = PLANS[plan].pricePerMonth;
  return carIndex > 0 ? Math.round(base * (1 - FAMILY_DISCOUNT)) : base;
};

/** "≈ EGP X per wash", based on the average number of washes in a month. */
export const pricePerWash = (plan: PlanId): number => {
  const p = PLANS[plan];
  return Math.round(p.pricePerMonth / (p.exteriorPerWeek * WEEKS_PER_MONTH));
};

/** Price of add-ons, using free tire-shine credits first. */
export function addOnsTotal(
  addOns: AddOnId[],
  credits = 0,
): { total: number; creditsUsed: number } {
  let remaining = credits;
  let total = 0;
  for (const id of addOns) {
    if (id === SKIP_CREDIT_ADD_ON && remaining > 0) remaining--;
    else total += ADD_ONS[id].price;
  }
  return { total, creditsUsed: credits - remaining };
}

// ----------------------------------------------------------------- billing

/** Next monthly renewal strictly after `now`, shifted by any pause. */
export function nextBillingDate(
  sub: Pick<Subscription, 'startedAt'> & { billingShiftDays?: number },
  now: Date,
): Date {
  const anchor = addDays(fromISODate(sub.startedAt), sub.billingShiftDays ?? 0);
  const today = startOfDay(now);
  let months = 1;
  // addMonths from the anchor each time so "31 Jan" does not drift to the 28th forever.
  while (addMonths(anchor, months).getTime() <= today.getTime()) months++;
  return addMonths(anchor, months);
}

/** Cancellation takes effect at the end of the paid month. */
export const cancellationDate = (sub: Pick<Subscription, 'startedAt'>, now: Date): Date =>
  nextBillingDate(sub, now);

// ------------------------------------------------------------------- pause

export type PauseCheck =
  | { allowed: true }
  | { allowed: false; reason: 'cooldown'; availableFrom: Date }
  | { allowed: false; reason: 'not_active' };

/** Pausing is allowed at most once per 3 months. */
export function canPause(
  sub: Pick<Subscription, 'status' | 'lastPausedAt'>,
  now: Date,
): PauseCheck {
  if (sub.status !== 'active') return { allowed: false, reason: 'not_active' };
  if (sub.lastPausedAt) {
    const availableFrom = addMonths(fromISODate(sub.lastPausedAt), PAUSE_RULES.cooldownMonths);
    if (startOfDay(now).getTime() < availableFrom.getTime()) {
      return { allowed: false, reason: 'cooldown', availableFrom };
    }
  }
  return { allowed: true };
}

export interface PauseEffects {
  /** Washes resume on or after this date. */
  resumeDate: Date;
  /** Billing pauses too: the renewal moves by the length of the pause. */
  billingShiftDays: number;
  nextBillingBefore: Date;
  nextBillingAfter: Date;
}

export function pauseEffects(
  sub: Pick<Subscription, 'startedAt'> & { billingShiftDays?: number },
  weeks: number,
  now: Date,
): PauseEffects {
  if (!Number.isInteger(weeks) || weeks < PAUSE_RULES.minWeeks || weeks > PAUSE_RULES.maxWeeks) {
    throw new RangeError(`Pause must be ${PAUSE_RULES.minWeeks}–${PAUSE_RULES.maxWeeks} weeks`);
  }
  const billingShiftDays = weeks * 7;
  const nextBillingBefore = nextBillingDate(sub, now);
  return {
    resumeDate: addDays(startOfDay(now), billingShiftDays),
    billingShiftDays,
    nextBillingBefore,
    nextBillingAfter: addDays(nextBillingBefore, billingShiftDays),
  };
}

// ------------------------------------------------------------------ washes

/**
 * Which washes include the interior clean.
 * Plus: the first wash of each month. Premium: the first wash of the month
 * and the first wash from the 15th, both on the first weekly day.
 */
export function washTypeFor(plan: PlanId, weeklyDays: Weekday[], date: Date): WashType {
  const interior = PLANS[plan].interiorPerMonth;
  if (interior === 0) return 'exterior';
  if (WEEKDAYS[date.getDay()] !== weeklyDays[0]) return 'exterior';
  const dom = date.getDate();
  if (dom <= 7) return 'exterior_interior';
  if (interior === 2 && dom >= 15 && dom <= 21) return 'exterior_interior';
  return 'exterior';
}

const EXTERIOR_ITEMS: ChecklistItem[] = ['exterior_body', 'windows', 'wheels_rims', 'mirrors'];
const INTERIOR_ITEMS: ChecklistItem[] = ['interior_vacuum', 'dashboard', 'floor_mats'];

export const CHECKLIST_LABEL: Record<ChecklistItem, string> = {
  exterior_body: 'Exterior body',
  windows: 'Windows',
  wheels_rims: 'Wheels and rims',
  mirrors: 'Mirrors',
  interior_vacuum: 'Interior vacuum',
  dashboard: 'Dashboard',
  floor_mats: 'Floor mats',
  photos_taken: 'Before and after photos',
};

/** Checklist items a washer must tick for this wash. */
export function requiredChecklist(type: WashType, addOns: AddOnId[]): ChecklistItem[] {
  const needsInterior =
    type === 'exterior_interior' ||
    addOns.includes('deep_interior') ||
    addOns.includes('seat_shampoo');
  return [...EXTERIOR_ITEMS, ...(needsInterior ? INTERIOR_ITEMS : []), 'photos_taken'];
}

/** Damage must be reported within 24 hours of the wash. */
export function canReportDamage(wash: Pick<Wash, 'status' | 'completedAt'>, now: Date): boolean {
  if (wash.status !== 'completed' || !wash.completedAt) return false;
  const hours = (now.getTime() - new Date(wash.completedAt).getTime()) / 3_600_000;
  return hours >= 0 && hours <= DAMAGE_CLAIM_WINDOW_HOURS;
}

/** Days until a date, for copy like "in 2 days". */
export const daysUntil = (date: ISODate, now: Date): number =>
  differenceInCalendarDays(fromISODate(date), startOfDay(now));
