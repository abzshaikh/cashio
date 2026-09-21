import { describe, expect, it } from 'vitest';
import { expenseFormSchema } from './expenseSchemas';

describe('expenseFormSchema', () => {
  const base = {
    amount: 250,
    date: new Date('2026-01-15'),
    accountId: 'acc-1',
    category: 'food',
    subcategory: 'restaurants',
    merchant: 'Restaurant XYZ',
    paymentMethod: 'debit_card',
    description: '',
    notes: '',
    tags: [],
  };

  it('accepts a valid expense entry', () => {
    expect(expenseFormSchema.safeParse(base).success).toBe(true);
  });

  it('requires a positive amount', () => {
    expect(expenseFormSchema.safeParse({ ...base, amount: 0 }).success).toBe(false);
    expect(expenseFormSchema.safeParse({ ...base, amount: -50 }).success).toBe(false);
  });

  it('coerces a numeric-string amount', () => {
    const result = expenseFormSchema.safeParse({ ...base, amount: '99.99' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(99.99);
    }
  });

  it('requires a real date', () => {
    expect(expenseFormSchema.safeParse({ ...base, date: null }).success).toBe(false);
    expect(expenseFormSchema.safeParse({ ...base, date: '2026-01-15' }).success).toBe(false);
  });

  it('requires an account to be selected', () => {
    expect(expenseFormSchema.safeParse({ ...base, accountId: '' }).success).toBe(false);
  });

  it('requires a category to be selected', () => {
    expect(expenseFormSchema.safeParse({ ...base, category: '' }).success).toBe(false);
  });

  it('accepts any non-blank category slug (Phase 6: a live, per-user list, not a fixed enum)', () => {
    expect(expenseFormSchema.safeParse({ ...base, category: 'pet_care' }).success).toBe(true);
  });

  it('rejects an unknown payment method', () => {
    expect(expenseFormSchema.safeParse({ ...base, paymentMethod: 'bitcoin' }).success).toBe(
      false,
    );
  });

  it('allows a blank subcategory for any category', () => {
    expect(expenseFormSchema.safeParse({ ...base, subcategory: '' }).success).toBe(true);
    expect(
      expenseFormSchema.safeParse({ ...base, category: 'other', subcategory: '' }).success,
    ).toBe(true);
  });

  it('does not cross-check subcategory against category here (Phase 6: enforced by the dialog\'s live cascading select, not this static schema)', () => {
    expect(
      expenseFormSchema.safeParse({ ...base, category: 'food', subcategory: 'rent' }).success,
    ).toBe(true);
  });

  it('allows merchant, description and notes to be blank', () => {
    expect(
      expenseFormSchema.safeParse({ ...base, merchant: '', description: '', notes: '' }).success,
    ).toBe(true);
  });

  it('accepts a list of tags', () => {
    expect(expenseFormSchema.safeParse({ ...base, tags: ['dining', 'weekend'] }).success).toBe(
      true,
    );
  });
});
