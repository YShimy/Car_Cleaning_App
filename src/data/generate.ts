/**
 * Deterministic mock-data generator (PLAN.md section 6).
 * Same `now` + same seed => identical output. Dates are relative to `now`
 * so the demo always feels current.
 */
import { addDays, addMinutes, addMonths, startOfDay } from 'date-fns';
import { PLANS, SERVICE_WINDOW } from '@/config/business';
import { RATING_TAGS } from '@/config/copy';
import { addDaysISO, fromISODate, toISODate, weekdayOf } from '@/lib/dates';
import { formatEGP, initialsOf, SERVICE_WINDOW_SENTENCE } from '@/lib/format';
import { dayCapacity, planPriceForCar, washTypeFor, weatherDelayTarget } from '@/lib/rules';
import { plannedWashDates } from '@/lib/schedule';
import type {
  AddOnId,
  Car,
  Compound,
  Customer,
  DemoData,
  Issue,
  Notification,
  Payment,
  PaymentMethod,
  PlanId,
  Subscription,
  SubscriptionStatus,
  Wash,
  Washer,
  WashRating,
  Weekday,
} from '@/types/domain';
import { CAR_COLOR_WEIGHTS, CAR_MODELS, carLabel } from './cars';
import { COMPOUND_SEEDS } from './compounds';
import { FIRST_NAMES, LAST_NAMES, MANAGER_NAMES, WASHER_NAMES } from './names';
import { createRng, type Rng } from './prng';

export const DEMO_SEED = 20260115;
export const NOUR_ID = 'cust_nour';
const NOUR_COMPOUND_ID = 'cmp_palm';

const HISTORY_DAYS = 70; // 10 weeks
const FUTURE_DAYS = 14;
/** Personas get a longer horizon so the Schedule tab can list 4 washes. */
export const PERSONA_FUTURE_DAYS = 28;

const PLAN_MIX: [PlanId, number][] = [
  ['essential', 45],
  ['plus', 40],
  ['premium', 15],
];
const STATUS_MIX: [SubscriptionStatus, number][] = [
  ['active', 88],
  ['paused', 5],
  ['cancelled', 5],
  ['pending_payment', 2],
];
const METHOD_MIX: [PaymentMethod, number][] = [
  ['card', 35],
  ['wallet', 25],
  ['instapay', 25],
  ['cash', 15],
];
const STAR_MIX: [WashRating['stars'], number][] = [
  [5, 70],
  [4, 22],
  [3, 5],
  [2, 3],
];

const CAR_NOTES = [
  'Covered with a car cover on weekends',
  'Please fold the mirrors back after washing',
  'Rear wiper is loose, please be gentle',
];
const WASHER_NOTES = [
  'Small pre-existing scratch on rear bumper',
  'Pre-existing chip on the windscreen',
  'Light pre-existing scuff on the front left door',
];

const pad = (n: number, width = 4) => String(n).padStart(width, '0');
const letters = 'ABDEGHKLMNRSTWY';

/** Local date at `minutes` after midnight, as an ISO date-time. */
const atMinutes = (date: Date, minutes: number) =>
  addMinutes(startOfDay(date), minutes).toISOString();

function makeRating(rng: Rng): WashRating {
  const stars = rng.weighted(STAR_MIX);
  const pool = stars >= 4 ? RATING_TAGS.positive : RATING_TAGS.negative;
  const first = rng.pick(pool);
  const tags = rng.chance(0.4) ? [first, rng.pick(pool.filter((t) => t !== first))] : [first];
  return { stars, tags };
}

export function generateDemoData(now: Date = new Date(), seed: number = DEMO_SEED): DemoData {
  const rng = createRng(seed);
  const today = startOfDay(now);
  const todayISO = toISODate(today);
  const todayWd = weekdayOf(today);
  const daysAgo = (n: number) => addDays(today, -n);

  // ------------------------------------------------------------- compounds
  const seeds = COMPOUND_SEEDS.map((s) => ({
    ...s,
    serviceDays: [...s.serviceDays] as [Weekday, Weekday],
  }));
  // The live views need activity today. If no compound is served today,
  // shift one compound's first service day (in the generated data only).
  if (!seeds.some((s) => s.status !== 'onboarding' && s.serviceDays.includes(todayWd))) {
    const target = seeds.find((s) => s.status === 'active' && s.id !== NOUR_COMPOUND_ID)!;
    target.serviceDays[0] = todayWd;
  }

  const washers: Washer[] = WASHER_NAMES.map((name, i) => ({
    id: `wsh_${i + 1}`,
    name,
    phone: `+20 10 0000 01${pad(i + 1, 2)}`,
    photoInitials: initialsOf(name),
    idVerified: true,
    joinedAt: toISODate(daysAgo(rng.int(120, 260))),
    rating: Math.round((4.3 + rng.next() * 0.65) * 100) / 100,
    compoundIds: seeds.filter((s) => s.washers.includes(i)).map((s) => s.id),
  }));

  const compounds: Compound[] = seeds.map((s, i) => ({
    id: s.id,
    name: s.name,
    area: s.area,
    serviceDays: s.serviceDays,
    washerIds: s.washers.map((w) => washers[w].id),
    parkingZones: s.parkingZones,
    managerName: MANAGER_NAMES[i],
    partnershipSince: toISODate(daysAgo(s.launchedDaysAgo)),
    status: s.status,
  }));

  // ------------------------------------------- customers, cars, subscriptions
  const customers: Customer[] = [];
  const cars: Car[] = [];
  const subscriptions: Subscription[] = [];
  const usedNames = new Set<string>(['Nour Hassan']);

  const uniqueName = () => {
    for (;;) {
      const name = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
      if (!usedNames.has(name)) {
        usedNames.add(name);
        return name;
      }
    }
  };

  compounds.forEach((compound, ci) => {
    const seedDef = seeds[ci];
    if (compound.status === 'onboarding') return; // not launched: waitlist only

    const cap = dayCapacity(compound);
    // Highest load allowed per day. Fixed for the compounds that must show
    // "nearly full" / "full"; otherwise a few spots are always left free.
    const maxLoad = seedDef.spotsLeft
      ? seedDef.spotsLeft.map((left) => cap - left)
      : [cap - rng.int(3, 9), cap - rng.int(3, 9)];
    const mustFill = Boolean(seedDef.spotsLeft);
    const targetCustomers = rng.int(25, 50);
    const load = [0, 0];
    const room = (i: number) => maxLoad[i] - load[i];
    const spotCounter = new Map<string, number>();
    const compoundCustomers: Customer[] = [];

    while (room(0) > 0 || room(1) > 0) {
      if (!mustFill && compoundCustomers.length >= targetCustomers) break;

      const isNour = compound.id === NOUR_COMPOUND_ID && compoundCustomers.length === 0;
      const customerId = isNour ? NOUR_ID : `cust_${pad(customers.length + 1)}`;
      const name = isNour ? 'Nour Hassan' : uniqueName();
      const zone = isNour ? 'Basement B1' : rng.pick(compound.parkingZones);
      const isVilla = /villa|townhouse/i.test(zone);
      const unit = isNour
        ? 'Building 14, Apt 3'
        : isVilla
          ? `Villa ${rng.int(1, 120)}`
          : `Building ${rng.int(1, 24)}, Apt ${rng.int(1, 16)}`;
      const method = isNour ? 'card' : rng.weighted(METHOD_MIX);
      const referredBy =
        !isNour && compoundCustomers.length > 3 && rng.chance(0.12)
          ? rng.pick(compoundCustomers).id
          : undefined;

      // When each car joined: a founding cohort right after the compound
      // launched, then steady sign-ups. Staggered launches give the S-curve.
      const launch = seedDef.launchedDaysAgo;
      const joinedDaysAgo = isNour
        ? 77
        : rng.chance(0.45)
          ? launch - rng.int(0, 21)
          : rng.int(3, Math.max(4, launch - 22));

      const carCount = !isNour && rng.chance(0.15) ? 2 : 1;
      let firstStart: string | null = null;

      for (let carIndex = 0; carIndex < carCount; carIndex++) {
        if (room(0) <= 0 && room(1) <= 0) break;

        let plan: PlanId = isNour ? 'plus' : rng.weighted(PLAN_MIX);
        let status: SubscriptionStatus = isNour ? 'active' : rng.weighted(STATUS_MIX);
        let startDaysAgo =
          joinedDaysAgo - (carIndex > 0 ? Math.min(joinedDaysAgo - 1, rng.int(0, 30)) : 0);
        if (status === 'cancelled' && startDaysAgo < 45) status = 'active';
        if (status === 'paused' && startDaysAgo < 14) status = 'active';
        if (status === 'pending_payment') startDaysAgo = rng.int(0, 3);

        if (plan === 'premium' && (room(0) <= 0 || room(1) <= 0)) plan = 'plus';
        let dayIndexes: number[];
        if (plan === 'premium') dayIndexes = [0, 1];
        else if (isNour) dayIndexes = [0];
        else if (room(0) <= 0) dayIndexes = [1];
        else if (room(1) <= 0) dayIndexes = [0];
        else dayIndexes = [rng.next() * (room(0) + room(1)) < room(0) ? 0 : 1];
        if (status !== 'cancelled') dayIndexes.forEach((i) => load[i]++);

        const model = isNour ? CAR_MODELS[0] : rng.pick(CAR_MODELS);
        const carZone = carIndex === 0 ? zone : rng.pick(compound.parkingZones);
        const spot = (spotCounter.get(carZone) ?? (isNour ? 13 : 0)) + 1;
        spotCounter.set(carZone, isNour ? 0 : spot);
        const carId = isNour ? 'car_nour' : `car_${pad(cars.length + 1)}`;
        cars.push({
          id: carId,
          customerId,
          make: model.make,
          model: model.model,
          year: isNour ? 2022 : rng.int(2015, 2025),
          color: isNour ? 'white' : rng.weighted(CAR_COLOR_WEIGHTS),
          plate: isNour
            ? 'QTR 4821'
            : `${rng.pick([...letters])}${rng.pick([...letters])}${rng.pick([...letters])} ${rng.int(1000, 9999)}`,
          bodyType: model.bodyType,
          parkingZone: carZone,
          parkingSpot: `Spot ${isNour ? 14 : spot}`,
          ...(!isNour && rng.chance(0.06) ? { notes: rng.pick(CAR_NOTES) } : {}),
        });

        const startedAt = toISODate(daysAgo(startDaysAgo));
        firstStart ??= startedAt;
        const sub: Subscription = {
          id: isNour ? 'sub_nour' : `sub_${pad(subscriptions.length + 1)}`,
          customerId,
          carId,
          compoundId: compound.id,
          plan,
          weeklyDays: dayIndexes.map((i) => compound.serviceDays[i]),
          status,
          startedAt,
          monthlyPrice: planPriceForCar(plan, carIndex),
          paymentMethod: method,
        };
        if (status === 'paused') {
          sub.lastPausedAt = toISODate(daysAgo(rng.int(2, 8)));
          sub.pausedUntil = toISODate(addDays(today, rng.int(5, 20)));
        }
        if (status === 'cancelled') {
          sub.cancelAt = toISODate(daysAgo(rng.int(1, Math.min(60, startDaysAgo - 30))));
          sub.cancelReason = rng.pick(['Too expensive', 'Moving', 'Quality', 'Not using it']);
        }
        subscriptions.push(sub);
      }

      if (!firstStart) break; // compound filled up before this customer got a slot
      const customer: Customer = {
        id: customerId,
        name,
        phone: isNour ? '+20 10 0000 0114' : `+20 1${rng.int(0, 2)} 0000 ${pad(rng.int(0, 9999))}`,
        compoundId: compound.id,
        unit,
        referralCode: `${name.split(' ')[0].toUpperCase()}${isNour ? 14 : rng.int(10, 99)}`,
        ...(referredBy ? { referredBy } : {}),
        joinedAt: firstStart,
        notificationPrefs: {
          whatsapp: isNour || rng.chance(0.85),
          push: isNour || rng.chance(0.6),
        },
        addOnCredits: isNour ? 1 : 0,
      };
      customers.push(customer);
      compoundCustomers.push(customer);
    }
  });

  const carById = new Map(cars.map((c) => [c.id, c]));
  const customerById = new Map(customers.map((c) => [c.id, c]));
  const compoundById = new Map(compounds.map((c) => [c.id, c]));

  // ------------------------------------------------ washer for each sub+day
  // Each washer takes a contiguous block of parking spots, as on a real route.
  const washerFor = new Map<string, string>();
  const spotNumber = (car: Car) => Number(car.parkingSpot.replace(/\D/g, '')) || 0;
  for (const compound of compounds) {
    for (const day of compound.serviceDays) {
      const daySubs = subscriptions
        .filter((s) => s.compoundId === compound.id && s.weeklyDays.includes(day))
        .sort((a, b) => {
          const ca = carById.get(a.carId)!;
          const cb = carById.get(b.carId)!;
          return (
            compound.parkingZones.indexOf(ca.parkingZone) -
              compound.parkingZones.indexOf(cb.parkingZone) || spotNumber(ca) - spotNumber(cb)
          );
        });
      const perWasher = Math.ceil(daySubs.length / compound.washerIds.length) || 1;
      daySubs.forEach((s, i) =>
        washerFor.set(`${s.id}|${day}`, compound.washerIds[Math.floor(i / perWasher)]),
      );
    }
  }

  // ----------------------------------------------------------------- washes
  const washes: Wash[] = [];
  const newWash = (sub: Subscription, date: Date, fields: Partial<Wash>): Wash => {
    const dateISO = toISODate(date);
    const compound = compoundById.get(sub.compoundId)!;
    const wash: Wash = {
      id: `wash_${pad(washes.length + 1, 5)}`,
      subscriptionId: sub.id,
      carId: sub.carId,
      customerId: sub.customerId,
      compoundId: sub.compoundId,
      washerId: washerFor.get(`${sub.id}|${weekdayOf(date)}`) ?? compound.washerIds[0],
      scheduledDate: dateISO,
      type: washTypeFor(sub.plan, sub.weeklyDays, date),
      addOns: [],
      status: 'scheduled',
      ...fields,
    };
    washes.push(wash);
    return wash;
  };

  const completedFields = (date: Date, type: Wash['type'], startMinute?: number): Partial<Wash> => {
    const start = startMinute ?? 8 * 60 + rng.int(5, 320);
    const duration = rng.int(16, 26) + (type === 'exterior_interior' ? 12 : 0);
    return {
      status: 'completed',
      arrivedAt: atMinutes(date, start - 2),
      startedAt: atMinutes(date, start),
      completedAt: atMinutes(date, start + duration),
      beforePhotoSeed: rng.int(1, 99999),
      afterPhotoSeed: rng.int(1, 99999),
    };
  };

  // A few compound-days in the past were rained off: every wash that day
  // moved to the compound's next service day.
  const weatherDays = new Set<string>();
  const established = seeds.filter(
    (s) => s.status === 'active' && s.launchedDaysAgo > HISTORY_DAYS,
  );
  while (weatherDays.size < 3 && established.length > 0) {
    const s = rng.pick(established);
    const offset = rng.int(8, HISTORY_DAYS - 5);
    const date = daysAgo(offset);
    if (s.serviceDays.includes(weekdayOf(date))) weatherDays.add(`${s.id}|${toISODate(date)}`);
  }

  for (const sub of subscriptions) {
    if (sub.status === 'pending_payment') continue;
    const isNour = sub.customerId === NOUR_ID;
    const compound = compoundById.get(sub.compoundId)!;
    const started = fromISODate(sub.startedAt);
    const stopAt = sub.cancelAt ?? sub.lastPausedAt;
    let nourIndex = 0;

    for (let offset = HISTORY_DAYS; offset >= 1; offset--) {
      const date = daysAgo(offset);
      const dateISO = toISODate(date);
      if (!sub.weeklyDays.includes(weekdayOf(date))) continue;
      if (date.getTime() < started.getTime()) continue;
      if (stopAt && dateISO >= stopAt) continue;
      const type = washTypeFor(sub.plan, sub.weeklyDays, date);

      if (isNour) {
        // Hand-written history: 9 completed, 1 skipped, one 3-star "Late".
        const i = nourIndex++;
        if (i === 4) {
          newWash(sub, date, { status: 'skipped', skipReason: 'customer' });
          continue;
        }
        const ratings: Record<number, WashRating | undefined> = {
          0: { stars: 5, tags: ['Spotless'] },
          2: { stars: 4, tags: ['On time'] },
          5: { stars: 5, tags: ['Spotless', 'Friendly'] },
          6: { stars: 3, tags: ['Late'] },
          7: { stars: 5, tags: ['On time'] },
          8: { stars: 5, tags: ['Spotless'] },
        };
        newWash(sub, date, {
          ...completedFields(date, type, 9 * 60 + 5 + (i === 6 ? 255 : (i * 7) % 40)),
          ...(ratings[i] ? { rating: ratings[i] } : {}),
          ...(i === 7
            ? {
                washerNote: WASHER_NOTES[0],
                damageMarkers: [{ x: 14, y: 62, note: WASHER_NOTES[0] }],
              }
            : {}),
        });
        continue;
      }

      if (weatherDays.has(`${compound.id}|${dateISO}`)) {
        const movedTo = weatherDelayTarget(compound.serviceDays, dateISO);
        newWash(sub, date, { status: 'weather_delayed', rescheduledTo: movedTo });
        // Premium cars are already washed on the next service day.
        if (!sub.weeklyDays.includes(weekdayOf(movedTo)) && movedTo < todayISO) {
          const movedDate = fromISODate(movedTo);
          newWash(sub, movedDate, {
            ...completedFields(movedDate, type),
            type,
            rescheduledFrom: dateISO,
          });
        }
        continue;
      }

      const outcome = rng.weighted([
        ['completed', 94.5],
        ['skipped', 4],
        ['missed', 1.5],
      ] as const);
      if (outcome === 'skipped') newWash(sub, date, { status: 'skipped', skipReason: 'customer' });
      else if (outcome === 'missed') newWash(sub, date, { status: 'missed' });
      else {
        const addOns: AddOnId[] = rng.chance(0.08)
          ? [rng.pick(['deep_interior', 'wax_polish', 'tire_shine', 'seat_shampoo'] as const)]
          : [];
        newWash(sub, date, {
          ...completedFields(date, type),
          addOns,
          ...(rng.chance(0.55) ? { rating: makeRating(rng) } : {}),
          ...(rng.chance(0.03) ? { washerNote: rng.pick(WASHER_NOTES) } : {}),
        });
      }
    }
  }

  // Today: a live mix of completed, in progress, on site and scheduled.
  // Times are placed inside the service window even if the demo is opened
  // in the evening, so the board and the access log always look plausible.
  const liveNow = new Date(
    Math.min(
      Math.max(now.getTime(), addMinutes(today, SERVICE_WINDOW.startHour * 60 + 150).getTime()),
      addMinutes(today, SERVICE_WINDOW.endHour * 60 - 45).getTime(),
    ),
  );
  for (const compound of compounds) {
    if (!compound.serviceDays.includes(todayWd)) continue;
    const todaySubs = subscriptions.filter(
      (s) =>
        s.compoundId === compound.id &&
        s.status === 'active' &&
        s.weeklyDays.includes(todayWd) &&
        s.startedAt < todayISO,
    );
    compound.washerIds.forEach((washerId, wi) => {
      const route = todaySubs.filter((s) => washerFor.get(`${s.id}|${todayWd}`) === washerId);
      const doneCount = Math.floor(route.length * 0.45);
      route.forEach((sub, i) => {
        if (i < doneCount) {
          const completedAt = addMinutes(liveNow, -10 - (doneCount - 1 - i) * 24);
          newWash(sub, today, {
            status: 'completed',
            arrivedAt: addMinutes(completedAt, -22).toISOString(),
            startedAt: addMinutes(completedAt, -20).toISOString(),
            completedAt: completedAt.toISOString(),
            beforePhotoSeed: rng.int(1, 99999),
            afterPhotoSeed: rng.int(1, 99999),
            ...(rng.chance(0.3) ? { rating: makeRating(rng) } : {}),
          });
        } else if (i === doneCount && wi === 0) {
          newWash(sub, today, {
            status: 'in_progress',
            arrivedAt: addMinutes(liveNow, -9).toISOString(),
            startedAt: addMinutes(liveNow, -7).toISOString(),
            beforePhotoSeed: rng.int(1, 99999),
          });
        } else if (i === doneCount) {
          newWash(sub, today, {
            status: 'washer_on_site',
            arrivedAt: addMinutes(liveNow, -3).toISOString(),
          });
        } else {
          newWash(sub, today, {});
        }
      });
    });
  }

  // Nour's wash today (only when today is her wash day) is always "washer on site".
  const nourToday = washes.find((w) => w.customerId === NOUR_ID && w.scheduledDate === todayISO);
  if (nourToday) {
    Object.assign(nourToday, {
      status: 'washer_on_site',
      arrivedAt: addMinutes(liveNow, -5).toISOString(),
    });
    delete nourToday.startedAt;
    delete nourToday.completedAt;
    delete nourToday.beforePhotoSeed;
    delete nourToday.afterPhotoSeed;
    delete nourToday.rating;
  }

  // Upcoming washes.
  for (const sub of subscriptions) {
    const horizon = sub.customerId === NOUR_ID ? PERSONA_FUTURE_DAYS : FUTURE_DAYS;
    for (const date of plannedWashDates(sub, addDays(today, 1), addDays(today, horizon))) {
      newWash(sub, date, {});
    }
  }

  // --------------------------------------------------------------- payments
  const payments: Payment[] = [];
  for (const sub of subscriptions) {
    const car = carById.get(sub.carId)!;
    const description = `${PLANS[sub.plan].name} plan — ${carLabel(car)}`;
    const base = {
      customerId: sub.customerId,
      subscriptionId: sub.id,
      amount: sub.monthlyPrice,
      method: sub.paymentMethod,
      description,
    };
    if (sub.status === 'pending_payment') {
      payments.push({
        ...base,
        id: `pay_${pad(payments.length + 1)}`,
        status: 'due',
        date: sub.startedAt,
      });
      continue;
    }
    // Billing dates: monthly from the start date, most recent three.
    const started = fromISODate(sub.startedAt);
    const end = sub.cancelAt ? fromISODate(sub.cancelAt) : today;
    const dates: Date[] = [];
    for (let m = 0; addMonths(started, m).getTime() <= end.getTime(); m++)
      dates.push(addMonths(started, m));
    const recent = dates.slice(-3);
    const lateLatest = sub.status === 'active' && sub.customerId !== NOUR_ID && rng.chance(0.025);
    recent.forEach((date, i) => {
      const isLatest = i === recent.length - 1;
      payments.push({
        ...base,
        id: `pay_${pad(payments.length + 1)}`,
        status: isLatest && lateLatest ? 'overdue' : 'paid',
        date: toISODate(date),
      });
    });
  }

  // ----------------------------------------------------------------- issues
  const issues: Issue[] = [];
  const pastWashes = washes.filter((w) => w.scheduledDate < todayISO && w.customerId !== NOUR_ID);
  const lowRated = pastWashes.filter((w) => w.rating && w.rating.stars <= 3);
  const missed = pastWashes.filter((w) => w.status === 'missed');
  const completed = pastWashes.filter((w) => w.status === 'completed');

  const QUALITY = [
    'Water marks left on the bonnet after the wash.',
    'The wheels were still dusty.',
    'Rear window was not cleaned properly.',
    'Interior was not vacuumed although it was included.',
    'Missed a spot on the driver door.',
  ];
  const MISSED = [
    'My car was not washed on my wash day.',
    'No photos and the car still looks dirty. I think it was skipped.',
  ];
  const BILLING = [
    'I was charged twice this month.',
    'The family discount is missing on my second car.',
    'I paused but was still charged.',
  ];
  const OTHER = [
    'Can the washer avoid the car cover, please?',
    'I would like to change my parking spot.',
  ];
  const RESOLUTIONS: Record<Issue['type'], string> = {
    quality: 'We re-washed the car the same day. Sorry about that.',
    missed_wash: 'We apologise. An extra wash was added on the next service day.',
    damage: 'Reviewed with photos. Repair cost covered by our damage protection.',
    billing: 'Corrected. The difference was refunded to your payment method.',
    other: 'Done. The note was added to your car profile.',
  };

  const addIssue = (
    type: Issue['type'],
    wash: Wash | undefined,
    description: string,
    status: Issue['status'],
    customerId?: string,
  ) => {
    const cid = wash?.customerId ?? customerId ?? rng.pick(customers).id;
    const created = wash
      ? addMinutes(fromISODate(wash.scheduledDate), 16 * 60 + rng.int(0, 240))
      : addMinutes(daysAgo(rng.int(1, 40)), 10 * 60 + rng.int(0, 480));
    issues.push({
      id: `iss_${pad(issues.length + 1, 3)}`,
      customerId: cid,
      ...(wash ? { washId: wash.id } : {}),
      compoundId: customerById.get(cid)!.compoundId,
      type,
      description,
      status,
      createdAt: created.toISOString(),
      ...(status === 'resolved'
        ? {
            resolvedAt: addMinutes(created, rng.int(120, 1300)).toISOString(),
            resolutionNote: RESOLUTIONS[type],
          }
        : {}),
    });
  };

  // Newer issues are more likely to still be open.
  const statusFor = (wash: Wash | undefined): Issue['status'] => {
    const recent = wash ? wash.scheduledDate >= addDaysISO(todayISO, -10) : rng.chance(0.4);
    return recent ? rng.pick(['submitted', 'under_review'] as const) : 'resolved';
  };
  /** `n` distinct washes spread over the history, in a deterministic order. */
  const sample = (pool: Wash[], n: number) => {
    const rest = [...pool];
    const out: Wash[] = [];
    while (out.length < n && rest.length > 0)
      out.push(rest.splice(rng.int(0, rest.length - 1), 1)[0]);
    return out;
  };
  const byRecency = [...completed].sort((a, b) => (a.scheduledDate < b.scheduledDate ? 1 : -1));

  for (const wash of sample(lowRated.length >= 9 ? lowRated : completed, 9)) {
    addIssue('quality', wash, rng.pick(QUALITY), statusFor(wash));
  }
  for (const wash of sample(missed, 6))
    addIssue('missed_wash', wash, rng.pick(MISSED), statusFor(wash));
  addIssue(
    'damage',
    rng.pick(byRecency.slice(200, 400)),
    'New scratch on the rear right door after the wash.',
    'resolved',
  );
  addIssue(
    'damage',
    rng.pick(byRecency.slice(0, 30)),
    'Side mirror cover is loose after the wash.',
    'under_review',
  );
  BILLING.forEach((text, i) =>
    addIssue('billing', undefined, text, i === 0 ? 'submitted' : 'resolved'),
  );
  OTHER.forEach((text) => addIssue('other', undefined, text, statusFor(undefined)));

  // Nour's one resolved quality issue.
  const nourWashes = washes.filter((w) => w.customerId === NOUR_ID);
  const nourCompleted = nourWashes.filter((w) => w.status === 'completed');
  const nourIssueWash = nourCompleted[3];
  if (nourIssueWash) {
    addIssue(
      'quality',
      nourIssueWash,
      'Water marks left on the bonnet after the wash.',
      'resolved',
    );
  }

  // ---------------------------------------------------------- notifications
  const notifications: Notification[] = [];
  const nourLast = nourCompleted[nourCompleted.length - 1];
  const nourSub = subscriptions.find((s) => s.customerId === NOUR_ID)!;
  const nourWasher = washers.find(
    (w) => w.id === (nourLast?.washerId ?? compounds[0].washerIds[0]),
  )!;
  const washerFirst = nourWasher.name.split(' ')[0];
  const notify = (
    createdAt: Date,
    kind: Notification['kind'],
    title: string,
    body: string,
    read: boolean,
    link?: string,
  ) =>
    notifications.push({
      id: `ntf_${pad(notifications.length + 1, 3)}`,
      customerId: NOUR_ID,
      createdAt: createdAt.toISOString(),
      read,
      kind,
      title,
      body,
      ...(link ? { link } : {}),
    });

  const nourIssue = issues[issues.length - 1];
  if (nourIssue?.resolvedAt) {
    notify(
      new Date(nourIssue.resolvedAt),
      'issue_update',
      'Your report has been resolved',
      nourIssue.resolutionNote ?? '',
      true,
      '/customer/support',
    );
  }
  const nourPayment = [...payments].reverse().find((p) => p.customerId === NOUR_ID);
  if (nourPayment) {
    notify(
      addMinutes(fromISODate(nourPayment.date), 10 * 60),
      'payment',
      `Payment received: ${formatEGP(nourPayment.amount)}`,
      `${PLANS[nourSub.plan].name} plan, paid by card.`,
      true,
      '/customer/account',
    );
  }
  if (nourLast?.completedAt) {
    const washDay = fromISODate(nourLast.scheduledDate);
    notify(
      addMinutes(addDays(washDay, -1), 18 * 60),
      'reminder',
      'Reminder: wash tomorrow',
      `Your car will be washed tomorrow between ${SERVICE_WINDOW_SENTENCE}.`,
      true,
      '/customer/schedule',
    );
    notify(
      new Date(nourLast.arrivedAt!),
      'washer_on_site',
      `${washerFirst} has arrived at Palm Grove`,
      'Your car is on today’s route.',
      true,
      '/customer/home',
    );
    notify(
      new Date(nourLast.completedAt),
      'wash_done',
      'Your car is clean — see photos',
      'Before and after photos are ready.',
      false,
      `/customer/washes/${nourLast.id}`,
    );
  }
  if (nourToday) {
    notify(
      addMinutes(now, -5),
      'washer_on_site',
      `${washerFirst} has arrived at Palm Grove`,
      'Your car is on today’s route.',
      false,
      '/customer/home',
    );
  }
  notify(
    addMinutes(now, -90),
    'promo',
    'Refer a neighbour',
    'You both get 1 free week when they subscribe with your code.',
    false,
    '/customer/account',
  );
  notifications.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return {
    generatedOn: todayISO,
    compounds,
    washers,
    customers,
    cars,
    subscriptions,
    washes,
    payments,
    issues,
    notifications,
  };
}
