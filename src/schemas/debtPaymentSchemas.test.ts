import { describe, expect, it } from 'vitest';
import { debtPaymentFormSchema } from './debtPaymentSchemas';

describe('debtPaymentFormSchema', () => {
  const base = {
    amount: 2000,
    date: new Date('2026-03-01'),
    note: '',
  };

  it('accepts a valid payment', () => {
    expect(debtPaymentFormSchema.safeParse(base).success).toBe(true);
  });

  it('requires a positive amount', () => {
    expect(debtPaymentFormSchema.safeParse({ ...base, amount: 0 }).success).toBe(false);
    expect(debtPaymentFormSchema.safeParse({ ...base, amount: -100 }).success).toBe(false);
  });

  it('coerces a numeric-string amount', () => {
    const result = debtPaymentFormSchema.safeParse({ ...base, amount: '500' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(500);
    }
  });

  it('requires a real date', () => {
    expect(debtPaymentFormSchema.safeParse({ ...base, date: null }).success).toBe(false);
  });

  it('accepts an optional note within the length limit', () => {
    expect(
      debtPaymentFormSchema.safeParse({ ...base, note: 'Extra principal payment' }).success,
    ).toBe(true);
  });

  it('rejects a note over the length limit', () => {
    expect(debtPaymentFormSchema.safeParse({ ...base, note: 'x'.repeat(201) }).success).toBe(
      false,
    );
  });
});
