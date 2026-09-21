import { describe, expect, it } from 'vitest';
import { accountFormSchema } from './accountSchemas';

describe('accountFormSchema', () => {
  const base = {
    name: 'Main Checking',
    type: 'bank',
    institution: 'Test Bank',
    accountNumber: '1234567890',
    openingBalance: 1000,
    currency: 'INR',
    status: 'active',
    notes: '',
    creditLimit: 0,
    statementDay: 1,
    paymentDueDay: 1,
  };

  it('accepts a valid account', () => {
    expect(accountFormSchema.safeParse(base).success).toBe(true);
  });

  it('requires a non-empty name', () => {
    expect(accountFormSchema.safeParse({ ...base, name: '' }).success).toBe(false);
  });

  it('rejects an unknown account type', () => {
    expect(accountFormSchema.safeParse({ ...base, type: 'crypto' }).success).toBe(false);
  });

  it('rejects an unknown status', () => {
    expect(accountFormSchema.safeParse({ ...base, status: 'archived' }).success).toBe(false);
  });

  it('requires a currency', () => {
    expect(accountFormSchema.safeParse({ ...base, currency: '' }).success).toBe(false);
  });

  it('coerces a numeric-string opening balance', () => {
    const result = accountFormSchema.safeParse({ ...base, openingBalance: '250.5' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.openingBalance).toBe(250.5);
    }
  });

  it('rejects a non-numeric opening balance', () => {
    expect(accountFormSchema.safeParse({ ...base, openingBalance: 'not-a-number' }).success).toBe(
      false,
    );
  });

  it('allows a negative opening balance (e.g. a credit card already carrying a balance)', () => {
    expect(accountFormSchema.safeParse({ ...base, openingBalance: -500 }).success).toBe(true);
  });

  it('allows institution, account number and notes to be blank', () => {
    expect(
      accountFormSchema.safeParse({
        ...base,
        institution: '',
        accountNumber: '',
        notes: '',
      }).success,
    ).toBe(true);
  });

  it('does not require a credit limit for a non-credit-card account', () => {
    expect(accountFormSchema.safeParse({ ...base, type: 'bank', creditLimit: 0 }).success).toBe(
      true,
    );
  });

  it('requires a positive credit limit for a credit_card account', () => {
    expect(
      accountFormSchema.safeParse({ ...base, type: 'credit_card', creditLimit: 0 }).success,
    ).toBe(false);
    expect(
      accountFormSchema.safeParse({ ...base, type: 'credit_card', creditLimit: 50000 }).success,
    ).toBe(true);
  });

  it('requires statementDay and paymentDueDay to be between 1 and 31', () => {
    expect(accountFormSchema.safeParse({ ...base, statementDay: 0 }).success).toBe(false);
    expect(accountFormSchema.safeParse({ ...base, statementDay: 32 }).success).toBe(false);
    expect(accountFormSchema.safeParse({ ...base, paymentDueDay: 0 }).success).toBe(false);
    expect(accountFormSchema.safeParse({ ...base, paymentDueDay: 32 }).success).toBe(false);
  });

  it('rejects a non-whole statementDay or paymentDueDay', () => {
    expect(accountFormSchema.safeParse({ ...base, statementDay: 15.5 }).success).toBe(false);
    expect(accountFormSchema.safeParse({ ...base, paymentDueDay: 15.5 }).success).toBe(false);
  });
});
