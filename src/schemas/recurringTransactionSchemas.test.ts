import { describe, expect, it } from 'vitest';
import { recurringTransactionFormSchema } from './recurringTransactionSchemas';

describe('recurringTransactionFormSchema', () => {
  const base = {
    type: 'expense' as const,
    amount: 500,
    frequency: 'monthly' as const,
    startDate: new Date('2026-03-01'),
    neverEnds: true,
    endDate: null,
    accountId: 'acc-1',
    category: 'housing',
    subcategory: '',
    merchant: 'Landlord',
    paymentMethod: 'net_banking' as const,
    isSubscription: false,
    source: '',
    description: 'Rent',
    notes: '',
  };

  it('accepts a valid never-ending expense rule', () => {
    expect(recurringTransactionFormSchema.safeParse(base).success).toBe(true);
  });

  it('accepts a valid income rule', () => {
    const income = { ...base, type: 'income' as const, category: 'salary', source: 'Acme Corp' };
    expect(recurringTransactionFormSchema.safeParse(income).success).toBe(true);
  });

  it('requires a positive amount', () => {
    expect(recurringTransactionFormSchema.safeParse({ ...base, amount: 0 }).success).toBe(false);
    expect(recurringTransactionFormSchema.safeParse({ ...base, amount: -10 }).success).toBe(false);
  });

  it('coerces a numeric-string amount', () => {
    const result = recurringTransactionFormSchema.safeParse({ ...base, amount: '250' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(250);
    }
  });

  it('requires a real start date', () => {
    expect(recurringTransactionFormSchema.safeParse({ ...base, startDate: null }).success).toBe(
      false,
    );
  });

  it('requires an account to be selected', () => {
    expect(recurringTransactionFormSchema.safeParse({ ...base, accountId: '' }).success).toBe(
      false,
    );
  });

  it('requires a category to be selected', () => {
    expect(recurringTransactionFormSchema.safeParse({ ...base, category: '' }).success).toBe(
      false,
    );
  });

  it('rejects an unknown frequency', () => {
    expect(
      recurringTransactionFormSchema.safeParse({ ...base, frequency: 'hourly' }).success,
    ).toBe(false);
  });

  it('requires an end date when "never ends" is off', () => {
    expect(
      recurringTransactionFormSchema.safeParse({ ...base, neverEnds: false, endDate: null })
        .success,
    ).toBe(false);
  });

  it('accepts an end date on or after the start date when "never ends" is off', () => {
    expect(
      recurringTransactionFormSchema.safeParse({
        ...base,
        neverEnds: false,
        endDate: new Date('2026-03-01'),
      }).success,
    ).toBe(true);
    expect(
      recurringTransactionFormSchema.safeParse({
        ...base,
        neverEnds: false,
        endDate: new Date('2026-12-01'),
      }).success,
    ).toBe(true);
  });

  it('rejects an end date before the start date when "never ends" is off', () => {
    expect(
      recurringTransactionFormSchema.safeParse({
        ...base,
        neverEnds: false,
        endDate: new Date('2026-01-01'),
      }).success,
    ).toBe(false);
  });

  it('accepts a subscription-flagged expense rule', () => {
    expect(
      recurringTransactionFormSchema.safeParse({ ...base, isSubscription: true }).success,
    ).toBe(true);
  });

  it('ignores an end date before the start date when "never ends" is on', () => {
    expect(
      recurringTransactionFormSchema.safeParse({
        ...base,
        neverEnds: true,
        endDate: new Date('2020-01-01'),
      }).success,
    ).toBe(true);
  });
});
