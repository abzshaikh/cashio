import { describe, expect, it } from 'vitest';
import { getBalanceEffect } from './transactionBalance';

describe('getBalanceEffect', () => {
  it('income increases the balance by the full amount (Rule 1)', () => {
    expect(getBalanceEffect('income', 500)).toBe(500);
  });

  it('expense decreases the balance by the full amount (Rule 2)', () => {
    expect(getBalanceEffect('expense', 500)).toBe(-500);
  });

  it('returns 0 for an amount of 0, for either type', () => {
    expect(getBalanceEffect('income', 0)).toBe(0);
    expect(getBalanceEffect('expense', 0)).toBe(0);
  });

  it('refund increases the balance by the full amount, same as income (Rule 8)', () => {
    expect(getBalanceEffect('refund', 500)).toBe(500);
  });

  it('returns 0 for a refund of amount 0', () => {
    expect(getBalanceEffect('refund', 0)).toBe(0);
  });

  it('adjustment increases the balance when its direction is "increase"', () => {
    expect(getBalanceEffect('adjustment', 200, 'increase')).toBe(200);
  });

  it('adjustment decreases the balance when its direction is "decrease"', () => {
    expect(getBalanceEffect('adjustment', 200, 'decrease')).toBe(-200);
  });

  it('returns 0 for an adjustment of amount 0, for either direction', () => {
    expect(getBalanceEffect('adjustment', 0, 'increase')).toBe(0);
    expect(getBalanceEffect('adjustment', 0, 'decrease')).toBe(0);
  });

  it('returns 0 for a transfer — it never affects a single account through this function (Rule 3/4)', () => {
    expect(getBalanceEffect('transfer', 500)).toBe(0);
  });
});
