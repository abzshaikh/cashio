import type { RecurringFrequency } from '../types/recurringTransaction';
import { parseDateOnly, toDateOnlyString } from './formatDate';

/** `toDateOnlyString`/`parseDateOnly` now live in `formatDate.ts` (so
 * `toDate()` there can share the same date-only parsing for every service,
 * not just this one) — re-exported here so existing imports from this
 * module keep working. */
export { parseDateOnly, toDateOnlyString } from './formatDate';

/**
 * Advances `date` by one occurrence of `frequency`. `monthly`/`quarterly`/
 * `yearly` use native `Date` month/year arithmetic, which normalizes an
 * overflowing day (e.g. 31 Jan + 1 month lands on 2 or 3 Mar, not "the last
 * day of February") — an accepted limitation, same "don't build a bespoke
 * calendar system for this" tradeoff already made elsewhere in this project
 * (see PHASE_LOG.md's Phase 14 section) rather than clamping to month-end.
 */
export function addInterval(date: Date, frequency: RecurringFrequency): Date {
  switch (frequency) {
    case 'daily':
      return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    case 'weekly':
      return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 7);
    case 'monthly':
      return new Date(date.getFullYear(), date.getMonth() + 1, date.getDate());
    case 'quarterly':
      return new Date(date.getFullYear(), date.getMonth() + 3, date.getDate());
    case 'yearly':
      return new Date(date.getFullYear() + 1, date.getMonth(), date.getDate());
    default: {
      const exhaustive: never = frequency;
      return exhaustive;
    }
  }
}

/** Defensive cap on how many occurrences a single `getDueOccurrences` call
 * will ever catch up in one pass — guards against a runaway loop if a rule
 * is left unattended for a very long time (e.g. a `daily` rule whose
 * `nextOccurrence` is years in the past). Any occurrences past this cap are
 * simply caught up on the *next* check instead of all at once. */
export const MAX_CATCH_UP_OCCURRENCES = 60;

export interface DueOccurrencesResult {
  /** "YYYY-MM-DD" dates that are due, oldest first. Empty when nothing is
   * due yet (including when the rule has already ended). */
  occurrenceDates: string[];
  /** The `nextOccurrence` value to store once every date above has been
   * generated. Equal to the input `nextOccurrence` when nothing is due. */
  newNextOccurrence: string;
  /** True if `MAX_CATCH_UP_OCCURRENCES` was hit before catching all the way
   * up to `asOf` — the remaining backlog will be picked up on a later call. */
  capped: boolean;
}

/**
 * Walks a rule's schedule forward from `nextOccurrence`, collecting every
 * occurrence date that is due on or before `asOf` (and not past `endDate`,
 * when the rule has one). Pure date math — no Firestore, no side effects —
 * so `generateDueOccurrences` in `recurringTransactionService.ts` can stay
 * a thin orchestration layer around this and the real transaction-creating
 * service calls, and this function itself is fully unit-testable.
 */
export function getDueOccurrences(
  nextOccurrence: string,
  frequency: RecurringFrequency,
  endDate: string | null,
  asOf: Date = new Date(),
): DueOccurrencesResult {
  const asOfString = toDateOnlyString(asOf);
  const occurrenceDates: string[] = [];
  let cursor = nextOccurrence;
  let capped = false;

  while (cursor <= asOfString && (endDate === null || cursor <= endDate)) {
    if (occurrenceDates.length >= MAX_CATCH_UP_OCCURRENCES) {
      capped = true;
      break;
    }
    occurrenceDates.push(cursor);
    cursor = toDateOnlyString(addInterval(parseDateOnly(cursor), frequency));
  }

  return { occurrenceDates, newNextOccurrence: cursor, capped };
}
