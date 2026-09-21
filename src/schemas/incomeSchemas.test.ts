import { describe, expect, it } from 'vitest';
import { incomeFormSchema } from './incomeSchemas';

describe('incomeFormSchema', () => {
  const base = {
    amount: 1000,
    date: new Date('2026-01-15'),
    accountId: 'acc-1',
    category: 'salary',
    source: 'Acme Corp',
    description: '',
    notes: '',
    isRecurring: false,
    tags: [],
  };

  it('accepts a valid income entry', () => {
    expect(incomeFormSchema.safeParse(base).success).toBe(true);
  });

  it('requires a positive amount', () => {
    expect(incomeFormSchema.safeParse({ ...base, amount: 0 }).success).toBe(false);
    expect(incomeFormSchema.safeParse({ ...base, amount: -100 }).success).toBe(false);
  });

  it('coerces a numeric-string amount', () => {
    const result = incomeFormSchema.safeParse({ ...base, amount: '250.5' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(250.5);
    }
  });

  it('requires a real date', () => {
    expect(incomeFormSchema.safeParse({ ...base, date: null }).success).toBe(false);
    expect(incomeFormSchema.safeParse({ ...base, date: '2026-01-15' }).success).toBe(false);
  });

  it('requires an account to be selected', () => {
    expect(incomeFormSchema.safeParse({ ...base, accountId: '' }).success).toBe(false);
  });

  it('rejects an unknown category', () => {
    expect(incomeFormSchema.safeParse({ ...base, category: 'crypto_airdrop' }).success).toBe(
      false,
    );
  });

  it('allows source, description and notes to be blank', () => {
    expect(
      incomeFormSchema.safeParse({ ...base, source: '', description: '', notes: '' }).success,
    ).toBe(true);
  });

  it('accepts isRecurring as a boolean', () => {
    expect(incomeFormSchema.safeParse({ ...base, isRecurring: true }).success).toBe(true);
  });
});
