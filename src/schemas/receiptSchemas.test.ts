import { describe, expect, it } from 'vitest';
import { receiptFormSchema } from './receiptSchemas';

describe('receiptFormSchema', () => {
  const base = {
    merchant: 'Corner Store',
    amount: 450,
    date: new Date('2026-03-01'),
    notes: '',
    transactionId: '',
  };

  it('accepts a valid receipt with no linked transaction', () => {
    expect(receiptFormSchema.safeParse(base).success).toBe(true);
  });

  it('accepts a valid receipt linked to a transaction', () => {
    expect(receiptFormSchema.safeParse({ ...base, transactionId: 'txn-1' }).success).toBe(true);
  });

  it('requires a merchant name', () => {
    expect(receiptFormSchema.safeParse({ ...base, merchant: '' }).success).toBe(false);
  });

  it('requires a positive amount', () => {
    expect(receiptFormSchema.safeParse({ ...base, amount: 0 }).success).toBe(false);
    expect(receiptFormSchema.safeParse({ ...base, amount: -50 }).success).toBe(false);
  });

  it('coerces a numeric-string amount', () => {
    const result = receiptFormSchema.safeParse({ ...base, amount: '299.99' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(299.99);
    }
  });

  it('requires a real date', () => {
    expect(receiptFormSchema.safeParse({ ...base, date: null }).success).toBe(false);
  });

  it('accepts an optional note within the length limit', () => {
    expect(receiptFormSchema.safeParse({ ...base, notes: 'Business lunch' }).success).toBe(true);
  });

  it('rejects a note over the length limit', () => {
    expect(receiptFormSchema.safeParse({ ...base, notes: 'x'.repeat(501) }).success).toBe(false);
  });
});
