import { generateDemoData, NOUR_ID } from '@/data/generate';
import {
  accessLog,
  anonymousUnit,
  averageRating,
  capacityByDay,
  compoundSatisfaction,
  compoundStats,
  expectedCarsThisWeek,
  kpis,
  lastCompletedWash,
  monthlyChurnRate,
  monthlyRecurringRevenue,
  monthlyUsage,
  onTimeRate,
  pastWashes,
  revenueByPlan,
  subscriberGrowth,
  todayProgress,
  upcomingWashes,
  washerStats,
  washesPerDay,
  washesThisWeek,
} from '@/lib/selectors';
import type { Subscription, Wash } from '@/types/domain';

const NOW = new Date(2026, 10, 15, 11, 0); // Sunday
const data = generateDemoData(NOW);

const wash = (over: Partial<Wash>): Wash => ({
  id: 'w' + Math.random(),
  subscriptionId: 's1',
  carId: 'car',
  customerId: 'cu',
  compoundId: 'c1',
  washerId: 'w1',
  scheduledDate: '2026-11-10',
  type: 'exterior',
  addOns: [],
  status: 'completed',
  ...over,
});
const sub = (over: Partial<Subscription>): Subscription => ({
  id: 's' + Math.random(),
  customerId: 'cu',
  carId: 'car',
  compoundId: 'c1',
  plan: 'plus',
  weeklyDays: ['tue'],
  status: 'active',
  startedAt: '2026-06-01',
  monthlyPrice: 950,
  paymentMethod: 'card',
  ...over,
});

describe('KPI selectors (hand-built data)', () => {
  it('MRR sums active subscriptions only', () => {
    expect(
      monthlyRecurringRevenue([
        sub({}),
        sub({ monthlyPrice: 650 }),
        sub({ status: 'paused' }),
        sub({ status: 'cancelled' }),
      ]),
    ).toBe(1600);
  });

  it('churn = cancelled in the last 30 days ÷ live 30 days ago', () => {
    const subs = [
      ...Array.from({ length: 9 }, () => sub({})),
      sub({ status: 'cancelled', cancelAt: '2026-11-01' }),
      sub({ status: 'cancelled', cancelAt: '2026-08-01' }), // too old to count
      sub({ startedAt: '2026-11-10' }), // too new to be in the base
    ];
    expect(monthlyChurnRate(subs, NOW)).toBeCloseTo(0.1);
    expect(monthlyChurnRate([], NOW)).toBe(0);
  });

  it('on-time rate counts missed and weather-delayed washes against us', () => {
    const washes = [
      wash({}),
      wash({}),
      wash({ status: 'missed' }),
      wash({ status: 'weather_delayed' }),
      wash({ status: 'skipped' }), // customer's choice: ignored
      wash({ scheduledDate: '2026-09-01', status: 'missed' }), // older than 30 days
    ];
    expect(onTimeRate(washes, NOW)).toBe(0.5);
    expect(onTimeRate([], NOW)).toBe(1);
  });

  it('average rating ignores unrated washes', () => {
    expect(
      averageRating([
        wash({ rating: { stars: 5, tags: [] } }),
        wash({ rating: { stars: 4, tags: [] } }),
        wash({}),
      ]),
    ).toBe(4.5);
    expect(averageRating([wash({})])).toBeNull();
  });

  it('washes this week splits done and still scheduled (week starts Sunday)', () => {
    const washes = [
      wash({ scheduledDate: '2026-11-15' }),
      wash({ scheduledDate: '2026-11-17', status: 'scheduled' }),
      wash({ scheduledDate: '2026-11-21', status: 'in_progress' }),
      wash({ scheduledDate: '2026-11-14' }),
      wash({ scheduledDate: '2026-11-22', status: 'scheduled' }),
    ];
    expect(washesThisWeek(washes, NOW)).toEqual({ done: 1, scheduled: 2 });
  });

  it('monthly usage reads "x of y exterior · x of y interior"', () => {
    const washes = [
      wash({ scheduledDate: '2026-11-03', type: 'exterior_interior' }),
      wash({ scheduledDate: '2026-11-10' }),
      wash({ scheduledDate: '2026-11-17', status: 'scheduled' }),
      wash({ scheduledDate: '2026-11-24', status: 'skipped' }),
      wash({ scheduledDate: '2026-10-27' }),
    ];
    expect(monthlyUsage(washes, 's1', NOW)).toEqual({
      exteriorDone: 2,
      exteriorTotal: 3,
      interiorDone: 1,
      interiorTotal: 1,
    });
  });

  it('anonymises units for the compound manager', () => {
    expect(anonymousUnit('Building 14, Apt 3')).toBe('Building 14');
    expect(anonymousUnit('Villa 27')).toBe('Villa 27');
  });
});

describe('selectors on generated data', () => {
  it('KPIs are derived and plausible', () => {
    const k = kpis(data, NOW);
    expect(k.activeSubscribers).toBe(
      data.subscriptions.filter((s) => s.status === 'active').length,
    );
    expect(k.mrr).toBeGreaterThan(k.activeSubscribers * 550);
    expect(k.onTimeRate).toBeGreaterThan(0.9);
    expect(k.averageRating!).toBeGreaterThan(4.4);
    expect(k.churnRate).toBeGreaterThan(0);
    expect(k.churnRate).toBeLessThan(0.1);
    expect(k.openIssues).toBe(data.issues.filter((i) => i.status !== 'resolved').length);
  });

  it('capacity per day matches the load', () => {
    const [sun, wed] = capacityByDay(data.compounds[1], data.subscriptions);
    expect(sun).toMatchObject({ day: 'sun', capacity: 28, left: 0, status: 'full' });
    expect(wed.left).toBe(5);
  });

  it('subscriber growth starts around 40 and ends at the current total', () => {
    const growth = subscriberGrowth(data.subscriptions, NOW);
    expect(growth).toHaveLength(6);
    expect(growth[0].subscribers).toBeGreaterThan(25);
    expect(growth[0].subscribers).toBeLessThan(90);
    for (let i = 1; i < growth.length; i++)
      expect(growth[i].subscribers).toBeGreaterThan(growth[i - 1].subscribers);
    expect(growth[5].subscribers).toBe(
      data.subscriptions.filter((s) => s.status === 'active' || s.status === 'paused').length,
    );
  });

  it('chart series have the right shape', () => {
    const perDay = washesPerDay(data.washes, NOW);
    expect(perDay).toHaveLength(14);
    expect(perDay.at(-1)!.date).toBe('2026-11-15');
    expect(perDay.reduce((sum, d) => sum + d.washes, 0)).toBeGreaterThan(300);
    const byPlan = revenueByPlan(data.subscriptions);
    expect(byPlan.map((p) => p.plan)).toEqual(['Essential', 'Plus', 'Premium']);
    expect(byPlan.reduce((sum, p) => sum + p.revenue, 0)).toBe(
      monthlyRecurringRevenue(data.subscriptions),
    );
    expect(compoundStats(data, 'cmp_palm').subscribers).toBeGreaterThan(20);
  });

  it('today panel lists the compounds served today', () => {
    const rows = todayProgress(data, NOW);
    expect(rows.map((r) => r.compound.name)).toEqual(['Cedar Heights', 'Olive Court']);
    for (const row of rows) {
      expect(row.done).toBeGreaterThan(0);
      expect(row.done).toBeLessThan(row.total);
      expect(row.washers.length).toBe(2);
    }
  });

  it('customer wash lists are ordered', () => {
    const up = upcomingWashes(data.washes, NOUR_ID, NOW);
    expect(up.map((w) => w.scheduledDate)).toEqual([
      '2026-11-17',
      '2026-11-24',
      '2026-12-01',
      '2026-12-08',
    ]);
    const past = pastWashes(data.washes, NOUR_ID);
    expect(past).toHaveLength(10);
    expect(past[0].scheduledDate).toBe('2026-11-10');
    expect(lastCompletedWash(data.washes, NOUR_ID)!.scheduledDate).toBe('2026-11-10');
  });

  it('washer stats and the manager views are derived from washes', () => {
    const washerId = data.compounds[1].washerIds[0];
    const stats = washerStats(data, washerId, NOW);
    expect(stats.doneToday).toBeGreaterThan(0);
    expect(stats.totalToday).toBeGreaterThan(stats.doneToday);
    expect(stats.averageMinutes!).toBeGreaterThan(15);
    expect(stats.averageMinutes!).toBeLessThan(40);

    const log = accessLog(data, 'cmp_cedar', NOW);
    expect(log.length).toBeGreaterThanOrEqual(8); // 2 washers × ~5 service days
    expect(log[0].date).toBe('2026-11-15');
    expect(log[0].exit).toBeUndefined(); // still on site today
    expect(log.at(-1)!.exit).toBeTruthy();

    const sat = compoundSatisfaction(data, 'cmp_cedar', NOW);
    expect(sat.averageRating!).toBeGreaterThan(4);
    expect(sat.complaintsResolved).toBeLessThanOrEqual(sat.complaints.length);

    const week = expectedCarsThisWeek(data, data.compounds[1], NOW);
    expect(week).toHaveLength(2);
    expect(week[0].cars).toBeGreaterThan(10);
  });
});
