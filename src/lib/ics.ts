import { addDays } from 'date-fns';
import { SERVICE_WINDOW } from '@/config/business';
import { BRAND } from '@/config/brand';
import { fromISODate } from './dates';
import type { ISODate } from '@/types/domain';

const pad = (n: number) => String(n).padStart(2, '0');
const stamp = (d: Date, hour: number) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(hour)}0000`;
const escapeText = (text: string) => text.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');

/** A weekly calendar event for the wash window, as iCalendar text. */
export function buildWashICS(input: {
  firstDate: ISODate;
  location: string;
  car: string;
  weekly?: boolean;
}): string {
  const date = fromISODate(input.firstDate);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${BRAND.name}//Demo//EN`,
    'BEGIN:VEVENT',
    `UID:${input.firstDate}-${input.car.replace(/\W/g, '')}@lamaa.demo`,
    `DTSTAMP:${stamp(addDays(date, 0), 0)}`,
    `DTSTART:${stamp(date, SERVICE_WINDOW.startHour)}`,
    `DTEND:${stamp(date, SERVICE_WINDOW.endHour)}`,
    ...(input.weekly === false ? [] : ['RRULE:FREQ=WEEKLY']),
    `SUMMARY:${escapeText(`${BRAND.name} car wash`)}`,
    `LOCATION:${escapeText(input.location)}`,
    `DESCRIPTION:${escapeText(`Your ${input.car} is washed in its parking spot. No need to be there.`)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadTextFile(filename: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
