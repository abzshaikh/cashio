import { describe, expect, it } from 'vitest';
import {
  formatChangePercent,
  formatSavingsRateChange,
  getPeriodOverPeriodChange,
  getSavingsRate,
  getTrendDirection,
  percentChange,
} from './periodComparison';

describe('percentChange', () => {
  it('computes a positive percent change', () => {
    expect(percentChange(120, 100)).toBeCloseTo(20);
  });

  it('computes a negative percent change', () => {
    expect(percentChange(80, 100)).toBeCloseTo(-20);
  });

  it('returns null when previous is zero and current is not', () => {
    expect(percentChange(50, 0)).toBeNull();
  });

  it('returns 0 when both are exactly zero', () => {
    expect(percentChange(0, 0)).toBe(0);
  });

  it('divides by the absolute value of a negative previous value', () => {
    // (100 - -200) / |-200| = 300/200 = 150%
    expect(percentChange(100, -200)).toBeCloseTo(150);
  });
});

describe('getPeriodOverPeriodChange', () => {
  it('computes percent change for income/expense/net regardless of period length', () => {
    const result = getPeriodOverPeriodChange(
      { income: 72000, expense: 52800, net: 19200 },
      { income: 60000, expense: 48000, net: 12000 },
    );
    expect(result.incomeChangePercent).toBeCloseTo(20);
    expect(result.expenseChangePercent).toBeCloseTo(10);
    expect(result.netChangePercent).toBeCloseTo(60);
  });
});

describe('getSavingsRate', () => {
  it('computes net divided by income', () => {
    expect(getSavingsRate({ income: 5000, expense: 3500, net: 1500 })).toBeCloseTo(0.3);
  });

  it('returns null when there was no income', () => {
    expect(getSavingsRate({ income: 0, expense: 500, net: -500 })).toBeNull();
  });
});

describe('getTrendDirection', () => {
  it('treats an increase as favorable when higherIsBetter is true', () => {
    expect(getTrendDirection(10, true)).toBe('up');
  });

  it('treats an increase as unfavorable when higherIsBetter is false', () => {
    expect(getTrendDirection(10, false)).toBe('down');
  });

  it('is neutral for null or zero change', () => {
    expect(getTrendDirection(null, true)).toBe('neutral');
    expect(getTrendDirection(0, true)).toBe('neutral');
  });
});

describe('formatChangePercent', () => {
  it('defaults the comparison label to "last month"', () => {
    expect(formatChangePercent(12.34)).toBe('+12.3% vs last month');
    expect(formatChangePercent(null)).toBe('No data last month');
  });

  it('accepts a custom comparison label, e.g. for a yearly comparison', () => {
    expect(formatChangePercent(12.34, 'last year')).toBe('+12.3% vs last year');
    expect(formatChangePercent(-8, 'last year')).toBe('-8.0% vs last year');
    expect(formatChangePercent(null, 'last year')).toBe('No data last year');
  });
});

describe('formatSavingsRateChange', () => {
  it('defaults the comparison label to "last month"', () => {
    expect(formatSavingsRateChange(0.35, 0.28)).toBe('+7.0 pts vs last month');
    expect(formatSavingsRateChange(null, 0.2)).toBe('No data last month');
  });

  it('accepts a custom comparison label, e.g. for a yearly comparison', () => {
    expect(formatSavingsRateChange(0.35, 0.28, 'last year')).toBe('+7.0 pts vs last year');
    expect(formatSavingsRateChange(null, 0.2, 'last year')).toBe('No data last year');
  });
});
