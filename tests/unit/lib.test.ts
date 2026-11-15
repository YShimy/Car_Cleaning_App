import {
  formatDateLong,
  formatDateShort,
  formatEGP,
  formatPercent,
  formatTime,
  firstName,
  initialsOf,
  SERVICE_WINDOW_LABEL,
} from '@/lib/format';
import { buildWashICS } from '@/lib/ics';
import { plannedWashDates } from '@/lib/schedule';
import { addDaysISO, joinWeekdays, toISODate, weekdayOf } from '@/lib/dates';
import {
  clearSessions,
  endInterviewSession,
  isRecording,
  loadSessions,
  recordStep,
  recordTap,
  startInterviewSession,
} from '@/lib/sessionRecorder';
import { createRng, hashString } from '@/data/prng';

describe('formatting (PLAN.md section 13)', () => {
  it('formats currency as "EGP 1,250" with no decimals', () => {
    expect(formatEGP(1250)).toBe('EGP 1,250');
    expect(formatEGP(807.5)).toBe('EGP 808');
    expect(formatEGP(0)).toBe('EGP 0');
  });

  it('formats dates and times', () => {
    expect(formatDateShort('2026-11-17')).toBe('Tue, 17 Nov');
    expect(formatDateLong('2026-11-17')).toBe('Tuesday, 17 November');
    expect(formatTime(new Date(2026, 10, 17, 9, 5))).toBe('9:05 AM');
    expect(formatTime(new Date(2026, 10, 17, 14, 0))).toBe('2:00 PM');
    expect(SERVICE_WINDOW_LABEL).toBe('8:00 AM – 2:00 PM');
  });

  it('formats percentages, names and weekdays', () => {
    expect(formatPercent(0.976, 1)).toBe('97.6%');
    expect(formatPercent(0.15)).toBe('15%');
    expect(initialsOf('Ahmed Mostafa')).toBe('AM');
    expect(firstName('Nour Hassan')).toBe('Nour');
    expect(joinWeekdays(['tue', 'sat'])).toBe('Tuesday & Saturday');
    expect(weekdayOf('2026-11-15')).toBe('sun');
    expect(addDaysISO('2026-11-30', 1)).toBe('2026-12-01');
  });
});

describe('plannedWashDates', () => {
  const base = { weeklyDays: ['tue' as const], status: 'active' as const, startedAt: '2026-11-01' };
  const from = new Date(2026, 10, 16);
  const to = new Date(2026, 11, 13);
  const dates = (sub: Parameters<typeof plannedWashDates>[0]) =>
    plannedWashDates(sub, from, to).map(toISODate);

  it('lists every wash day in the range', () => {
    expect(dates(base)).toEqual(['2026-11-17', '2026-11-24', '2026-12-01', '2026-12-08']);
    expect(dates({ ...base, weeklyDays: ['tue', 'sat'] })).toHaveLength(8);
  });

  it('respects start date, pause and cancellation', () => {
    expect(dates({ ...base, startedAt: '2026-11-20' })[0]).toBe('2026-11-24');
    expect(dates({ ...base, status: 'paused', pausedUntil: '2026-11-29' })).toEqual([
      '2026-12-01',
      '2026-12-08',
    ]);
    expect(dates({ ...base, cancelAt: '2026-12-01' })).toEqual(['2026-11-17', '2026-11-24']);
    expect(dates({ ...base, status: 'cancelled' })).toEqual([]);
  });
});

describe('calendar file', () => {
  it('builds a weekly event in the service window', () => {
    const ics = buildWashICS({
      firstDate: '2026-11-17',
      location: 'Palm Grove, Basement B1; Spot 14',
      car: 'Hyundai Elantra',
    });
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('DTSTART:20261117T080000');
    expect(ics).toContain('DTEND:20261117T140000');
    expect(ics).toContain('RRULE:FREQ=WEEKLY');
    expect(ics).toContain(String.raw`LOCATION:Palm Grove\, Basement B1\; Spot 14`);
    expect(ics.split('\r\n').at(-1)).toBe('END:VCALENDAR');
    expect(
      buildWashICS({ firstDate: '2026-11-17', location: 'x', car: 'y', weekly: false }),
    ).not.toContain('RRULE');
  });
});

describe('seeded random generator', () => {
  it('repeats for the same seed and respects ranges', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 20 }, () => a.int(1, 6));
    expect(seqA).toEqual(Array.from({ length: 20 }, () => b.int(1, 6)));
    expect(seqA.every((n) => n >= 1 && n <= 6)).toBe(true);
    expect(createRng(1).weighted([['only', 1]] as const)).toBe('only');
    expect(hashString('abc')).toBe(hashString('abc'));
    expect(hashString('abc')).not.toBe(hashString('abd'));
  });
});

describe('interview session recorder', () => {
  beforeEach(() => clearSessions());

  it('records time per step, taps and choices, on this device only', () => {
    const t0 = 1_000_000;
    startInterviewSession(t0);
    expect(isRecording()).toBe(true);
    recordStep('1', t0);
    recordTap('primary', t0 + 4000);
    recordStep('2', t0 + 4000);
    recordTap('back', t0 + 9000);
    recordStep('1', t0 + 9000);
    recordStep('1', t0 + 9500); // same step again: ignored
    recordStep('2', t0 + 10000);
    endInterviewSession(
      'completed',
      { plan: 'Plus', paymentMethod: 'Card', washDay: 'Tuesday' },
      t0 + 30000,
    );

    expect(isRecording()).toBe(false);
    const [session] = loadSessions();
    expect(session).toMatchObject({
      outcome: 'completed',
      totalMs: 30000,
      backPresses: 1,
      primaryTaps: 1,
      plan: 'Plus',
      paymentMethod: 'Card',
      washDay: 'Tuesday',
    });
    expect(session.stepMs).toEqual({ '1': 5000, '2': 25000 });
    expect(session.events.filter((e) => e.type === 'step')).toHaveLength(4);
  });

  it('marks an unfinished session as abandoned when a new one starts', () => {
    startInterviewSession(1000);
    recordStep('1', 1000);
    startInterviewSession(60_000);
    endInterviewSession('abandoned', {}, 61_000);
    const sessions = loadSessions();
    expect(sessions).toHaveLength(2);
    expect(sessions.every((s) => s.outcome === 'abandoned')).toBe(true);
  });

  it('does nothing when not recording', () => {
    recordStep('3');
    recordTap('primary');
    endInterviewSession('completed');
    expect(loadSessions()).toEqual([]);
  });
});
