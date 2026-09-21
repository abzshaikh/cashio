import { describe, expect, it } from 'vitest';
import {
  addInterval,
  getDueOccurrences,
  MAX_CATCH_UP_OCCURRENCES,
  parseDateOnly,
  toDateOnlyString,
} from './recurringCalculations';

describe('toDateOnlyString / parseDateOnly', () => {
  it('round-trips a date through the "YYYY-MM-DD" format', () => {
    const date = new Date(2026, 1, 5); // 5 Feb 2026
    expect(toDateOnlyString(date)).toBe('2026-02-05');
    expect(toDateOnlyString(parseDateOnly('2026-02-05'))).toBe('2026-02-05');
  });

  it('parses back to local midnight, not a UTC-shifted day', () => {
    const parsed = parseDateOnly('2026-01-01');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(0);
    expect(parsed.getDate()).toBe(1);
  });
});

describe('addInterval', () => {
  const d = (s: string) => parseDateOnly(s);

  it('advances a day', () => {
    expect(toDateOnlyString(addInterval(d('2026-02-05'), 'daily'))).toBe('2026-02-06');
  });

  it('advances a week', () => {
    expect(toDateOnlyString(addInterval(d('2026-02-05'), 'weekly'))).toBe('2026-02-12');
  });

  it('advances a month', () => {
    expect(toDateOnlyString(addInterval(d('2026-02-05'), 'monthly'))).toBe('2026-03-05');
  });

  it('advances a quarter', () => {
    expect(toDateOnlyString(addInterval(d('2026-01-31'), 'quarterly'))).toBe('2026-05-01');
    // 31 Jan + 3 months overflows April (30 days) to 1 May — the accepted
    // native-Date rollover behavior documented on `addInterval`.
  });

  it('advances a year, including across a leap day', () => {
    expect(toDateOnlyString(addInterval(d('2024-02-29'), 'yearly'))).toBe('2025-03-01');
  });

  it('rolls a month-end day over into the next month when the target month is shorter', () => {
    expect(toDateOnlyString(addInterval(d('2026-01-31'), 'monthly'))).toBe('2026-03-03');
    // Jan 31 + 1 month has no Feb 31, so native Date rolls into March —
    // documented as an accepted limitation on `addInterval`.
  });
});

describe('getDueOccurrences', () => {
  it('returns nothing when the next occurrence is still in the future', () => {
    const result = getDueOccurrences('2026-03-01', 'monthly', null, d('2026-02-15'));
    expect(result.occurrenceDates).toEqual([]);
    expect(result.newNextOccurrence).toBe('2026-03-01');
    expect(result.capped).toBe(false);
  });

  it('returns exactly one occurrence when due today', () => {
    const result = getDueOccurrences('2026-03-01', 'monthly', null, d('2026-03-01'));
    expect(result.occurrenceDates).toEqual(['2026-03-01']);
    expect(result.newNextOccurrence).toBe('2026-04-01');
  });

  it('catches up several missed occurrences at once', () => {
    const result = getDueOccurrences('2026-01-01', 'monthly', null, d('2026-04-15'));
    expect(result.occurrenceDates).toEqual(['2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01']);
    expect(result.newNextOccurrence).toBe('2026-05-01');
    expect(result.capped).toBe(false);
  });

  it('stops at an end date even if more occurrences would otherwise be due', () => {
    const result = getDueOccurrences('2026-01-01', 'monthly', '2026-02-15', d('2026-06-01'));
    expect(result.occurrenceDates).toEqual(['2026-01-01', '2026-02-01']);
    // The cursor stops advancing once it would exceed endDate.
    expect(result.newNextOccurrence).toBe('2026-03-01');
  });

  it('returns nothing once already past the end date', () => {
    const result = getDueOccurrences('2026-03-01', 'monthly', '2026-02-15', d('2026-06-01'));
    expect(result.occurrenceDates).toEqual([]);
    expect(result.newNextOccurrence).toBe('2026-03-01');
  });

  it('caps a very long catch-up backlog and reports it', () => {
    const result = getDueOccurrences('2020-01-01', 'daily', null, d('2026-01-01'));
    expect(result.occurrenceDates).toHaveLength(MAX_CATCH_UP_OCCURRENCES);
    expect(result.capped).toBe(true);
    // The cursor only advanced past the capped dates, not all the way to `asOf`.
    expect(result.newNextOccurrence < '2026-01-01').toBe(true);
  });

  function d(s: string): Date {
    return parseDateOnly(s);
  }
});
