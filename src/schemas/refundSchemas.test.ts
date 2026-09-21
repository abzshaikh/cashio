import { describe, expect, it } from 'vitest';
import { refundFormSchema } from './refundSchemas';

describe('refundFormSchema', () => {
  const base = {
    amount: 150,
    date: new Date('2026-01-15'),
    accountId: 'acc-1',
    category: 'food',
    subcategory: 'restaurants',
    merchant: 'Restaurant XYZ',
    description: '',
    notes: '',
    tags: [],
  };

  it('accepts a valid refund entry', () => {
    expect(refundFormSchema.safeParse(base).success).toBe(true);
  });

  it('requires a positive amount', () => {
    expect(refundFormSchema.safeParse({ ...base, amount: 0 }).success).toBe(false);
    expect(refundFormSchema.safeParse({ ...base, amount: -50 }).success).toBe(false);
  });

  it('coerces a numeric-string amount', () => {
    const result = refundFormSchema.safeParse({ ...base, amount: '49.99' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(49.99);
    }
  });

  it('requires a real date', () => {
    expect(refundFormSchema.safeParse({ ...base, date: null }).success).toBe(false);
    expect(refundFormSchema.safeParse({ ...base, date: '2026-01-15' }).success).toBe(false);
  });

  it('requires an account to be selected', () => {
    expect(refundFormSchema.safeParse({ ...base, accountId: '' }).success).toBe(false);
  });

  it('requires a category to be selected', () => {
    expect(refundFormSchema.safeParse({ ...base, category: '' }).success).toBe(false);
  });

  it('accepts any non-blank category slug, same as expense (reuses the expense category system)', () => {
    expect(refundFormSchema.safeParse({ ...base, category: 'pet_care' }).success).toBe(true);
  });

  it('allows a blank subcategory for any category', () => {
    expect(refundFormSchema.safeParse({ ...base, subcategory: '' }).success).toBe(true);
  });

  it('has no payment method field, unlike expense', () => {
    expect('paymentMethod' in refundFormSchema.shape).toBe(false);
  });

  it('allows merchant, description and notes to be blank', () => {
    expect(
      refundFormSchema.safeParse({ ...base, merchant: '', description: '', notes: '' }).success,
    ).toBe(true);
  });

  it('accepts a list of tags', () => {
    expect(refundFormSchema.safeParse({ ...base, tags: ['returned', 'amazon'] }).success).toBe(
      true,
    );
  });
});
