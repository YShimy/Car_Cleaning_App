import {
  addOnsTotal,
  canPause,
  canReportDamage,
  canSkip,
  canSubscribeOnDays,
  cancellationDate,
  capacityStatus,
  dayCapacity,
  dayChangeEffectiveFrom,
  dayLoad,
  daysUntil,
  firstWashDate,
  holdsSlot,
  nextBillingDate,
  nextServiceDate,
  pauseEffects,
  planPriceForCar,
  pricePerWash,
  requiredChecklist,
  skipDeadline,
  spotsLeft,
  upcomingServiceDates,
  washTypeFor,
  weatherDelayTarget,
} from '@/lib/rules';
import { toISODate } from '@/lib/dates';
import type { Compound, Subscription } from '@/types/domain';

// 2026-11-15 is a Sunday.
const SUN = new Date(2026, 10, 15, 10, 0);
const iso = toISODate;

const compound: Compound = {
  id: 'c1',
  name: 'Test Court',
  area: 'New Cairo',
  serviceDays: ['tue', 'sat'],
  washerIds: ['w1', 'w2'],
  parkingZones: ['B1'],
  managerName: 'Manager',
  partnershipSince: '2026-01-01',
  status: 'active',
};

const sub = (over: Partial<Subscription> = {}): Subscription => ({
  id: 's' + Math.random(),
  customerId: 'cu',
  carId: 'car',
  compoundId: 'c1',
  plan: 'plus',
  weeklyDays: ['tue'],
  status: 'active',
  startedAt: '2026-09-10',
  monthlyPrice: 950,
  paymentMethod: 'card',
  ...over,
});

describe('capacity', () => {
  it('capacity is washers × washes per washer per day', () => {
    expect(dayCapacity(compound)).toBe(28);
    expect(dayCapacity({ washerIds: ['w1'] })).toBe(14);
  });

  it('cancelled subscriptions free their slot; paused and pending keep it', () => {
    expect(holdsSlot({ status: 'cancelled' })).toBe(false);
    expect(holdsSlot({ status: 'paused' })).toBe(true);
    expect(holdsSlot({ status: 'pending_payment' })).toBe(true);
  });

  it('counts load per compound day, premium on both days', () => {
    const subs = [
      sub(),
      sub({ weeklyDays: ['sat'] }),
      sub({ plan: 'premium', weeklyDays: ['tue', 'sat'] }),
      sub({ status: 'cancelled' }),
      sub({ compoundId: 'other' }),
    ];
    expect(dayLoad(subs, 'c1', 'tue')).toBe(2);
    expect(dayLoad(subs, 'c1', 'sat')).toBe(2);
    expect(spotsLeft(compound, subs, 'tue')).toBe(26);
  });

  it('never reports negative spots', () => {
    const subs = Array.from({ length: 30 }, () => sub());
    expect(spotsLeft(compound, subs, 'tue')).toBe(0);
    expect(canSubscribeOnDays(compound, subs, ['tue'])).toBe(false);
    expect(canSubscribeOnDays(compound, subs, ['sat'])).toBe(true);
    expect(canSubscribeOnDays(compound, subs, ['tue', 'sat'])).toBe(false);
  });

  it('classifies capacity status', () => {
    expect(capacityStatus(0)).toBe('full');
    expect(capacityStatus(1)).toBe('nearly_full');
    expect(capacityStatus(3)).toBe('nearly_full');
    expect(capacityStatus(4)).toBe('available');
  });
});

describe('service dates', () => {
  it('finds the next service day after a date', () => {
    expect(iso(nextServiceDate(['tue', 'sat'], SUN))).toBe('2026-11-17');
    expect(iso(nextServiceDate(['sat'], SUN))).toBe('2026-11-21');
  });

  it('excludes today unless inclusive', () => {
    const tue = new Date(2026, 10, 17, 9);
    expect(iso(nextServiceDate(['tue'], tue))).toBe('2026-11-24');
    expect(iso(nextServiceDate(['tue'], tue, true))).toBe('2026-11-17');
  });

  it('throws without service days', () => {
    expect(() => nextServiceDate([], SUN)).toThrow();
  });

  it('lists upcoming service dates in order', () => {
    expect(upcomingServiceDates(['tue', 'sat'], SUN, 3).map(iso)).toEqual([
      '2026-11-17',
      '2026-11-21',
      '2026-11-24',
    ]);
    expect(upcomingServiceDates(['sun'], SUN, 2, true).map(iso)).toEqual([
      '2026-11-15',
      '2026-11-22',
    ]);
  });

  it('first wash is the next service day after subscribing', () => {
    expect(iso(firstWashDate(['tue'], SUN))).toBe('2026-11-17');
  });

  it('day changes take effect next week (weeks start on Sunday)', () => {
    expect(iso(dayChangeEffectiveFrom(SUN))).toBe('2026-11-22');
    expect(iso(dayChangeEffectiveFrom(new Date(2026, 10, 21, 23)))).toBe('2026-11-22');
  });

  it('weather delay moves a wash to the next service day', () => {
    expect(weatherDelayTarget(['tue', 'sat'], '2026-11-17')).toBe('2026-11-21');
    expect(weatherDelayTarget(['tue', 'sat'], '2026-11-21')).toBe('2026-11-24');
  });

  it('counts days until a date', () => {
    expect(daysUntil('2026-11-17', SUN)).toBe(2);
    expect(daysUntil('2026-11-15', SUN)).toBe(0);
  });
});

describe('skip cutoff', () => {
  const wash = { status: 'scheduled' as const, scheduledDate: '2026-11-17' };

  it('deadline is 8:00 PM the day before', () => {
    const deadline = skipDeadline('2026-11-17');
    expect(iso(deadline)).toBe('2026-11-16');
    expect(deadline.getHours()).toBe(20);
  });

  it('allows skipping up to the cutoff', () => {
    expect(canSkip(wash, new Date(2026, 10, 16, 19, 59))).toEqual({ allowed: true });
    expect(canSkip(wash, new Date(2026, 10, 16, 20, 0))).toEqual({ allowed: true });
  });

  it('blocks skipping after the cutoff', () => {
    expect(canSkip(wash, new Date(2026, 10, 16, 20, 1))).toEqual({
      allowed: false,
      reason: 'past_cutoff',
    });
    expect(canSkip(wash, new Date(2026, 10, 17, 7, 0))).toEqual({
      allowed: false,
      reason: 'past_cutoff',
    });
  });

  it('blocks skipping a wash that is not scheduled', () => {
    expect(canSkip({ ...wash, status: 'in_progress' }, SUN)).toEqual({
      allowed: false,
      reason: 'not_scheduled',
    });
    expect(canSkip({ ...wash, status: 'completed' }, SUN)).toEqual({
      allowed: false,
      reason: 'not_scheduled',
    });
  });
});

describe('pricing', () => {
  it('first car pays full price, additional cars get 15% off', () => {
    expect(planPriceForCar('plus', 0)).toBe(950);
    expect(planPriceForCar('plus', 1)).toBe(808); // 807.5 rounded
    expect(planPriceForCar('essential', 1)).toBe(553); // 552.5 rounded
    expect(planPriceForCar('premium', 2)).toBe(1360);
  });

  it('shows an approximate price per wash', () => {
    expect(pricePerWash('essential')).toBe(150);
    expect(pricePerWash('plus')).toBe(219);
    expect(pricePerWash('premium')).toBe(185);
  });

  it('totals add-ons and uses free tire-shine credits first', () => {
    expect(addOnsTotal([])).toEqual({ total: 0, creditsUsed: 0 });
    expect(addOnsTotal(['tire_shine', 'wax_polish'])).toEqual({ total: 530, creditsUsed: 0 });
    expect(addOnsTotal(['tire_shine', 'wax_polish'], 1)).toEqual({ total: 450, creditsUsed: 1 });
    expect(addOnsTotal(['wax_polish'], 2)).toEqual({ total: 450, creditsUsed: 0 });
  });
});

describe('billing', () => {
  it('renews monthly on the start day', () => {
    expect(iso(nextBillingDate({ startedAt: '2026-09-10' }, SUN))).toBe('2026-12-10');
    expect(iso(nextBillingDate({ startedAt: '2026-09-20' }, SUN))).toBe('2026-11-20');
  });

  it('a renewal due today has been billed: the next one is a month later', () => {
    expect(iso(nextBillingDate({ startedAt: '2026-10-15' }, SUN))).toBe('2026-12-15');
  });

  it('does not drift for end-of-month start dates', () => {
    expect(iso(nextBillingDate({ startedAt: '2026-01-31' }, new Date(2026, 2, 1)))).toBe(
      '2026-03-31',
    );
  });

  it('shifts by paused days', () => {
    expect(iso(nextBillingDate({ startedAt: '2026-09-10', billingShiftDays: 14 }, SUN))).toBe(
      '2026-11-24',
    );
  });

  it('cancellation takes effect at the end of the paid month', () => {
    expect(iso(cancellationDate({ startedAt: '2026-09-10' }, SUN))).toBe('2026-12-10');
  });
});

describe('pause', () => {
  it('allows an active subscription that has not paused recently', () => {
    expect(canPause({ status: 'active' }, SUN)).toEqual({ allowed: true });
    expect(canPause({ status: 'active', lastPausedAt: '2026-08-15' }, SUN)).toEqual({
      allowed: true,
    });
  });

  it('allows at most one pause per 3 months', () => {
    const check = canPause({ status: 'active', lastPausedAt: '2026-09-01' }, SUN);
    expect(check.allowed).toBe(false);
    if (!check.allowed && check.reason === 'cooldown') {
      expect(iso(check.availableFrom)).toBe('2026-12-01');
    } else {
      throw new Error('expected cooldown');
    }
  });

  it('only active subscriptions can pause', () => {
    expect(canPause({ status: 'paused' }, SUN)).toEqual({ allowed: false, reason: 'not_active' });
    expect(canPause({ status: 'cancelled' }, SUN)).toEqual({
      allowed: false,
      reason: 'not_active',
    });
  });

  it('pausing moves the resume date and the billing date by the same length', () => {
    const effects = pauseEffects({ startedAt: '2026-09-20' }, 2, SUN);
    expect(iso(effects.resumeDate)).toBe('2026-11-29');
    expect(effects.billingShiftDays).toBe(14);
    expect(iso(effects.nextBillingBefore)).toBe('2026-11-20');
    expect(iso(effects.nextBillingAfter)).toBe('2026-12-04');
  });

  it('rejects pauses outside 1–4 weeks', () => {
    expect(() => pauseEffects({ startedAt: '2026-09-20' }, 0, SUN)).toThrow(RangeError);
    expect(() => pauseEffects({ startedAt: '2026-09-20' }, 5, SUN)).toThrow(RangeError);
    expect(() => pauseEffects({ startedAt: '2026-09-20' }, 1.5, SUN)).toThrow(RangeError);
  });
});

describe('wash contents', () => {
  it('Essential is always exterior only', () => {
    expect(washTypeFor('essential', ['tue'], new Date(2026, 10, 3))).toBe('exterior');
  });

  it('Plus includes the interior on the first wash of the month', () => {
    expect(washTypeFor('plus', ['tue'], new Date(2026, 10, 3))).toBe('exterior_interior');
    expect(washTypeFor('plus', ['tue'], new Date(2026, 10, 10))).toBe('exterior');
    expect(washTypeFor('plus', ['tue'], new Date(2026, 10, 17))).toBe('exterior');
  });

  it('Premium includes the interior twice a month, on its first weekly day', () => {
    expect(washTypeFor('premium', ['tue', 'sat'], new Date(2026, 10, 3))).toBe('exterior_interior');
    expect(washTypeFor('premium', ['tue', 'sat'], new Date(2026, 10, 17))).toBe(
      'exterior_interior',
    );
    expect(washTypeFor('premium', ['tue', 'sat'], new Date(2026, 10, 10))).toBe('exterior');
    expect(washTypeFor('premium', ['tue', 'sat'], new Date(2026, 10, 7))).toBe('exterior');
  });

  it('builds the washer checklist from wash type and add-ons', () => {
    expect(requiredChecklist('exterior', [])).toEqual([
      'exterior_body',
      'windows',
      'wheels_rims',
      'mirrors',
      'photos_taken',
    ]);
    expect(requiredChecklist('exterior_interior', [])).toContain('interior_vacuum');
    expect(requiredChecklist('exterior', ['deep_interior'])).toContain('dashboard');
    expect(requiredChecklist('exterior', ['seat_shampoo'])).toContain('floor_mats');
    expect(requiredChecklist('exterior', ['tire_shine'])).not.toContain('interior_vacuum');
  });
});

describe('damage claims', () => {
  const done = {
    status: 'completed' as const,
    completedAt: new Date(2026, 10, 14, 11, 0).toISOString(),
  };

  it('can be reported within 24 hours of the wash', () => {
    expect(canReportDamage(done, new Date(2026, 10, 15, 10, 59))).toBe(true);
    expect(canReportDamage(done, new Date(2026, 10, 15, 11, 1))).toBe(false);
  });

  it('needs a completed wash', () => {
    expect(canReportDamage({ status: 'scheduled' }, SUN)).toBe(false);
    expect(canReportDamage({ status: 'completed' }, SUN)).toBe(false);
  });
});
