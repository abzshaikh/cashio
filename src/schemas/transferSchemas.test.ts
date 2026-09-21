import { describe, expect, it } from 'vitest';
import { transferFormSchema } from './transferSchemas';

describe('transferFormSchema', () => {
  const base = {
    amount: 500,
    date: new Date('2026-01-15'),
    fromAccountId: 'acc-1',
    toAccountId: 'acc-2',
    description: '',
    notes: '',
    tags: [],
  };

  it('accepts a valid transfer entry', () => {
    expect(transferFormSchema.safeParse(base).success).toBe(true);
  });

  it('requires a positive amount', () => {
    expect(transferFormSchema.safeParse({ ...base, amount: 0 }).success).toBe(false);
    expect(transferFormSchema.safeParse({ ...base, amount: -50 }).success).toBe(false);
  });

  it('coerces a numeric-string amount', () => {
    const result = transferFormSchema.safeParse({ ...base, amount: '250.5' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(250.5);
    }
  });

  it('requires a real date', () => {
    expect(transferFormSchema.safeParse({ ...base, date: null }).success).toBe(false);
    expect(transferFormSchema.safeParse({ ...base, date: '2026-01-15' }).success).toBe(false);
  });

  it('requires a source account to be selected', () => {
    expect(transferFormSchema.safeParse({ ...base, fromAccountId: '' }).success).toBe(false);
  });

  it('requires a destination account to be selected', () => {
    expect(transferFormSchema.safeParse({ ...base, toAccountId: '' }).success).toBe(false);
  });

  it('rejects the same account on both sides', () => {
    expect(
      transferFormSchema.safeParse({ ...base, fromAccountId: 'acc-1', toAccountId: 'acc-1' })
        .success,
    ).toBe(false);
  });

  it('allows description and notes to be blank', () => {
    expect(transferFormSchema.safeParse({ ...base, description: '', notes: '' }).success).toBe(
      true,
    );
  });

  it('accepts a list of tags', () => {
    expect(transferFormSchema.safeParse({ ...base, tags: ['savings-move'] }).success).toBe(true);
  });
});
