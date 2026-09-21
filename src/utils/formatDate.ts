import { format, formatDistanceToNow, isValid } from 'date-fns';

/** Matches a bare calendar-date string with no time/zone component, e.g.
 * "2026-09-01". Deliberately excludes full ISO instants like
 * "2026-09-01T00:00:00.000Z", which must keep going through `new Date()`. */
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Formats `date` as a local-calendar "YYYY-MM-DD" string — never a UTC
 * instant, so a calendar date (a transaction's date, a budget's start/end,
 * …) never shifts by a day depending on the reader's timezone. This is the
 * canonical definition; `recurringCalculations.ts` re-exports it rather
 * than duplicating it. */
export function toDateOnlyString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Parses a "YYYY-MM-DD" string back into a local-midnight `Date` — the
 * inverse of `toDateOnlyString`. Deliberately not `new Date(value)`: that
 * parses a bare date-only string as UTC midnight, which renders as the
 * previous day in any timezone behind UTC (and, once such a string is
 * naively `.slice(0, 10)`-compared as a range boundary, as the wrong day
 * in any timezone ahead of UTC too). */
export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

/** Coerces Date | Firestore-Timestamp-like | string | number into a Date.
 *
 * A bare "YYYY-MM-DD" string is parsed via local Y/M/D components
 * (`parseDateOnly`), not `new Date(value)`: the native parser treats a
 * date-only string as UTC midnight, which is the wrong calendar day in any
 * timezone behind UTC. A full ISO instant (with a time/zone component) is
 * still parsed natively, since that's a true point in time rather than a
 * calendar date. */
export function toDate(value: unknown): Date | null {
  if (value instanceof Date) return isValid(value) ? value : null;
  if (typeof value === 'string' && DATE_ONLY_PATTERN.test(value)) {
    const d = parseDateOnly(value);
    return isValid(d) ? d : null;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isValid(d) ? d : null;
  }
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate: unknown }).toDate === 'function'
  ) {
    // Firestore Timestamp
    const d = (value as { toDate: () => Date }).toDate();
    return isValid(d) ? d : null;
  }
  return null;
}

export function formatDate(value: unknown, pattern = 'd MMM yyyy'): string {
  const d = toDate(value);
  return d ? format(d, pattern) : '—';
}

export function formatDateTime(value: unknown): string {
  return formatDate(value, 'd MMM yyyy, h:mm a');
}

export function formatRelative(value: unknown): string {
  const d = toDate(value);
  return d ? formatDistanceToNow(d, { addSuffix: true }) : '—';
}
