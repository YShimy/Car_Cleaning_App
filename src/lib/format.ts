import { format } from 'date-fns';
import { SERVICE_WINDOW } from '@/config/business';
import type { ISODate, ISODateTime } from '@/types/domain';
import { fromISODate } from './dates';

const egp = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/** "EGP 1,250" — no decimals. */
export const formatEGP = (amount: number): string => `EGP ${egp.format(Math.round(amount))}`;

const asDate = (d: Date | ISODate | ISODateTime): Date =>
  typeof d === 'string' ? (d.length === 10 ? fromISODate(d) : new Date(d)) : d;

/** "Tue, 18 Nov" — for lists. */
export const formatDateShort = (d: Date | string): string => format(asDate(d), 'EEE, d MMM');

/** "Tuesday, 18 November" — for detail cards. */
export const formatDateLong = (d: Date | string): string => format(asDate(d), 'EEEE, d MMMM');

/** "18 Nov 2026" — for tables. */
export const formatDateNumeric = (d: Date | string): string => format(asDate(d), 'd MMM yyyy');

/** "9:05 AM" */
export const formatTime = (d: Date | string): string => format(asDate(d), 'h:mm a');

const hourLabel = (hour: number, withMinutes: boolean): string => {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}${withMinutes ? ':00' : ''} ${hour < 12 ? 'AM' : 'PM'}`;
};

/** "8:00 AM – 2:00 PM" */
export const SERVICE_WINDOW_LABEL = `${hourLabel(SERVICE_WINDOW.startHour, true)} – ${hourLabel(SERVICE_WINDOW.endHour, true)}`;

/** "8 AM and 2 PM" — for sentences. */
export const SERVICE_WINDOW_SENTENCE = `${hourLabel(SERVICE_WINDOW.startHour, false)} and ${hourLabel(SERVICE_WINDOW.endHour, false)}`;

export const formatPercent = (ratio: number, digits = 0): string =>
  `${(ratio * 100).toFixed(digits)}%`;

export const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

export const firstName = (name: string): string => name.split(/\s+/)[0] ?? name;
