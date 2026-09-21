import { getMonthRange } from './reportCalculations';

export const DATE_RANGE_PRESETS = [
  'allTime',
  'thisMonth',
  'lastMonth',
  'last3Months',
  'last6Months',
  'thisYear',
  'custom',
] as const;
export type DateRangePreset = (typeof DATE_RANGE_PRESETS)[number];

export const DATE_RANGE_PRESET_LABELS: Record<DateRangePreset, string> = {
  allTime: 'All time',
  thisMonth: 'This month',
  lastMonth: 'Last month',
  last3Months: 'Last 3 months',
  last6Months: 'Last 6 months',
  thisYear: 'This year',
  custom: 'Custom range',
};

/** Inclusive "YYYY-MM-DD" bounds, or `null` for an unbounded side (used by
 * `allTime`, and by `custom` before both ends are picked). */
export interface DateRange {
  start: string | null;
  end: string | null;
}

function toDateString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export interface CustomDateRange {
  start: Date | null;
  end: Date | null;
}

/**
 * Resolves a preset (plus, for `custom`, whatever the user picked) into the
 * concrete `DateRange` a filter predicate needs. `reference` defaults to
 * now and exists mainly so tests don't depend on the real clock. Reuses
 * `reportCalculations.ts`'s `getMonthRange` rather than re-deriving
 * month-boundary math a third time.
 */
export function getDateRangeForPreset(
  preset: DateRangePreset,
  reference: Date = new Date(),
  custom: CustomDateRange = { start: null, end: null },
): DateRange {
  const year = reference.getFullYear();
  const month = reference.getMonth();

  switch (preset) {
    case 'allTime':
      return { start: null, end: null };
    case 'thisMonth':
      return getMonthRange(year, month);
    case 'lastMonth': {
      const d = new Date(year, month - 1, 1);
      return getMonthRange(d.getFullYear(), d.getMonth());
    }
    case 'last3Months': {
      const from = new Date(year, month - 2, 1);
      return { start: getMonthRange(from.getFullYear(), from.getMonth()).start, end: getMonthRange(year, month).end };
    }
    case 'last6Months': {
      const from = new Date(year, month - 5, 1);
      return { start: getMonthRange(from.getFullYear(), from.getMonth()).start, end: getMonthRange(year, month).end };
    }
    case 'thisYear':
      return { start: `${year}-01-01`, end: `${year}-12-31` };
    case 'custom':
      return {
        start: custom.start ? toDateString(custom.start) : null,
        end: custom.end ? toDateString(custom.end) : null,
      };
    default: {
      const exhaustive: never = preset;
      return exhaustive;
    }
  }
}

/** Whether a stored date string (any ISO-ish string — only the leading
 * "YYYY-MM-DD" is compared) falls within `range`. A `null` bound on either
 * side is treated as unbounded, so `allTime`'s `{start: null, end: null}`
 * matches everything. */
export function isWithinDateRange(dateValue: string, range: DateRange): boolean {
  const day = dateValue.slice(0, 10);
  if (range.start && day < range.start) return false;
  if (range.end && day > range.end) return false;
  return true;
}
