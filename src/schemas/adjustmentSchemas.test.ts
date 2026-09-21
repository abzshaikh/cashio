import { describe, expect, it } from 'vitest';
import { adjustmentFormSchema } from './adjustmentSchemas';

describe('adjustmentFormSchema', () => {
  const base = {
    amount: 100,
    date: new Date('2026-01-15'),
    accountId: 'acc-1',
    direction: 'increase',
    reason: 'Reconciled cash count',
    description: '',
    notes: '',
    tags: [],
  };

  it('accepts a valid adjustment entry', () => {
    expect(adjustmentFormSchema.safeParse(base).success).toBe(true);
  });

  it('requires a positive amount', () => {
    expect(adjustmentFormSchema.safeParse({ ...base, amount: 0 }).success).toBe(false);
    expect(adjustmentFormSchema.safeParse({ ...base, amount: -50 }).success).toBe(false);
  });

  it('coerces a numeric-string amount', () => {
    const result = adjustmentFormSchema.safeParse({ ...base, amount: '75.5' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(75.5);
    }
  });

  it('requires a real date', () => {
    expect(adjustmentFormSchema.safeParse({ ...base, date: null }).success).toBe(false);
    expect(adjustmentFormSchema.safeParse({ ...base, date: '2026-01-15' }).success).toBe(false);
  });

  it('requires an account to be selected', () => {
    expect(adjustmentFormSchema.safeParse({ ...base, accountId: '' }).success).toBe(false);
  });

  it('accepts either direction', () => {
    expect(adjustmentFormSchema.safeParse({ ...base, direction: 'increase' }).success).toBe(true);
    expect(adjustmentFormSchema.safeParse({ ...base, direction: 'decrease' }).success).toBe(true);
  });

  it('rejects an unknown direction', () => {
    expect(adjustmentFormSchema.safeParse({ ...base, direction: 'sideways' }).success).toBe(
      false,
    );
  });

  it('requires a non-blank reason', () => {
    expect(adjustmentFormSchema.safeParse({ ...base, reason: '' }).success).toBe(false);
  });

  it('allows description, notes and tags to be blank/empty', () => {
    expect(
      adjustmentFormSchema.safeParse({ ...base, description: '', notes: '', tags: [] }).success,
    ).toBe(true);
  });
});
