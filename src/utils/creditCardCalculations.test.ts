import { describe, expect, it } from 'vitest';
import {
  getAvailableCredit,
  getCreditCardDebt,
  getCreditCardProgress,
  getCreditCardStatus,
  getUtilization,
} from './creditCardCalculations';

describe('getCreditCardDebt', () => {
  it('reports a negative balance as positive debt', () => {
    expect(getCreditCardDebt(-500)).toBe(500);
  });

  it('reports no debt when the balance is zero or positive', () => {
    expect(getCreditCardDebt(0)).toBe(0);
    expect(getCreditCardDebt(200)).toBe(0);
  });
});

describe('getAvailableCredit', () => {
  it('subtracts debt from the credit limit', () => {
    expect(getAvailableCredit(10000, 4000)).toBe(6000);
  });

  it('goes negative rather than flooring at 0 when over the limit', () => {
    expect(getAvailableCredit(10000, 12000)).toBe(-2000);
  });
});

describe('getUtilization', () => {
  it('divides debt by the credit limit', () => {
    expect(getUtilization(10000, 4000)).toBeCloseTo(0.4, 5);
  });

  it('treats a zero credit limit as 0% utilized when there is no debt', () => {
    expect(getUtilization(0, 0)).toBe(0);
  });

  it('treats a zero credit limit with debt as fully utilized', () => {
    expect(getUtilization(0, 500)).toBe(1);
  });

  it('can exceed 1 when over the limit', () => {
    expect(getUtilization(10000, 12000)).toBeCloseTo(1.2, 5);
  });
});

describe('getCreditCardStatus', () => {
  it('is safe under 50% utilized', () => {
    expect(getCreditCardStatus(0)).toBe('safe');
    expect(getCreditCardStatus(0.49)).toBe('safe');
  });

  it('is warning between 50% and 80% utilized', () => {
    expect(getCreditCardStatus(0.5)).toBe('warning');
    expect(getCreditCardStatus(0.79)).toBe('warning');
  });

  it('is nearLimit between 80% and 100% utilized', () => {
    expect(getCreditCardStatus(0.8)).toBe('nearLimit');
    expect(getCreditCardStatus(0.99)).toBe('nearLimit');
  });

  it('is over at or beyond 100% utilized', () => {
    expect(getCreditCardStatus(1)).toBe('over');
    expect(getCreditCardStatus(1.5)).toBe('over');
  });
});

describe('getCreditCardProgress', () => {
  it('combines debt, available credit, utilization, and status', () => {
    const progress = getCreditCardProgress({
      currentBalance: -6000,
      creditLimit: 10000,
      statementDay: null,
      paymentDueDay: null,
    });
    expect(progress.debt).toBe(6000);
    expect(progress.availableCredit).toBe(4000);
    expect(progress.utilization).toBeCloseTo(0.6, 5);
    expect(progress.status).toBe('warning');
    expect(progress.nextStatementDate).toBeNull();
    expect(progress.nextPaymentDueDate).toBeNull();
    expect(progress.daysUntilPaymentDue).toBeNull();
  });

  it('computes the next statement and payment due dates when set', () => {
    const asOf = new Date(2026, 2, 10); // 10 March 2026
    const progress = getCreditCardProgress(
      { currentBalance: -1000, creditLimit: 10000, statementDay: 20, paymentDueDay: 5 },
      asOf,
    );
    expect(progress.nextStatementDate).toBe(new Date(2026, 2, 20).toISOString());
    // Payment due day 5 has already passed this month, so it rolls to April.
    expect(progress.nextPaymentDueDate).toBe(new Date(2026, 3, 5).toISOString());
    expect(progress.daysUntilPaymentDue).toBe(26);
  });

  it('treats a card with no debt and no credit limit set as safe', () => {
    const progress = getCreditCardProgress({
      currentBalance: 0,
      creditLimit: null,
      statementDay: null,
      paymentDueDay: null,
    });
    expect(progress.debt).toBe(0);
    expect(progress.utilization).toBe(0);
    expect(progress.status).toBe('safe');
  });
});
