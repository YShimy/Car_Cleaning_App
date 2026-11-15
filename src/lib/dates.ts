import { addDays, format, parseISO, startOfDay } from 'date-fns';
import type { ISODate, Weekday } from '@/types/domain';

/** Index matches Date.getDay(). */
export const WEEKDAYS: Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export const WEEKDAY_LABEL: Record<Weekday, string> = {
  sun: 'Sunday',
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
};

export const toISODate = (date: Date): ISODate => format(date, 'yyyy-MM-dd');

/** Parses an ISO date as local midnight. */
export const fromISODate = (iso: ISODate): Date => startOfDay(parseISO(iso));

export const weekdayOf = (date: Date | ISODate): Weekday =>
  WEEKDAYS[(typeof date === 'string' ? fromISODate(date) : date).getDay()];

export const addDaysISO = (iso: ISODate, days: number): ISODate =>
  toISODate(addDays(fromISODate(iso), days));

/** "Tuesday & Saturday" */
export const joinWeekdays = (days: Weekday[]): string =>
  days.map((d) => WEEKDAY_LABEL[d]).join(' & ');
