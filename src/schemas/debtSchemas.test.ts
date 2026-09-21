import { describe, expect, it } from 'vitest';
import { debtFormSchema } from './debtSchemas';

describe('debtFormSchema', () => {
  const base = {
    lender: 'Acme Bank',
    category: 'personal_loan' as const,
    originalAmount: 50000,
    interestRate: 12.5,
    minimumPayment: 2000,
    paymentDueDay: 15,
    startDate: new Date('2026-01-01'),
    hasEndDate: false,
    endDate: null,
    notes: '',
  };

  it('accepts a valid debt with no target payoff date', () => {
    expect(debtFormSchema.safeParse(base).success).toBe(true);
  });

  it('accepts a valid debt with a target payoff date', () => {
    const withDate = { ...base, hasEndDate: true, endDate: new Date('2028-01-01') };
    expect(debtFormSchema.safeParse(withDate).success).toBe(true);
  });

  it('requires a lender name', () => {
    expect(debtFormSchema.safeParse({ ...base, lender: '' }).success).toBe(false);
  });

  it('requires a positive original amount', () => {
    expect(debtFormSchema.safeParse({ ...base, originalAmount: 0 }).success).toBe(false);
    expect(debtFormSchema.safeParse({ ...base, originalAmount: -100 }).success).toBe(false);
  });

  it('coerces a numeric-string original amount', () => {
    const result = debtFormSchema.safeParse({ ...base, originalAmount: '25000' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.originalAmount).toBe(25000);
    }
  });

  it('rejects a negative interest rate', () => {
    expect(debtFormSchema.safeParse({ ...base, interestRate: -1 }).success).toBe(false);
  });

  it('rejects an unrealistic interest rate over 100%', () => {
    expect(debtFormSchema.safeParse({ ...base, interestRate: 150 }).success).toBe(false);
  });

  it('accepts a zero minimum payment', () => {
    expect(debtFormSchema.safeParse({ ...base, minimumPayment: 0 }).success).toBe(true);
  });

  it('rejects a negative minimum payment', () => {
    expect(debtFormSchema.safeParse({ ...base, minimumPayment: -50 }).success).toBe(false);
  });

  it('requires the payment due day to be between 1 and 31', () => {
    expect(debtFormSchema.safeParse({ ...base, paymentDueDay: 0 }).success).toBe(false);
    expect(debtFormSchema.safeParse({ ...base, paymentDueDay: 32 }).success).toBe(false);
    expect(debtFormSchema.safeParse({ ...base, paymentDueDay: 1 }).success).toBe(true);
    expect(debtFormSchema.safeParse({ ...base, paymentDueDay: 31 }).success).toBe(true);
  });

  it('rejects a non-whole payment due day', () => {
    expect(debtFormSchema.safeParse({ ...base, paymentDueDay: 15.5 }).success).toBe(false);
  });

  it('rejects an unknown category', () => {
    expect(debtFormSchema.safeParse({ ...base, category: 'crypto_loan' }).success).toBe(false);
  });

  it('requires a target payoff date when "Set a target payoff date" is on', () => {
    expect(
      debtFormSchema.safeParse({ ...base, hasEndDate: true, endDate: null }).success,
    ).toBe(false);
  });

  it('ignores a missing target payoff date when the toggle is off', () => {
    expect(debtFormSchema.safeParse({ ...base, hasEndDate: false, endDate: null }).success).toBe(
      true,
    );
  });

  it('rejects a target payoff date before the start date', () => {
    expect(
      debtFormSchema.safeParse({
        ...base,
        hasEndDate: true,
        endDate: new Date('2025-01-01'),
      }).success,
    ).toBe(false);
  });

  it('accepts a target payoff date on the start date', () => {
    expect(
      debtFormSchema.safeParse({
        ...base,
        hasEndDate: true,
        endDate: new Date('2026-01-01'),
      }).success,
    ).toBe(true);
  });
});
