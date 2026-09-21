import { describe, expect, it } from 'vitest';
import { toMajorUnits, toMinorUnits } from './money';

describe('toMinorUnits', () => {
  it('converts a whole-rupee amount', () => {
    expect(toMinorUnits(1250)).toBe(125000);
  });

  it('converts a two-decimal amount', () => {
    expect(toMinorUnits(1250.5)).toBe(125050);
    expect(toMinorUnits(19.99)).toBe(1999);
  });

  it('rounds a float-multiplication artifact to the nearest minor unit', () => {
    // 19.1 * 100 === 1909.9999999999998 in IEEE754 — must round to 1910, not 1909.
    expect(toMinorUnits(19.1)).toBe(1910);
  });

  it('rounds a third decimal place to the nearest minor unit', () => {
    expect(toMinorUnits(19.999)).toBe(2000);
    expect(toMinorUnits(19.994)).toBe(1999);
  });

  it('rounds a value that sits exactly on a .5-minor-unit boundary despite IEEE754 representation error', () => {
    // 1.005 * 100 === 100.49999999999999 in IEEE754 — the true value is
    // 100.5, which must round up to 101, not down to 100.
    expect(toMinorUnits(1.005)).toBe(101);
    expect(toMinorUnits(-1.005)).toBe(-101);
    expect(toMinorUnits(2.675)).toBe(268);
  });

  it('returns 0 for zero', () => {
    expect(toMinorUnits(0)).toBe(0);
  });

  it('preserves sign for a negative amount', () => {
    expect(toMinorUnits(-500)).toBe(-50000);
  });

  it('returns 0 for non-finite input instead of throwing or producing NaN', () => {
    expect(toMinorUnits(Number.NaN)).toBe(0);
    expect(toMinorUnits(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('toMajorUnits', () => {
  it('converts minor units back to a decimal major-unit amount', () => {
    expect(toMajorUnits(125050)).toBe(1250.5);
    expect(toMajorUnits(125000)).toBe(1250);
  });

  it('returns 0 for zero', () => {
    expect(toMajorUnits(0)).toBe(0);
  });

  it('preserves sign for a negative amount', () => {
    expect(toMajorUnits(-50000)).toBe(-500);
  });

  it('returns 0 for non-finite input instead of throwing or producing NaN', () => {
    expect(toMajorUnits(Number.NaN)).toBe(0);
  });
});

describe('round-trip', () => {
  it('recovers the original minor-unit integer for any amount that came from toMinorUnits', () => {
    for (const major of [0, 1, 19.99, 1250.5, 99999.99, 0.01, 1000000]) {
      expect(toMinorUnits(toMajorUnits(toMinorUnits(major)))).toBe(toMinorUnits(major));
    }
  });
});
