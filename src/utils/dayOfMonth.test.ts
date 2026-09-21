import { describe, expect, it } from 'vitest';
import { getDaysUntil, getNextOccurrenceOfDay } from './dayOfMonth';

describe('getNextOccurrenceOfDay', () => {
  it("returns this month's occurrence when it has not passed yet", () => {
    const asOf = new Date(2026, 2, 10); // 10 March 2026
    expect(getNextOccurrenceOfDay(15, asOf)).toEqual(new Date(2026, 2, 15));
  });

  it("returns this month's occurrence when it is today", () => {
    const asOf = new Date(2026, 2, 15);
    expect(getNextOccurrenceOfDay(15, asOf)).toEqual(new Date(2026, 2, 15));
  });

  it("rolls forward to next month once this month's day has passed", () => {
    const asOf = new Date(2026, 2, 20); // 20 March 2026
    expect(getNextOccurrenceOfDay(15, asOf)).toEqual(new Date(2026, 3, 15));
  });

  it('clamps a day that overflows a shorter month instead of rolling over', () => {
    // February 2026 has 28 days; asking for day 31 should land on the
    // 28th, not spill into March.
    const asOf = new Date(2026, 1, 1); // 1 Feb 2026
    expect(getNextOccurrenceOfDay(31, asOf)).toEqual(new Date(2026, 1, 28));
  });

  it('rolls a December occurrence into January of the next year', () => {
    const asOf = new Date(2026, 11, 20); // 20 Dec 2026
    expect(getNextOccurrenceOfDay(15, asOf)).toEqual(new Date(2027, 0, 15));
  });
});

describe('getDaysUntil', () => {
  it('returns whole days ignoring time-of-day', () => {
    const asOf = new Date(2026, 5, 15, 23, 0);
    const due = new Date(2026, 5, 20, 1, 0);
    expect(getDaysUntil(due, asOf)).toBe(5);
  });

  it('returns 0 when the date is today', () => {
    const asOf = new Date(2026, 5, 15);
    expect(getDaysUntil(new Date(2026, 5, 15), asOf)).toBe(0);
  });
});
