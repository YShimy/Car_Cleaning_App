import { generateDemoData, NOUR_ID } from '@/data/generate';
import { COMPOUND_SEEDS } from '@/data/compounds';
import { addDaysISO, weekdayOf } from '@/lib/dates';
import { dayCapacity, dayLoad } from '@/lib/rules';
import { capacityByDay } from '@/lib/selectors';

// Sunday. Also run on a Tuesday (Nour's wash day) and a Friday.
const NOW = new Date(2026, 10, 15, 11, 0);
const data = generateDemoData(NOW);

describe('mock data generator', () => {
  it('is deterministic: two runs produce identical output', () => {
    expect(JSON.stringify(generateDemoData(NOW))).toBe(JSON.stringify(data));
  });

  it('changes with the seed', () => {
    expect(JSON.stringify(generateDemoData(NOW, 99))).not.toBe(JSON.stringify(data));
  });

  it('has exactly 10 fictional compounds with 2 service days each', () => {
    expect(data.compounds).toHaveLength(10);
    for (const c of data.compounds) {
      expect(c.serviceDays).toHaveLength(2);
      expect(c.washerIds.length).toBeGreaterThanOrEqual(1);
      expect(c.washerIds.length).toBeLessThanOrEqual(3);
    }
    expect(data.compounds.map((c) => c.name)).toEqual(COMPOUND_SEEDS.map((c) => c.name));
  });

  it('has 9 washers on 1–2 compounds each, rated 4.3–4.95, never double-booked', () => {
    expect(data.washers).toHaveLength(9);
    for (const w of data.washers) {
      expect(w.compoundIds.length).toBeGreaterThanOrEqual(1);
      expect(w.compoundIds.length).toBeLessThanOrEqual(2);
      expect(w.rating).toBeGreaterThanOrEqual(4.3);
      expect(w.rating).toBeLessThanOrEqual(4.95);
      const days = w.compoundIds.flatMap(
        (id) => data.compounds.find((c) => c.id === id)!.serviceDays,
      );
      expect(new Set(days).size).toBe(days.length);
    }
  });

  it('generates a few hundred customers, none in the compound that has not launched', () => {
    expect(data.customers.length).toBeGreaterThan(250);
    expect(data.customers.length).toBeLessThan(420);
    const willow = data.compounds.find((c) => c.status === 'onboarding')!;
    expect(data.customers.filter((c) => c.compoundId === willow.id)).toHaveLength(0);
  });

  it('never exceeds capacity on any service day', () => {
    for (const c of data.compounds) {
      for (const day of c.serviceDays) {
        expect(dayLoad(data.subscriptions, c.id, day)).toBeLessThanOrEqual(dayCapacity(c));
      }
    }
  });

  it('never gives a washer more than a day’s capacity of upcoming washes', () => {
    const load = new Map<string, number>();
    for (const w of data.washes) {
      if (w.scheduledDate <= data.generatedOn) continue;
      const key = `${w.washerId}|${w.scheduledDate}`;
      load.set(key, (load.get(key) ?? 0) + 1);
    }
    expect(Math.max(...load.values())).toBeLessThanOrEqual(14);
  });

  it('shows one full day and one nearly full day so the waitlist UI is visible', () => {
    const statuses = data.compounds.flatMap((c) =>
      capacityByDay(c, data.subscriptions).map((d) => d.status),
    );
    expect(statuses).toContain('full');
    expect(statuses).toContain('nearly_full');
    const palm = capacityByDay(data.compounds[0], data.subscriptions);
    expect(palm.map((d) => d.left)).toEqual([6, 2]);
  });

  it('roughly follows the plan, status and family-plan mixes', () => {
    const share = (n: number) => n / data.subscriptions.length;
    expect(share(data.subscriptions.filter((s) => s.plan === 'premium').length)).toBeGreaterThan(
      0.07,
    );
    expect(share(data.subscriptions.filter((s) => s.status === 'active').length)).toBeGreaterThan(
      0.8,
    );
    const twoCars = data.customers.filter(
      (c) => data.cars.filter((car) => car.customerId === c.id).length === 2,
    );
    expect(twoCars.length / data.customers.length).toBeGreaterThan(0.08);
    // The second car gets the family discount.
    const subs = data.subscriptions.filter((s) => s.customerId === twoCars[0].id);
    expect(subs[1].monthlyPrice).toBeLessThan(
      subs[1].plan === 'premium' ? 1600 : subs[1].plan === 'plus' ? 950 : 650,
    );
  });

  it('generates 10 weeks of history, live washes today and 2 weeks ahead', () => {
    const dates = data.washes.map((w) => w.scheduledDate).sort();
    expect(dates[0] >= addDaysISO(data.generatedOn, -70)).toBe(true);
    const today = data.washes.filter((w) => w.scheduledDate === data.generatedOn);
    const states = new Set(today.map((w) => w.status));
    expect(states).toContain('completed');
    expect(states).toContain('in_progress');
    expect(states).toContain('washer_on_site');
    expect(states).toContain('scheduled');
    const future = data.washes.filter((w) => w.scheduledDate > data.generatedOn);
    expect(future.every((w) => w.status === 'scheduled')).toBe(true);
    expect(future.some((w) => w.scheduledDate >= addDaysISO(data.generatedOn, 13))).toBe(true);
  });

  it('keeps history outcomes and ratings realistic', () => {
    const past = data.washes.filter((w) => w.scheduledDate < data.generatedOn);
    const completed = past.filter((w) => w.status === 'completed');
    expect(completed.length / past.length).toBeGreaterThan(0.88);
    const rated = completed.filter((w) => w.rating);
    expect(rated.length / completed.length).toBeGreaterThan(0.45);
    const avg = rated.reduce((sum, w) => sum + w.rating!.stars, 0) / rated.length;
    expect(avg).toBeGreaterThan(4.4);
    expect(avg).toBeLessThan(4.8);
    expect(completed.every((w) => w.beforePhotoSeed && w.afterPhotoSeed)).toBe(true);
  });

  it('creates 18–25 issues including one resolved and one open damage claim', () => {
    expect(data.issues.length).toBeGreaterThanOrEqual(18);
    expect(data.issues.length).toBeLessThanOrEqual(25);
    const damage = data.issues
      .filter((i) => i.type === 'damage')
      .map((i) => i.status)
      .sort();
    expect(damage).toEqual(['resolved', 'under_review']);
  });

  it('creates payments with a handful overdue', () => {
    const overdue = data.payments.filter((p) => p.status === 'overdue').length;
    expect(overdue).toBeGreaterThan(0);
    expect(overdue).toBeLessThan(15);
  });

  it('uses obviously fake phone numbers', () => {
    expect(data.washers.every((w) => w.phone.includes('0000'))).toBe(true);
    expect(data.customers.every((c) => c.phone.includes('0000'))).toBe(true);
  });
});

describe('demo persona: Nour Hassan', () => {
  const nour = data.customers.find((c) => c.id === NOUR_ID)!;
  const washes = data.washes.filter((w) => w.customerId === NOUR_ID);

  it('lives in Palm Grove with a white 2022 Elantra on the Plus plan, Tuesdays, by card', () => {
    expect(nour.name).toBe('Nour Hassan');
    expect(nour.unit).toBe('Building 14, Apt 3');
    expect(data.compounds.find((c) => c.id === nour.compoundId)!.name).toBe('Palm Grove Residence');
    const car = data.cars.find((c) => c.customerId === NOUR_ID)!;
    expect(car).toMatchObject({
      make: 'Hyundai',
      model: 'Elantra',
      year: 2022,
      color: 'white',
      parkingZone: 'Basement B1',
      parkingSpot: 'Spot 14',
    });
    const sub = data.subscriptions.find((s) => s.customerId === NOUR_ID)!;
    expect(sub).toMatchObject({
      plan: 'plus',
      weeklyDays: ['tue'],
      paymentMethod: 'card',
      status: 'active',
      monthlyPrice: 950,
    });
  });

  it('has 9 completed washes with photos and 1 skipped', () => {
    const completed = washes.filter((w) => w.status === 'completed');
    expect(completed).toHaveLength(9);
    expect(washes.filter((w) => w.status === 'skipped')).toHaveLength(1);
    expect(completed.every((w) => w.beforePhotoSeed && w.afterPhotoSeed)).toBe(true);
  });

  it('has one 3-star rating tagged "Late" and one resolved quality issue', () => {
    const three = washes.filter((w) => w.rating?.stars === 3);
    expect(three).toHaveLength(1);
    expect(three[0].rating!.tags).toEqual(['Late']);
    const issues = data.issues.filter((i) => i.customerId === NOUR_ID);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ type: 'quality', status: 'resolved' });
  });

  it('has her next wash on the next Tuesday', () => {
    const next = washes
      .filter((w) => w.status === 'scheduled')
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))[0];
    expect(next.scheduledDate).toBe('2026-11-17');
    expect(weekdayOf(next.scheduledDate)).toBe('tue');
  });

  it('is "washer on site" today when today is Tuesday', () => {
    const tuesday = generateDemoData(new Date(2026, 10, 17, 11, 0));
    const today = tuesday.washes.find(
      (w) => w.customerId === NOUR_ID && w.scheduledDate === '2026-11-17',
    )!;
    expect(today.status).toBe('washer_on_site');
    expect(
      tuesday.washes.filter((w) => w.customerId === NOUR_ID && w.status === 'completed'),
    ).toHaveLength(9);
  });

  it('has seeded notifications', () => {
    const titles = data.notifications.filter((n) => n.customerId === NOUR_ID).map((n) => n.title);
    expect(titles).toContain('Your car is clean — see photos');
    expect(titles).toContain('Payment received: EGP 950');
    expect(titles).toContain('Your report has been resolved');
  });
});
