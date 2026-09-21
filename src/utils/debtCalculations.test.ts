import { describe, expect, it } from 'vitest';
import {
  getDaysUntilDue,
  getDebtPaymentsTotal,
  getDebtProgress,
  getDebtStatus,
  getNextPaymentDueDate,
  getOutstandingAmount,
} from './debtCalculations';
import type { Debt } from '../types/debt';
import type { DebtPayment } from '../types/debtPayment';

function makePayment(overrides: Partial<DebtPayment> = {}): DebtPayment {
  return {
    id: 'p1',
    userId: 'user-1',
    debtId: 'debt-1',
    amount: 100,
    date: '2026-01-01',
    note: '',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

function makeDebt(
  overrides: Partial<Debt> = {},
): Pick<Debt, 'id' | 'originalAmount' | 'paymentDueDay'> {
  return {
    id: 'debt-1',
    originalAmount: 1000,
    paymentDueDay: 15,
    ...overrides,
  };
}

describe('getDebtPaymentsTotal', () => {
  it('sums only payments belonging to the given debt', () => {
    const payments = [
      makePayment({ id: 'p1', debtId: 'debt-1', amount: 100 }),
      makePayment({ id: 'p2', debtId: 'debt-1', amount: 50 }),
      makePayment({ id: 'p3', debtId: 'debt-2', amount: 500 }),
    ];
    expect(getDebtPaymentsTotal('debt-1', payments)).toBe(150);
    expect(getDebtPaymentsTotal('debt-2', payments)).toBe(500);
  });

  it('returns 0 for a debt with no payments', () => {
    expect(getDebtPaymentsTotal('debt-1', [])).toBe(0);
  });
});

describe('getOutstandingAmount', () => {
  it('subtracts payments from the original amount', () => {
    expect(getOutstandingAmount(1000, 300)).toBe(700);
  });

  it('floors at 0 rather than going negative when overpaid', () => {
    expect(getOutstandingAmount(1000, 1500)).toBe(0);
  });
});

describe('getNextPaymentDueDate', () => {
  it("returns this month's occurrence when it has not passed yet", () => {
    const asOf = new Date(2026, 2, 10); // 10 March 2026
    const due = getNextPaymentDueDate(15, asOf);
    expect(due).toEqual(new Date(2026, 2, 15));
  });

  it("returns this month's occurrence when it is today", () => {
    const asOf = new Date(2026, 2, 15);
    const due = getNextPaymentDueDate(15, asOf);
    expect(due).toEqual(new Date(2026, 2, 15));
  });

  it('rolls forward to next month once this month\'s day has passed', () => {
    const asOf = new Date(2026, 2, 20); // 20 March 2026
    const due = getNextPaymentDueDate(15, asOf);
    expect(due).toEqual(new Date(2026, 3, 15));
  });

  it('clamps a day that overflows a shorter month instead of rolling over', () => {
    // February 2026 has 28 days; asking for day 31 should land on the 28th,
    // not spill into March.
    const asOf = new Date(2026, 1, 1); // 1 Feb 2026
    const due = getNextPaymentDueDate(31, asOf);
    expect(due).toEqual(new Date(2026, 1, 28));
  });

  it('rolls a December due date into January of the next year', () => {
    const asOf = new Date(2026, 11, 20); // 20 Dec 2026
    const due = getNextPaymentDueDate(15, asOf);
    expect(due).toEqual(new Date(2027, 0, 15));
  });
});

describe('getDaysUntilDue', () => {
  it('returns whole days ignoring time-of-day', () => {
    const asOf = new Date(2026, 5, 15, 23, 0);
    const due = new Date(2026, 5, 20, 1, 0);
    expect(getDaysUntilDue(due, asOf)).toBe(5);
  });

  it('returns 0 when the due date is today', () => {
    const asOf = new Date(2026, 5, 15);
    expect(getDaysUntilDue(new Date(2026, 5, 15), asOf)).toBe(0);
  });
});

describe('getDebtStatus', () => {
  it('is always safe once paid off', () => {
    expect(getDebtStatus(true, 0)).toBe('safe');
    expect(getDebtStatus(true, 10)).toBe('safe');
  });

  it('is nearLimit within 3 days of the due date', () => {
    expect(getDebtStatus(false, 0)).toBe('nearLimit');
    expect(getDebtStatus(false, 3)).toBe('nearLimit');
  });

  it('is warning between 4 and 7 days out', () => {
    expect(getDebtStatus(false, 4)).toBe('warning');
    expect(getDebtStatus(false, 7)).toBe('warning');
  });

  it('is safe beyond 7 days out', () => {
    expect(getDebtStatus(false, 8)).toBe('safe');
  });
});

describe('getDebtProgress', () => {
  it('combines outstanding amount, percent paid off, and status', () => {
    const asOf = new Date(2026, 2, 1);
    const debt = makeDebt({ originalAmount: 1000, paymentDueDay: 15 });
    const progress = getDebtProgress(debt, [makePayment({ amount: 400 })], asOf);
    expect(progress.paymentsTotal).toBe(400);
    expect(progress.outstandingAmount).toBe(600);
    expect(progress.percentPaidOff).toBeCloseTo(0.4, 5);
    expect(progress.isPaidOff).toBe(false);
  });

  it('marks a debt paid off once payments reach the original amount', () => {
    const debt = makeDebt({ originalAmount: 500 });
    const progress = getDebtProgress(debt, [makePayment({ amount: 500 })]);
    expect(progress.isPaidOff).toBe(true);
    expect(progress.outstandingAmount).toBe(0);
    expect(progress.status).toBe('safe');
  });

  it('treats a zero-original-amount debt as never paid off', () => {
    const debt = makeDebt({ originalAmount: 0 });
    const progress = getDebtProgress(debt, [makePayment({ amount: 50 })]);
    expect(progress.isPaidOff).toBe(false);
  });

  it('surfaces an escalated status when the next payment is due soon', () => {
    const asOf = new Date(2026, 2, 13); // 13 March, due date is the 15th
    const debt = makeDebt({ originalAmount: 1000, paymentDueDay: 15 });
    const progress = getDebtProgress(debt, [], asOf);
    expect(progress.daysUntilDue).toBe(2);
    expect(progress.status).toBe('nearLimit');
  });
});
