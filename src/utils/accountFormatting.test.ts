import { describe, expect, it } from 'vitest';
import { maskAccountNumber, sumBalancesByCurrency } from './accountFormatting';
import type { Account } from '../types/account';

function makeAccount(overrides: Partial<Account>): Account {
  return {
    id: 'a1',
    userId: 'user-1',
    name: 'Account',
    type: 'bank',
    institution: '',
    accountNumber: '',
    openingBalance: 0,
    currentBalance: 0,
    currency: 'INR',
    status: 'active',
    notes: '',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('maskAccountNumber', () => {
  it('masks a long numeric identifier down to its last 4 digits', () => {
    expect(maskAccountNumber('1234567890')).toBe('•••• 7890');
  });

  it('strips whitespace before checking length', () => {
    expect(maskAccountNumber('1234 5678 90')).toBe('•••• 7890');
  });

  it('leaves a short numeric value as-is', () => {
    expect(maskAccountNumber('1234')).toBe('1234');
  });

  it('leaves a non-numeric identifier (e.g. a wallet name) as-is', () => {
    expect(maskAccountNumber('PayPal Wallet')).toBe('PayPal Wallet');
  });
});

describe('sumBalancesByCurrency', () => {
  it('sums balances grouped by currency', () => {
    const accounts = [
      makeAccount({ currency: 'INR', currentBalance: 1000 }),
      makeAccount({ currency: 'INR', currentBalance: 500 }),
      makeAccount({ currency: 'USD', currentBalance: 200 }),
    ];
    expect(sumBalancesByCurrency(accounts)).toEqual({ INR: 1500, USD: 200 });
  });

  it('excludes inactive and closed accounts', () => {
    const accounts = [
      makeAccount({ currency: 'INR', currentBalance: 1000, status: 'active' }),
      makeAccount({ currency: 'INR', currentBalance: 9999, status: 'inactive' }),
      makeAccount({ currency: 'INR', currentBalance: 9999, status: 'closed' }),
    ];
    expect(sumBalancesByCurrency(accounts)).toEqual({ INR: 1000 });
  });

  it('returns an empty object for no accounts', () => {
    expect(sumBalancesByCurrency([])).toEqual({});
  });
});
