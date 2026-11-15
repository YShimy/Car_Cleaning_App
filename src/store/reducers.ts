/**
 * State transitions as pure functions: (data, input, now) => changed slices.
 * The store only wires these up, so every cross-role effect (a wash completed
 * by the washer shows up for the customer and in admin metrics) is testable
 * without React.
 */
import { addDays, startOfDay, startOfWeek } from 'date-fns';
import { ADD_ONS, PLANS, SKIP_CREDIT_ADD_ON } from '@/config/business';
import { carLabel } from '@/data/cars';
import { PERSONA_FUTURE_DAYS } from '@/data/generate';
import { fromISODate, toISODate, WEEKDAY_LABEL, WEEKDAYS } from '@/lib/dates';
import { firstName, formatDateLong, formatDateShort, SERVICE_WINDOW_SENTENCE } from '@/lib/format';
import {
  canPause,
  cancellationDate,
  canSkip,
  dayChangeEffectiveFrom,
  firstWashDate,
  pauseEffects,
  planPriceForCar,
  spotsLeft,
  washTypeFor,
  weatherDelayTarget,
} from '@/lib/rules';
import { plannedWashDates } from '@/lib/schedule';
import { isUpcoming } from '@/lib/selectors';
import type {
  AddOnId,
  Car,
  Customer,
  DamageMarker,
  DemoData,
  ID,
  Issue,
  IssueStatus,
  IssueType,
  Notification,
  Payment,
  PaymentMethod,
  PlanId,
  Subscription,
  Wash,
  Weekday,
} from '@/types/domain';

export type Patch = Partial<DemoData>;

export class RuleError extends Error {}

let counter = 0;
/** Runtime IDs only need to be unique within this browser. */
export const uid = (prefix: string): ID =>
  `${prefix}_${Date.now().toString(36)}${(counter++).toString(36)}`;

const replace = <T extends { id: ID }>(items: T[], id: ID, fn: (item: T) => T): T[] =>
  items.map((item) => (item.id === id ? fn(item) : item));

const must = <T>(value: T | undefined, what: string): T => {
  if (value === undefined) throw new RuleError(`${what} not found`);
  return value;
};

function notification(
  customerId: ID,
  kind: Notification['kind'],
  title: string,
  body: string,
  now: Date,
  link?: string,
): Notification {
  return {
    id: uid('ntf'),
    customerId,
    createdAt: now.toISOString(),
    read: false,
    kind,
    title,
    body,
    ...(link ? { link } : {}),
  };
}

/** The compound washer with the fewest washes on that date. */
function pickWasher(data: DemoData, compoundId: ID, date: string, extra: Wash[] = []): ID {
  const compound = must(
    data.compounds.find((c) => c.id === compoundId),
    'Compound',
  );
  const count = (washerId: ID) =>
    [...data.washes, ...extra].filter(
      (w) =>
        w.washerId === washerId &&
        w.scheduledDate === date &&
        w.status !== 'skipped' &&
        w.status !== 'weather_delayed',
    ).length;
  return [...compound.washerIds].sort((a, b) => count(a) - count(b))[0];
}

/**
 * Makes a subscription's scheduled washes (from tomorrow) match its current
 * plan, days, pause and cancellation. Washes already on a planned date are
 * kept (with their add-ons); others are removed; missing ones are added.
 */
function syncUpcomingWashes(data: DemoData, sub: Subscription, now: Date, fromDate?: Date): Wash[] {
  const today = startOfDay(now);
  const todayISO = toISODate(today);
  const from = fromDate ?? addDays(today, 1);
  const planned = plannedWashDates(sub, from, addDays(today, PERSONA_FUTURE_DAYS)).map(toISODate);
  const kept: Wash[] = [];
  const existingDates = new Set<string>();
  for (const w of data.washes) {
    const mine =
      w.subscriptionId === sub.id && w.status === 'scheduled' && w.scheduledDate > todayISO;
    if (!mine) kept.push(w);
    else if (planned.includes(w.scheduledDate) || w.rescheduledFrom) {
      existingDates.add(w.scheduledDate);
      kept.push({
        ...w,
        type: washTypeFor(sub.plan, sub.weeklyDays, fromISODate(w.scheduledDate)),
      });
    }
  }
  const added: Wash[] = [];
  for (const date of planned) {
    if (existingDates.has(date)) continue;
    added.push({
      id: uid('wash'),
      subscriptionId: sub.id,
      carId: sub.carId,
      customerId: sub.customerId,
      compoundId: sub.compoundId,
      washerId: pickWasher({ ...data, washes: kept }, sub.compoundId, date, added),
      scheduledDate: date,
      type: washTypeFor(sub.plan, sub.weeklyDays, fromISODate(date)),
      addOns: [],
      status: 'scheduled',
    });
  }
  return [...kept, ...added];
}

// --------------------------------------------------------------- subscribe

export interface SubscribeInput {
  /** Existing customer adding another car; omit for a new customer. */
  customerId?: ID;
  name?: string;
  phone?: string;
  compoundId: ID;
  unit?: string;
  car: Omit<Car, 'id' | 'customerId'>;
  plan: PlanId;
  weeklyDays: Weekday[];
  paymentMethod: PaymentMethod;
  firstWashAddOns?: AddOnId[];
}

export function subscribe(
  data: DemoData,
  input: SubscribeInput,
  now: Date,
): { patch: Patch; customerId: ID; subscriptionId: ID; firstWashId: ID | null } {
  const compound = must(
    data.compounds.find((c) => c.id === input.compoundId),
    'Compound',
  );
  for (const day of input.weeklyDays) {
    if (!compound.serviceDays.includes(day))
      throw new RuleError(`${WEEKDAY_LABEL[day]} is not a wash day here.`);
    if (spotsLeft(compound, data.subscriptions, day) <= 0) {
      throw new RuleError(
        `${WEEKDAY_LABEL[day]} is full. Choose another day or join the waitlist.`,
      );
    }
  }
  const todayISO = toISODate(now);
  const existing = input.customerId
    ? data.customers.find((c) => c.id === input.customerId)
    : undefined;
  const customer: Customer = existing ?? {
    id: uid('cust'),
    name: input.name?.trim() || 'New Resident',
    phone: input.phone ?? '',
    compoundId: compound.id,
    unit: input.unit ?? '',
    referralCode: `${firstName(input.name?.trim() || 'Friend').toUpperCase()}${10 + (now.getTime() % 90)}`,
    joinedAt: todayISO,
    notificationPrefs: { whatsapp: true, push: true },
    addOnCredits: 0,
  };
  const car: Car = { ...input.car, id: uid('car'), customerId: customer.id };
  const carIndex = data.subscriptions.filter(
    (s) => s.customerId === customer.id && s.status !== 'cancelled',
  ).length;
  const sub: Subscription = {
    id: uid('sub'),
    customerId: customer.id,
    carId: car.id,
    compoundId: compound.id,
    plan: input.plan,
    weeklyDays: input.weeklyDays,
    status: 'active',
    startedAt: todayISO,
    monthlyPrice: planPriceForCar(input.plan, carIndex),
    paymentMethod: input.paymentMethod,
  };

  const washes = syncUpcomingWashes(data, sub, now);
  const first = washes
    .filter((w) => w.subscriptionId === sub.id)
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0];
  const addOns = input.firstWashAddOns ?? [];
  const finalWashes =
    first && addOns.length ? replace(washes, first.id, (w) => ({ ...w, addOns })) : washes;
  const addOnsCost = addOns.reduce((sum, id) => sum + ADD_ONS[id].price, 0);

  const cash = input.paymentMethod === 'cash';
  const payment: Payment = {
    id: uid('pay'),
    customerId: customer.id,
    subscriptionId: sub.id,
    amount: sub.monthlyPrice + addOnsCost,
    method: input.paymentMethod,
    status: cash ? 'due' : 'paid',
    date: todayISO,
    description: `${PLANS[sub.plan].name} plan — ${carLabel(car)}`,
  };
  const firstDate = first ? first.scheduledDate : toISODate(firstWashDate(sub.weeklyDays, now));
  const welcome = notification(
    customer.id,
    'promo',
    existing ? 'Car added to your plan' : `Welcome to your compound's wash day`,
    `Your ${carLabel(car)} will be washed on ${formatDateLong(firstDate)} between ${SERVICE_WINDOW_SENTENCE}.`,
    now,
    '/customer/schedule',
  );

  return {
    patch: {
      customers: existing ? data.customers : [...data.customers, customer],
      cars: [...data.cars, car],
      subscriptions: [...data.subscriptions, sub],
      washes: finalWashes,
      payments: [...data.payments, payment],
      notifications: [welcome, ...data.notifications],
    },
    customerId: customer.id,
    subscriptionId: sub.id,
    firstWashId: first?.id ?? null,
  };
}

// ---------------------------------------------------- skip, pause, day, plan

export function skipWash(data: DemoData, washId: ID, now: Date): Patch {
  const wash = must(
    data.washes.find((w) => w.id === washId),
    'Wash',
  );
  const check = canSkip(wash, now);
  if (!check.allowed) {
    throw new RuleError(
      check.reason === 'past_cutoff'
        ? 'It is past 8:00 PM the day before, so this wash can no longer be skipped.'
        : 'This wash can no longer be skipped.',
    );
  }
  return {
    washes: replace(data.washes, washId, (w) => ({
      ...w,
      status: 'skipped',
      skipReason: 'customer',
    })),
    // A skipped wash is not refunded; it is credited as one free tire shine.
    customers: replace(data.customers, wash.customerId, (c) => ({
      ...c,
      addOnCredits: c.addOnCredits + 1,
    })),
  };
}

export function pauseSubscription(data: DemoData, subId: ID, weeks: number, now: Date): Patch {
  const sub = must(
    data.subscriptions.find((s) => s.id === subId),
    'Subscription',
  );
  const check = canPause(sub, now);
  if (!check.allowed) {
    throw new RuleError(
      check.reason === 'cooldown'
        ? `You can pause once every 3 months. Pausing is available again on ${formatDateLong(check.availableFrom)}.`
        : 'Only an active subscription can be paused.',
    );
  }
  const effects = pauseEffects(sub, weeks, now);
  const paused: Subscription = {
    ...sub,
    status: 'paused',
    pausedUntil: toISODate(effects.resumeDate),
    lastPausedAt: toISODate(now),
    billingShiftDays: (sub.billingShiftDays ?? 0) + effects.billingShiftDays,
  };
  return {
    subscriptions: replace(data.subscriptions, subId, () => paused),
    washes: syncUpcomingWashes(data, paused, now),
  };
}

export function resumeSubscription(data: DemoData, subId: ID, now: Date): Patch {
  const sub = must(
    data.subscriptions.find((s) => s.id === subId),
    'Subscription',
  );
  if (sub.status !== 'paused') return {};
  const resumed: Subscription = { ...sub, status: 'active' };
  delete resumed.pausedUntil;
  return {
    subscriptions: replace(data.subscriptions, subId, () => resumed),
    washes: syncUpcomingWashes(data, resumed, now),
  };
}

export function changeWeeklyDay(data: DemoData, subId: ID, toDay: Weekday, now: Date): Patch {
  const sub = must(
    data.subscriptions.find((s) => s.id === subId),
    'Subscription',
  );
  const compound = must(
    data.compounds.find((c) => c.id === sub.compoundId),
    'Compound',
  );
  if (sub.weeklyDays.length !== 1)
    throw new RuleError('Premium cars are washed on both service days.');
  if (sub.weeklyDays[0] === toDay) return {};
  if (!compound.serviceDays.includes(toDay))
    throw new RuleError(`${WEEKDAY_LABEL[toDay]} is not a wash day here.`);
  if (spotsLeft(compound, data.subscriptions, toDay) <= 0) {
    throw new RuleError(
      `${WEEKDAY_LABEL[toDay]} is full. Keep ${WEEKDAY_LABEL[sub.weeklyDays[0]]} or join the waitlist.`,
    );
  }
  const effective = dayChangeEffectiveFrom(now);
  const effectiveISO = toISODate(effective);
  const changed: Subscription = {
    ...sub,
    weeklyDays: [toDay],
    pendingDayChange: { from: sub.weeklyDays[0], to: toDay, effectiveFrom: effectiveISO },
  };
  // This week's wash stays; from next week each wash moves to the new weekday.
  const moved = data.washes.map((w) => {
    if (w.subscriptionId !== subId || w.status !== 'scheduled' || w.scheduledDate < effectiveISO)
      return w;
    const weekStart = startOfWeek(fromISODate(w.scheduledDate), { weekStartsOn: 0 });
    const date = addDays(weekStart, WEEKDAYS.indexOf(toDay));
    return {
      ...w,
      scheduledDate: toISODate(date),
      type: washTypeFor(changed.plan, changed.weeklyDays, date),
    };
  });
  const rebalanced = moved.map((w) =>
    w.subscriptionId === subId && w.status === 'scheduled' && w.scheduledDate >= effectiveISO
      ? {
          ...w,
          washerId: pickWasher(
            { ...data, washes: moved.filter((m) => m.id !== w.id) },
            sub.compoundId,
            w.scheduledDate,
          ),
        }
      : w,
  );
  return { subscriptions: replace(data.subscriptions, subId, () => changed), washes: rebalanced };
}

export function changePlan(data: DemoData, subId: ID, plan: PlanId, now: Date): Patch {
  const sub = must(
    data.subscriptions.find((s) => s.id === subId),
    'Subscription',
  );
  if (sub.plan === plan) return {};
  const compound = must(
    data.compounds.find((c) => c.id === sub.compoundId),
    'Compound',
  );
  let weeklyDays = sub.weeklyDays;
  if (plan === 'premium') {
    const extra = compound.serviceDays.filter((d) => !sub.weeklyDays.includes(d));
    for (const day of extra) {
      if (spotsLeft(compound, data.subscriptions, day) <= 0) {
        throw new RuleError(
          `Premium needs both wash days, and ${WEEKDAY_LABEL[day]} is full right now.`,
        );
      }
    }
    weeklyDays = [...compound.serviceDays];
  } else if (sub.weeklyDays.length > 1) {
    weeklyDays = [sub.weeklyDays[0]];
  }
  const carIndex = data.subscriptions
    .filter((s) => s.customerId === sub.customerId && s.status !== 'cancelled')
    .findIndex((s) => s.id === subId);
  const changed: Subscription = {
    ...sub,
    plan,
    weeklyDays,
    monthlyPrice: planPriceForCar(plan, Math.max(0, carIndex)),
  };
  return {
    subscriptions: replace(data.subscriptions, subId, () => changed),
    washes: syncUpcomingWashes(data, changed, now),
  };
}

export function requestCancellation(data: DemoData, subId: ID, reason: string, now: Date): Patch {
  const sub = must(
    data.subscriptions.find((s) => s.id === subId),
    'Subscription',
  );
  // Takes effect at the end of the paid month; washes continue until then.
  const ending: Subscription = {
    ...sub,
    cancelAt: toISODate(cancellationDate(sub, now)),
    cancelReason: reason,
  };
  return {
    subscriptions: replace(data.subscriptions, subId, () => ending),
    washes: syncUpcomingWashes(data, ending, now),
  };
}

export function undoCancellation(data: DemoData, subId: ID, now: Date): Patch {
  const sub = must(
    data.subscriptions.find((s) => s.id === subId),
    'Subscription',
  );
  const kept: Subscription = { ...sub };
  delete kept.cancelAt;
  delete kept.cancelReason;
  return {
    subscriptions: replace(data.subscriptions, subId, () => kept),
    washes: syncUpcomingWashes(data, kept, now),
  };
}

// ------------------------------------------------------------------ add-ons

export function addAddOn(data: DemoData, washId: ID, addOn: AddOnId, now: Date): Patch {
  const wash = must(
    data.washes.find((w) => w.id === washId),
    'Wash',
  );
  if (!isUpcoming(wash)) throw new RuleError('Extras can only be added to an upcoming wash.');
  if (wash.addOns.includes(addOn)) throw new RuleError('That extra is already on this wash.');
  const customer = must(
    data.customers.find((c) => c.id === wash.customerId),
    'Customer',
  );
  const sub = data.subscriptions.find((s) => s.id === wash.subscriptionId);
  const free = addOn === SKIP_CREDIT_ADD_ON && customer.addOnCredits > 0;
  const payment: Payment = {
    id: uid('pay'),
    customerId: customer.id,
    amount: free ? 0 : ADD_ONS[addOn].price,
    method: sub?.paymentMethod ?? 'card',
    status: sub?.paymentMethod === 'cash' && !free ? 'due' : 'paid',
    date: toISODate(now),
    description: `${ADD_ONS[addOn].name}${free ? ' (free credit)' : ''} — ${formatDateShort(wash.scheduledDate)}`,
  };
  return {
    washes: replace(data.washes, washId, (w) => ({ ...w, addOns: [...w.addOns, addOn] })),
    payments: [...data.payments, payment],
    customers: free
      ? replace(data.customers, customer.id, (c) => ({ ...c, addOnCredits: c.addOnCredits - 1 }))
      : data.customers,
  };
}

// ------------------------------------------------------------ rating, issues

export const rateWash = (
  data: DemoData,
  washId: ID,
  rating: NonNullable<Wash['rating']>,
): Patch => ({
  washes: replace(data.washes, washId, (w) => ({ ...w, rating })),
});

export function reportIssue(
  data: DemoData,
  input: { customerId: ID; washId?: ID; type: IssueType; description: string },
  now: Date,
): { patch: Patch; issueId: ID } {
  const customer = must(
    data.customers.find((c) => c.id === input.customerId),
    'Customer',
  );
  const issue: Issue = {
    id: `iss_${now.getTime().toString(36).slice(-5)}${counter++}`,
    customerId: customer.id,
    ...(input.washId ? { washId: input.washId } : {}),
    compoundId: customer.compoundId,
    type: input.type,
    description: input.description.trim(),
    status: 'submitted',
    createdAt: now.toISOString(),
  };
  return { patch: { issues: [issue, ...data.issues] }, issueId: issue.id };
}

export function updateIssue(
  data: DemoData,
  issueId: ID,
  status: IssueStatus,
  resolutionNote: string | undefined,
  now: Date,
): Patch {
  const issue = must(
    data.issues.find((i) => i.id === issueId),
    'Issue',
  );
  const updated: Issue = { ...issue, status, ...(resolutionNote ? { resolutionNote } : {}) };
  if (status === 'resolved') updated.resolvedAt = now.toISOString();
  else delete updated.resolvedAt;
  const changed = issue.status !== status;
  const title =
    status === 'resolved'
      ? 'Your report has been resolved'
      : status === 'under_review'
        ? 'We are reviewing your report'
        : 'We received your report';
  return {
    issues: replace(data.issues, issueId, () => updated),
    notifications: changed
      ? [
          notification(
            issue.customerId,
            'issue_update',
            title,
            resolutionNote || `Reference ${issue.id.toUpperCase()}.`,
            now,
            '/customer/support',
          ),
          ...data.notifications,
        ]
      : data.notifications,
  };
}

// ---------------------------------------------------------- wash progression

const washContext = (data: DemoData, washId: ID) => {
  const wash = must(
    data.washes.find((w) => w.id === washId),
    'Wash',
  );
  const washer = must(
    data.washers.find((w) => w.id === wash.washerId),
    'Washer',
  );
  const compound = must(
    data.compounds.find((c) => c.id === wash.compoundId),
    'Compound',
  );
  return { wash, washer, compound };
};

const seedFrom = (id: string, salt: number) => {
  let h = salt;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 99991;
  return h + 1;
};

export function washArrive(data: DemoData, washId: ID, now: Date): Patch {
  const { wash, washer, compound } = washContext(data, washId);
  if (wash.status !== 'scheduled') return {};
  return {
    washes: replace(data.washes, washId, (w) => ({
      ...w,
      status: 'washer_on_site',
      arrivedAt: now.toISOString(),
    })),
    notifications: [
      notification(
        wash.customerId,
        'washer_on_site',
        `${firstName(washer.name)} has arrived at ${compound.name}`,
        'Your car is on today’s route.',
        now,
        '/customer/home',
      ),
      ...data.notifications,
    ],
  };
}

export function washStart(data: DemoData, washId: ID, now: Date): Patch {
  const { wash } = washContext(data, washId);
  if (wash.status !== 'washer_on_site' && wash.status !== 'scheduled') return {};
  return {
    washes: replace(data.washes, washId, (w) => ({
      ...w,
      status: 'in_progress',
      arrivedAt: w.arrivedAt ?? now.toISOString(),
      startedAt: now.toISOString(),
      beforePhotoSeed: w.beforePhotoSeed ?? seedFrom(w.id, 7),
    })),
  };
}

export function washComplete(
  data: DemoData,
  washId: ID,
  now: Date,
  details: { washerNote?: string; damageMarkers?: DamageMarker[] } = {},
): Patch {
  const { wash } = washContext(data, washId);
  if (wash.status === 'completed') return {};
  const nowISO = now.toISOString();
  return {
    washes: replace(data.washes, washId, (w) => {
      const done: Wash = {
        ...w,
        status: 'completed',
        arrivedAt: w.arrivedAt ?? nowISO,
        startedAt: w.startedAt ?? nowISO,
        completedAt: nowISO,
        beforePhotoSeed: w.beforePhotoSeed ?? seedFrom(w.id, 7),
        afterPhotoSeed: seedFrom(w.id, 13),
        ...(details.washerNote ? { washerNote: details.washerNote } : {}),
        ...(details.damageMarkers?.length ? { damageMarkers: details.damageMarkers } : {}),
      };
      delete done.checklist;
      return done;
    }),
    notifications: [
      notification(
        wash.customerId,
        'wash_done',
        'Your car is clean — see photos',
        'Before and after photos are ready.',
        now,
        `/customer/washes/${wash.id}`,
      ),
      ...data.notifications,
    ],
  };
}

/** One step forward: scheduled → on site → in progress → completed. */
export function advanceWash(data: DemoData, washId: ID, now: Date): Patch {
  const wash = must(
    data.washes.find((w) => w.id === washId),
    'Wash',
  );
  if (wash.status === 'scheduled') return washArrive(data, washId, now);
  if (wash.status === 'washer_on_site') return washStart(data, washId, now);
  if (wash.status === 'in_progress') return washComplete(data, washId, now);
  return {};
}

export const saveWashDraft = (
  data: DemoData,
  washId: ID,
  draft: Pick<Wash, 'checklist' | 'damageMarkers' | 'washerNote'>,
): Patch => ({ washes: replace(data.washes, washId, (w) => ({ ...w, ...draft })) });

export type WashFlag = 'car_not_found' | 'car_covered' | 'customer';

const FLAG_COPY: Record<WashFlag, { issue?: string; title: string; body: string }> = {
  car_not_found: {
    issue: 'Washer could not find the car at its parking spot.',
    title: 'We could not find your car today',
    body: 'Your wash was not done. Please check your parking spot in the app, or message us.',
  },
  car_covered: {
    issue: 'Car was under a cover, so it was not washed.',
    title: 'Your car was covered today',
    body: 'We did not remove the cover, so your wash was not done.',
  },
  customer: {
    title: 'Wash skipped today',
    body: 'Skipped at your request. See you next wash day.',
  },
};

/** Washer could not wash the car: skips the wash and, if needed, opens an issue. */
export function flagWash(data: DemoData, washId: ID, flag: WashFlag, now: Date): Patch {
  const { wash } = washContext(data, washId);
  if (!isUpcoming(wash)) return {};
  const copy = FLAG_COPY[flag];
  const issue: Issue | null = copy.issue
    ? {
        id: `iss_${now.getTime().toString(36).slice(-5)}${counter++}`,
        customerId: wash.customerId,
        washId,
        compoundId: wash.compoundId,
        type: 'missed_wash',
        description: copy.issue,
        status: 'submitted',
        createdAt: now.toISOString(),
      }
    : null;
  return {
    washes: replace(data.washes, washId, (w) => ({ ...w, status: 'skipped', skipReason: flag })),
    issues: issue ? [issue, ...data.issues] : data.issues,
    notifications: [
      notification(wash.customerId, 'reminder', copy.title, copy.body, now, '/customer/schedule'),
      ...data.notifications,
    ],
  };
}

// ---------------------------------------------------------- demo: simulate

/**
 * "Simulate next step" in the demo toolbar.
 * Advances the focused customer's wash one step — pulling their next wash
 * forward to today if they have none today, so the live flow can always be
 * shown — and moves every other washer working today one step along too.
 */
export function simulateNextStep(
  data: DemoData,
  focusCustomerId: ID | null,
  now: Date,
): { patch: Patch; focusWash: Wash | null } {
  const todayISO = toISODate(now);
  let working: DemoData = data;
  const apply = (patch: Patch) => {
    working = { ...working, ...patch };
  };
  let focusId: ID | null = null;

  if (focusCustomerId) {
    const mine = working.washes.filter((w) => w.customerId === focusCustomerId && isUpcoming(w));
    let focus = mine.find((w) => w.scheduledDate === todayISO);
    if (!focus) {
      const next = mine
        .filter((w) => w.scheduledDate > todayISO)
        .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0];
      if (next) {
        apply({
          washes: replace(working.washes, next.id, (w) => ({ ...w, scheduledDate: todayISO })),
        });
        focus = next;
      }
    }
    if (focus) {
      focusId = focus.id;
      apply(advanceWash(working, focus.id, now));
    }
  }

  const todays = working.washes.filter((w) => w.scheduledDate === todayISO && w.id !== focusId);
  for (const washerId of new Set(todays.map((w) => w.washerId))) {
    const route = todays.filter((w) => w.washerId === washerId);
    const next =
      route.find((w) => w.status === 'in_progress') ??
      route.find((w) => w.status === 'washer_on_site') ??
      route.find((w) => w.status === 'scheduled');
    if (next) apply(advanceWash(working, next.id, now));
  }

  const { washes, notifications } = working;
  return {
    patch: { washes, notifications },
    focusWash: focusId ? (washes.find((w) => w.id === focusId) ?? null) : null,
  };
}

// ----------------------------------------------------------- weather delay

/** Moves every pending wash of a compound-day to the compound's next service day. */
export function markWeatherDelay(
  data: DemoData,
  compoundId: ID,
  date: string,
  now: Date,
): { patch: Patch; moved: number; movedTo: string } {
  const compound = must(
    data.compounds.find((c) => c.id === compoundId),
    'Compound',
  );
  const movedTo = weatherDelayTarget(compound.serviceDays, date);
  const affected = data.washes.filter(
    (w) =>
      w.compoundId === compoundId &&
      w.scheduledDate === date &&
      (w.status === 'scheduled' || w.status === 'washer_on_site'),
  );
  const affectedIds = new Set(affected.map((w) => w.id));
  const washes = data.washes.map((w) =>
    affectedIds.has(w.id)
      ? { ...w, status: 'weather_delayed' as const, rescheduledTo: movedTo }
      : w,
  );
  const added: Wash[] = [];
  const notes: Notification[] = [];
  for (const w of affected) {
    // Premium cars are already booked on the next service day.
    const alreadyBooked = data.washes.some(
      (x) => x.subscriptionId === w.subscriptionId && x.scheduledDate === movedTo && isUpcoming(x),
    );
    if (!alreadyBooked) {
      const moved: Wash = {
        ...w,
        id: uid('wash'),
        scheduledDate: movedTo,
        status: 'scheduled',
        rescheduledFrom: date,
        washerId: pickWasher({ ...data, washes }, compoundId, movedTo, added),
      };
      delete moved.arrivedAt;
      added.push(moved);
    }
    notes.push(
      notification(
        w.customerId,
        'reminder',
        'Weather delay',
        `Because of the weather, your wash moves from ${formatDateShort(date)} to ${formatDateLong(movedTo)}.`,
        now,
        '/customer/schedule',
      ),
    );
  }
  return {
    patch: { washes: [...washes, ...added], notifications: [...notes, ...data.notifications] },
    moved: affected.length,
    movedTo,
  };
}

// -------------------------------------------------------------- small edits

export const updateCustomer = (
  data: DemoData,
  customerId: ID,
  changes: Partial<Customer>,
): Patch => ({
  customers: replace(data.customers, customerId, (c) => ({ ...c, ...changes })),
});

export const updateCar = (data: DemoData, carId: ID, changes: Partial<Car>): Patch => ({
  cars: replace(data.cars, carId, (c) => ({ ...c, ...changes })),
});

export const setPaymentMethod = (data: DemoData, subId: ID, method: PaymentMethod): Patch => ({
  subscriptions: replace(data.subscriptions, subId, (s) => ({ ...s, paymentMethod: method })),
});

export const markNotificationsRead = (data: DemoData, customerId: ID): Patch => ({
  notifications: data.notifications.map((n) =>
    n.customerId === customerId && !n.read ? { ...n, read: true } : n,
  ),
});
