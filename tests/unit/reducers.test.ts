import { generateDemoData, NOUR_ID } from '@/data/generate';
import { weekdayOf } from '@/lib/dates';
import { dayLoad, spotsLeft } from '@/lib/rules';
import { kpis, upcomingWashes } from '@/lib/selectors';
import * as r from '@/store/reducers';
import type { DemoData } from '@/types/domain';

// Sunday 15 Nov 2026, 11:00. Nour's next wash is Tuesday 17 Nov.
const NOW = new Date(2026, 10, 15, 11, 0);
const base = generateDemoData(NOW);
const apply = (data: DemoData, patch: r.Patch): DemoData => ({ ...data, ...patch });
const nourSub = base.subscriptions.find((s) => s.customerId === NOUR_ID)!;
const nourNext = (data: DemoData) => upcomingWashes(data.washes, NOUR_ID, NOW)[0];

const newCustomer: r.SubscribeInput = {
  name: 'Test Resident',
  phone: '+20 10 0000 0999',
  compoundId: 'cmp_palm',
  unit: 'Building 2, Apt 1',
  car: {
    make: 'Kia',
    model: 'Sportage',
    year: 2023,
    color: 'red',
    plate: 'ABC 1234',
    bodyType: 'suv',
    parkingZone: 'Basement B1',
    parkingSpot: 'Spot 99',
  },
  plan: 'plus',
  weeklyDays: ['tue'],
  paymentMethod: 'card',
};

describe('subscribe', () => {
  it('creates customer, car, subscription, washes, payment and notification', () => {
    const before = spotsLeft(base.compounds[0], base.subscriptions, 'tue');
    const { patch, customerId, subscriptionId, firstWashId } = r.subscribe(base, newCustomer, NOW);
    const data = apply(base, patch);
    expect(data.customers.find((c) => c.id === customerId)!.name).toBe('Test Resident');
    expect(data.subscriptions.find((s) => s.id === subscriptionId)).toMatchObject({
      plan: 'plus',
      monthlyPrice: 950,
      status: 'active',
    });
    // Capacity of the compound day drops by one.
    expect(spotsLeft(data.compounds[0], data.subscriptions, 'tue')).toBe(before - 1);
    // First wash is the next service day after subscribing.
    const mine = upcomingWashes(data.washes, customerId, NOW);
    expect(mine[0].id).toBe(firstWashId);
    expect(mine[0].scheduledDate).toBe('2026-11-17');
    expect(mine).toHaveLength(4);
    expect(data.payments.at(-1)).toMatchObject({ customerId, amount: 950, status: 'paid' });
    expect(data.notifications[0].customerId).toBe(customerId);
    // Admin metrics move too.
    expect(kpis(data, NOW).activeSubscribers).toBe(kpis(base, NOW).activeSubscribers + 1);
    expect(kpis(data, NOW).mrr).toBe(kpis(base, NOW).mrr + 950);
  });

  it('rejects a full day', () => {
    expect(() =>
      r.subscribe(base, { ...newCustomer, compoundId: 'cmp_cedar', weeklyDays: ['sun'] }, NOW),
    ).toThrow(/Sunday is full/);
  });

  it('rejects a day the compound is not served', () => {
    expect(() => r.subscribe(base, { ...newCustomer, weeklyDays: ['mon'] }, NOW)).toThrow(
      r.RuleError,
    );
  });

  it('books Premium on both days and adds first-wash extras to the bill', () => {
    const { patch, customerId, firstWashId } = r.subscribe(
      base,
      {
        ...newCustomer,
        plan: 'premium',
        weeklyDays: ['tue', 'sat'],
        firstWashAddOns: ['tire_shine'],
        paymentMethod: 'cash',
      },
      NOW,
    );
    const data = apply(base, patch);
    const days = new Set(
      upcomingWashes(data.washes, customerId, NOW).map((w) => weekdayOf(w.scheduledDate)),
    );
    expect(days).toEqual(new Set(['tue', 'sat']));
    expect(data.washes.find((w) => w.id === firstWashId)!.addOns).toEqual(['tire_shine']);
    expect(data.payments.at(-1)).toMatchObject({ amount: 1680, status: 'due', method: 'cash' });
  });

  it('gives a second car the 15% family discount', () => {
    const { patch, subscriptionId } = r.subscribe(
      base,
      { ...newCustomer, customerId: NOUR_ID, weeklyDays: ['sat'] },
      NOW,
    );
    const data = apply(base, patch);
    expect(data.customers).toHaveLength(base.customers.length);
    expect(data.subscriptions.find((s) => s.id === subscriptionId)!.monthlyPrice).toBe(808);
  });
});

describe('skip', () => {
  it('skips a wash before the cutoff and credits one free tire shine', () => {
    const wash = nourNext(base);
    const data = apply(base, r.skipWash(base, wash.id, NOW));
    expect(data.washes.find((w) => w.id === wash.id)).toMatchObject({
      status: 'skipped',
      skipReason: 'customer',
    });
    expect(data.customers.find((c) => c.id === NOUR_ID)!.addOnCredits).toBe(2);
    expect(nourNext(data).scheduledDate).toBe('2026-11-24');
  });

  it('refuses after 8:00 PM the day before', () => {
    expect(() => r.skipWash(base, nourNext(base).id, new Date(2026, 10, 16, 21, 0))).toThrow(
      /8:00 PM/,
    );
  });
});

describe('pause and resume', () => {
  it('removes washes during the pause and keeps the slot', () => {
    const data = apply(base, r.pauseSubscription(base, nourSub.id, 2, NOW));
    const sub = data.subscriptions.find((s) => s.id === nourSub.id)!;
    expect(sub).toMatchObject({
      status: 'paused',
      pausedUntil: '2026-11-29',
      lastPausedAt: '2026-11-15',
      billingShiftDays: 14,
    });
    expect(upcomingWashes(data.washes, NOUR_ID, NOW).map((w) => w.scheduledDate)).toEqual([
      '2026-12-01',
      '2026-12-08',
    ]);
    expect(dayLoad(data.subscriptions, 'cmp_palm', 'tue')).toBe(
      dayLoad(base.subscriptions, 'cmp_palm', 'tue'),
    );
  });

  it('cannot pause twice within 3 months', () => {
    const paused = apply(base, r.pauseSubscription(base, nourSub.id, 1, NOW));
    const resumed = apply(paused, r.resumeSubscription(paused, nourSub.id, NOW));
    expect(resumed.subscriptions.find((s) => s.id === nourSub.id)!.status).toBe('active');
    expect(upcomingWashes(resumed.washes, NOUR_ID, NOW)).toHaveLength(4);
    expect(() => r.pauseSubscription(resumed, nourSub.id, 1, NOW)).toThrow(/once every 3 months/);
  });
});

describe('change wash day', () => {
  it('keeps this week and moves later washes to the new day', () => {
    const data = apply(base, r.changeWeeklyDay(base, nourSub.id, 'sat', NOW));
    const sub = data.subscriptions.find((s) => s.id === nourSub.id)!;
    expect(sub.weeklyDays).toEqual(['sat']);
    expect(sub.pendingDayChange).toEqual({ from: 'tue', to: 'sat', effectiveFrom: '2026-11-22' });
    expect(upcomingWashes(data.washes, NOUR_ID, NOW).map((w) => w.scheduledDate)).toEqual([
      '2026-11-17',
      '2026-11-28',
      '2026-12-05',
      '2026-12-12',
    ]);
    // Capacity moves immediately so the new slot is held.
    expect(dayLoad(data.subscriptions, 'cmp_palm', 'sat')).toBe(
      dayLoad(base.subscriptions, 'cmp_palm', 'sat') + 1,
    );
    expect(dayLoad(data.subscriptions, 'cmp_palm', 'tue')).toBe(
      dayLoad(base.subscriptions, 'cmp_palm', 'tue') - 1,
    );
  });

  it('refuses a full day', () => {
    const cedarSub = base.subscriptions.find(
      (s) => s.compoundId === 'cmp_cedar' && s.status === 'active' && s.weeklyDays.join() === 'wed',
    )!;
    expect(() => r.changeWeeklyDay(base, cedarSub.id, 'sun', NOW)).toThrow(/Sunday is full/);
  });
});

describe('change plan and cancel', () => {
  it('upgrading to Premium books both days at the Premium price', () => {
    const data = apply(base, r.changePlan(base, nourSub.id, 'premium', NOW));
    expect(data.subscriptions.find((s) => s.id === nourSub.id)).toMatchObject({
      plan: 'premium',
      weeklyDays: ['tue', 'sat'],
      monthlyPrice: 1600,
    });
    expect(upcomingWashes(data.washes, NOUR_ID, NOW).length).toBe(8);
  });

  it('cancellation keeps washes until the end of the paid month, and can be undone', () => {
    const data = apply(base, r.requestCancellation(base, nourSub.id, 'Moving', NOW));
    const sub = data.subscriptions.find((s) => s.id === nourSub.id)!;
    expect(sub.status).toBe('active');
    expect(sub.cancelAt).toBe('2026-11-30'); // started 30 Aug; renews on the 30th
    expect(upcomingWashes(data.washes, NOUR_ID, NOW).map((w) => w.scheduledDate)).toEqual([
      '2026-11-17',
      '2026-11-24',
    ]);
    const undone = apply(data, r.undoCancellation(data, nourSub.id, NOW));
    expect(undone.subscriptions.find((s) => s.id === nourSub.id)!.cancelAt).toBeUndefined();
    expect(upcomingWashes(undone.washes, NOUR_ID, NOW)).toHaveLength(4);
  });
});

describe('add-ons', () => {
  it('uses the free tire-shine credit first, then charges', () => {
    const wash = nourNext(base);
    const one = apply(base, r.addAddOn(base, wash.id, 'tire_shine', NOW));
    expect(one.customers.find((c) => c.id === NOUR_ID)!.addOnCredits).toBe(0);
    expect(one.payments.at(-1)!.amount).toBe(0);
    const two = apply(one, r.addAddOn(one, wash.id, 'wax_polish', NOW));
    expect(two.payments.at(-1)!.amount).toBe(450);
    expect(two.washes.find((w) => w.id === wash.id)!.addOns).toEqual(['tire_shine', 'wax_polish']);
    expect(() => r.addAddOn(two, wash.id, 'wax_polish', NOW)).toThrow(/already/);
  });
});

describe('wash progression across roles', () => {
  it('scheduled → on site → in progress → completed, notifying the customer', () => {
    const wash = nourNext(base);
    let data = apply(base, r.advanceWash(base, wash.id, NOW));
    expect(data.washes.find((w) => w.id === wash.id)!.status).toBe('washer_on_site');
    expect(data.notifications[0]).toMatchObject({ customerId: NOUR_ID, kind: 'washer_on_site' });
    data = apply(data, r.advanceWash(data, wash.id, NOW));
    expect(data.washes.find((w) => w.id === wash.id)).toMatchObject({ status: 'in_progress' });
    expect(data.washes.find((w) => w.id === wash.id)!.beforePhotoSeed).toBeTruthy();
    data = apply(
      data,
      r.washComplete(data, wash.id, NOW, {
        washerNote: 'Scratch on bumper',
        damageMarkers: [{ x: 10, y: 50, note: 'Scratch' }],
      }),
    );
    const done = data.washes.find((w) => w.id === wash.id)!;
    expect(done.status).toBe('completed');
    expect(done.afterPhotoSeed).toBeTruthy();
    expect(done.washerNote).toBe('Scratch on bumper');
    expect(data.notifications[0]).toMatchObject({
      customerId: NOUR_ID,
      kind: 'wash_done',
      link: `/customer/washes/${wash.id}`,
    });
  });

  it('simulate pulls the persona’s next wash to today and advances the whole board', () => {
    const doneBefore = base.washes.filter(
      (w) => w.scheduledDate === '2026-11-15' && w.status === 'completed',
    ).length;
    let data = base;
    let focus = null;
    for (let i = 0; i < 3; i++) {
      const step = r.simulateNextStep(data, NOUR_ID, NOW);
      data = apply(data, step.patch);
      focus = step.focusWash;
    }
    expect(focus).toMatchObject({
      customerId: NOUR_ID,
      status: 'completed',
      scheduledDate: '2026-11-15',
    });
    const doneAfter = data.washes.filter(
      (w) => w.scheduledDate === '2026-11-15' && w.status === 'completed',
    ).length;
    expect(doneAfter).toBeGreaterThan(doneBefore + 1);
  });

  it('a washer flag skips the wash and opens an issue', () => {
    const wash = nourNext(base);
    const data = apply(base, r.flagWash(base, wash.id, 'car_not_found', NOW));
    expect(data.washes.find((w) => w.id === wash.id)).toMatchObject({
      status: 'skipped',
      skipReason: 'car_not_found',
    });
    expect(data.issues[0]).toMatchObject({
      washId: wash.id,
      type: 'missed_wash',
      status: 'submitted',
    });
    const asked = apply(base, r.flagWash(base, wash.id, 'customer', NOW));
    expect(asked.issues).toHaveLength(base.issues.length);
  });
});

describe('weather delay', () => {
  it('moves a compound-day to the next service day and notifies customers', () => {
    const { patch, moved, movedTo } = r.markWeatherDelay(base, 'cmp_palm', '2026-11-17', NOW);
    const data = apply(base, patch);
    expect(movedTo).toBe('2026-11-21');
    expect(moved).toBeGreaterThan(10);
    expect(
      data.washes.filter(
        (w) =>
          w.compoundId === 'cmp_palm' &&
          w.scheduledDate === '2026-11-17' &&
          w.status === 'scheduled',
      ),
    ).toHaveLength(0);
    const delayed = data.washes.find(
      (w) => w.customerId === NOUR_ID && w.scheduledDate === '2026-11-17',
    )!;
    expect(delayed).toMatchObject({ status: 'weather_delayed', rescheduledTo: '2026-11-21' });
    expect(nourNext(data)).toMatchObject({
      scheduledDate: '2026-11-21',
      rescheduledFrom: '2026-11-17',
    });
    expect(data.notifications.filter((n) => n.title === 'Weather delay')).toHaveLength(moved);
    // A Premium car already booked on the target day is not booked twice.
    const premium = data.subscriptions.find(
      (s) => s.compoundId === 'cmp_palm' && s.plan === 'premium' && s.status === 'active',
    )!;
    expect(
      data.washes.filter(
        (w) => w.subscriptionId === premium.id && w.scheduledDate === '2026-11-21',
      ),
    ).toHaveLength(1);
  });
});

describe('issues, ratings, small edits', () => {
  it('reports an issue and resolving it notifies the customer', () => {
    const { patch, issueId } = r.reportIssue(
      base,
      { customerId: NOUR_ID, type: 'quality', description: ' Dusty wheels ' },
      NOW,
    );
    let data = apply(base, patch);
    expect(data.issues[0]).toMatchObject({
      id: issueId,
      status: 'submitted',
      description: 'Dusty wheels',
      compoundId: 'cmp_palm',
    });
    data = apply(data, r.updateIssue(data, issueId, 'resolved', 'Re-washed.', NOW));
    expect(data.issues[0]).toMatchObject({ status: 'resolved', resolutionNote: 'Re-washed.' });
    expect(data.issues[0].resolvedAt).toBeTruthy();
    expect(data.notifications[0]).toMatchObject({
      kind: 'issue_update',
      title: 'Your report has been resolved',
    });
  });

  it('rates a wash, edits a profile, marks notifications read', () => {
    const wash = base.washes.find(
      (w) => w.customerId === NOUR_ID && w.status === 'completed' && !w.rating,
    )!;
    let data = apply(base, r.rateWash(base, wash.id, { stars: 5, tags: ['Spotless'] }));
    expect(data.washes.find((w) => w.id === wash.id)!.rating!.stars).toBe(5);
    data = apply(data, r.updateCustomer(data, NOUR_ID, { unit: 'Building 15, Apt 1' }));
    expect(data.customers.find((c) => c.id === NOUR_ID)!.unit).toBe('Building 15, Apt 1');
    data = apply(data, r.setPaymentMethod(data, nourSub.id, 'instapay'));
    expect(data.subscriptions.find((s) => s.id === nourSub.id)!.paymentMethod).toBe('instapay');
    data = apply(data, r.markNotificationsRead(data, NOUR_ID));
    expect(data.notifications.filter((n) => n.customerId === NOUR_ID && !n.read)).toHaveLength(0);
  });
});
