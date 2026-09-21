import { describe, expect, it } from 'vitest';
import { formatCurrency, formatNumber, formatPercent } from './formatCurrency';

// Phase 34: `formatCurrency` takes an integer minor-unit amount (paise),
// not a decimal major-unit one — every literal below is the intended
// display amount times 100 (e.g. `8500000` paise displays as "₹85,000").
describe('formatCurrency', () => {
  it('formats whole INR amounts without decimals by default', () => {
    expect(formatCurrency(8500000)).toBe('₹85,000');
  });

  it('formats fractional amounts with two decimal places', () => {
    expect(formatCurrency(10050)).toBe('₹100.50');
  });

  it('supports explicit sign display for transaction lists', () => {
    expect(formatCurrency(50000, { signDisplay: 'always' })).toBe('+₹500');
    expect(formatCurrency(-50000, { signDisplay: 'always' })).toBe('-₹500');
  });

  it('supports other currencies', () => {
    expect(formatCurrency(2000, { currency: 'USD', locale: 'en-US' })).toBe('$20');
  });

  it('returns an em dash for non-finite input instead of throwing', () => {
    expect(formatCurrency(Number.NaN)).toBe('—');
  });
});

describe('formatNumber', () => {
  it('adds locale-aware grouping', () => {
    expect(formatNumber(1234567)).toBe('12,34,567');
  });
});

describe('formatPercent', () => {
  it('converts a ratio to a percentage string', () => {
    expect(formatPercent(0.781)).toBe('78.1%');
  });

  it('respects custom fraction digits', () => {
    expect(formatPercent(0.5, 0)).toBe('50%');
  });
});
