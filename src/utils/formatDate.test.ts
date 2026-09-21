import { describe, expect, it } from 'vitest';
import { formatDate, toDate } from './formatDate';

describe('toDate', () => {
  it('passes through valid Date instances', () => {
    const d = new Date('2026-08-31T00:00:00Z');
    expect(toDate(d)).toEqual(d);
  });

  it('parses ISO date strings', () => {
    expect(toDate('2026-08-31')?.getUTCFullYear()).toBe(2026);
  });

  it('reads Firestore-Timestamp-like objects via toDate()', () => {
    const fakeTimestamp = { toDate: () => new Date('2026-01-01T00:00:00Z') };
    expect(toDate(fakeTimestamp)?.getUTCFullYear()).toBe(2026);
  });

  it('returns null for garbage input', () => {
    expect(toDate('not a date')).toBeNull();
    expect(toDate(null)).toBeNull();
    expect(toDate(undefined)).toBeNull();
  });
});

describe('formatDate', () => {
  it('formats a valid date with the default pattern', () => {
    expect(formatDate(new Date('2026-08-31T00:00:00Z'), 'yyyy-MM-dd')).toBe('2026-08-31');
  });

  it('falls back to an em dash for invalid input', () => {
    expect(formatDate('invalid')).toBe('—');
  });
});
