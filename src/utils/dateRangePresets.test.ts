import { describe, expect, it } from 'vitest';
import { getDateRangeForPreset, isWithinDateRange } from './dateRangePresets';

const reference = new Date('2026-03-15T12:00:00');

describe('getDateRangeForPreset', () => {
  it('allTime is unbounded', () => {
    expect(getDateRangeForPreset('allTime', reference)).toEqual({ start: null, end: null });
  });

  it('thisMonth is the reference month', () => {
    expect(getDateRangeForPreset('thisMonth', reference)).toEqual({
      start: '2026-03-01',
      end: '2026-03-31',
    });
  });

  it('lastMonth is the month before the reference', () => {
    expect(getDateRangeForPreset('lastMonth', reference)).toEqual({
      start: '2026-02-01',
      end: '2026-02-28',
    });
  });

  it('lastMonth crosses a year boundary correctly', () => {
    expect(getDateRangeForPreset('lastMonth', new Date('2026-01-15T12:00:00'))).toEqual({
      start: '2025-12-01',
      end: '2025-12-31',
    });
  });

  it('last3Months spans from two months back through the reference month', () => {
    expect(getDateRangeForPreset('last3Months', reference)).toEqual({
      start: '2026-01-01',
      end: '2026-03-31',
    });
  });

  it('last6Months spans from five months back through the reference month', () => {
    expect(getDateRangeForPreset('last6Months', reference)).toEqual({
      start: '2025-10-01',
      end: '2026-03-31',
    });
  });

  it('thisYear spans the full reference year', () => {
    expect(getDateRangeForPreset('thisYear', reference)).toEqual({
      start: '2026-01-01',
      end: '2026-12-31',
    });
  });

  it('custom uses the given start/end dates', () => {
    expect(
      getDateRangeForPreset('custom', reference, {
        start: new Date('2026-01-10T00:00:00'),
        end: new Date('2026-01-20T00:00:00'),
      }),
    ).toEqual({ start: '2026-01-10', end: '2026-01-20' });
  });

  it('custom is unbounded on a side that has not been picked yet', () => {
    expect(getDateRangeForPreset('custom', reference, { start: null, end: null })).toEqual({
      start: null,
      end: null,
    });
  });
});

describe('isWithinDateRange', () => {
  it('matches everything for an unbounded range', () => {
    expect(isWithinDateRange('2020-01-01', { start: null, end: null })).toBe(true);
  });

  it('excludes a date before the start bound', () => {
    expect(isWithinDateRange('2026-01-31', { start: '2026-02-01', end: null })).toBe(false);
  });

  it('excludes a date after the end bound', () => {
    expect(isWithinDateRange('2026-03-01', { start: null, end: '2026-02-28' })).toBe(false);
  });

  it('includes a date within both bounds', () => {
    expect(isWithinDateRange('2026-02-15', { start: '2026-02-01', end: '2026-02-28' })).toBe(true);
  });

  it('compares only the leading date portion of a fuller ISO string', () => {
    expect(
      isWithinDateRange('2026-02-15T09:30:00.000Z', { start: '2026-02-01', end: '2026-02-28' }),
    ).toBe(true);
  });
});
