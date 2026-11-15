import { addDays } from 'date-fns';
import type { Subscription } from '@/types/domain';
import { fromISODate, WEEKDAYS } from './dates';

/**
 * Dates in [from, to] on which a subscription should be washed, respecting
 * its start date, pause window and cancellation date.
 */
export function plannedWashDates(
  sub: Pick<Subscription, 'weeklyDays' | 'status' | 'startedAt' | 'pausedUntil' | 'cancelAt'>,
  from: Date,
  to: Date,
): Date[] {
  if (sub.status === 'cancelled') return [];
  const started = fromISODate(sub.startedAt);
  const resume = sub.pausedUntil ? fromISODate(sub.pausedUntil) : null;
  const end = sub.cancelAt ? fromISODate(sub.cancelAt) : null;
  const out: Date[] = [];
  for (let d = from; d.getTime() <= to.getTime(); d = addDays(d, 1)) {
    if (!sub.weeklyDays.includes(WEEKDAYS[d.getDay()])) continue;
    if (d.getTime() < started.getTime()) continue;
    if (resume && d.getTime() < resume.getTime()) continue;
    if (end && d.getTime() >= end.getTime()) continue;
    out.push(d);
  }
  return out;
}
