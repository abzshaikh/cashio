import { describe, expect, it } from 'vitest';
import {
  getAccountAssetsTotal,
  getAccountLiabilitiesTotal,
  getDebtsLiabilitiesTotal,
  getManualAssetsTotal,
  getManualLiabilitiesTotal,
  getNetWorthSummary,
  getAssetBreakdown,
  getLiabilityBreakdown,
} from './netWorthCalculations';
import type { Account } from '../types/account';
import type { Debt } from '../types/debt';
import type { DebtPayment } from '../types/debtPayment';
import type { Asset } from '../types/asset';
import type { Liability } from '../types/liability';

function makeAccount(overrides: Partial<Account>): Account {
  return {
    id: 'a1',
    userId: 'user-1',
    name: 'Checking',
    type: 'bank',
    institution: '',
    accountNumber: '',
    openingBalance: 0,
    currentBalance: 1000,
    currency: 'INR',
    status: 'active',
    notes: '',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

const debt: Debt = {
  id: 'd1',
  userId: 'user-1',
  lender: 'Credit Union',
  category: 'personal_loan',
  originalAmount: 5000,
  interestRate: 8,
  minimumPayment: 200,
  paymentDueDay: 15,
  startDate: '2026-01-01',
  endDate: null,
  notes: '',
  createdAt: '',
  updatedAt: '',
};

const payment: DebtPayment = {
  id: 'p1',
  userId: 'user-1',
  debtId: 'd1',
  amount: 2000,
  date: '2026-02-01',
  note: '',
  createdAt: '',
  updatedAt: '',
};

const asset: Asset = {
  id: 'as1',
  userId: 'user-1',
  type: 'property',
  label: 'House',
  value: 500000,
  asOf: '2026-01-01',
  createdAt: '',
  updatedAt: '',
};

const liability: Liability = {
  id: 'l1',
  userId: 'user-1',
  type: 'tax',
  label: 'Back taxes',
  value: 3000,
  asOf: '2026-01-01',
  createdAt: '',
  updatedAt: '',
};

describe('getAccountAssetsTotal', () => {
  it('sums active accounts, excluding a debt-carrying credit card', () => {
    const accounts = [
      makeAccount({ id: 'a1', currentBalance: 1000, status: 'active', type: 'bank' }),
      makeAccount({ id: 'a2', currentBalance: 500, status: 'inactive', type: 'bank' }),
      makeAccount({ id: 'a3', currentBalance: -200, status: 'active', type: 'credit_card' }),
    ];
    expect(getAccountAssetsTotal(accounts)).toBe(1000);
  });

  it('counts a credit card in credit (positive balance) as an asset', () => {
    const accounts = [
      makeAccount({ id: 'a1', currentBalance: 1000, status: 'active', type: 'bank' }),
      makeAccount({ id: 'a2', currentBalance: 200, status: 'active', type: 'credit_card' }),
    ];
    expect(getAccountAssetsTotal(accounts)).toBe(1200);
  });
});

describe('getAccountLiabilitiesTotal', () => {
  it('sums active credit-card debt via getCreditCardDebt', () => {
    const accounts = [
      makeAccount({ id: 'a1', currentBalance: -400, status: 'active', type: 'credit_card' }),
      makeAccount({ id: 'a2', currentBalance: -100, status: 'closed', type: 'credit_card' }),
      makeAccount({ id: 'a3', currentBalance: 1000, status: 'active', type: 'bank' }),
    ];
    expect(getAccountLiabilitiesTotal(accounts)).toBe(400);
  });

  it('treats a credit card in credit (positive balance) as zero debt', () => {
    const accounts = [makeAccount({ currentBalance: 200, status: 'active', type: 'credit_card' })];
    expect(getAccountLiabilitiesTotal(accounts)).toBe(0);
  });
});

describe('getDebtsLiabilitiesTotal', () => {
  it('sums outstanding balances via getDebtProgress', () => {
    expect(getDebtsLiabilitiesTotal([debt], [payment])).toBe(3000);
  });

  it('returns 0 for no debts', () => {
    expect(getDebtsLiabilitiesTotal([], [])).toBe(0);
  });
});

describe('getManualAssetsTotal / getManualLiabilitiesTotal', () => {
  it('sums manual asset values', () => {
    expect(getManualAssetsTotal([asset])).toBe(500000);
  });

  it('sums manual liability values', () => {
    expect(getManualLiabilitiesTotal([liability])).toBe(3000);
  });
});

describe('getNetWorthSummary', () => {
  it('combines account, debt, and manual totals into one summary', () => {
    const accounts = [
      makeAccount({ id: 'a1', currentBalance: 1000, status: 'active', type: 'bank' }),
      makeAccount({ id: 'a2', currentBalance: -400, status: 'active', type: 'credit_card' }),
    ];
    const summary = getNetWorthSummary(accounts, [debt], [payment], [asset], [liability]);
    // assets: 1000 (bank) + 500000 (manual) = 501000
    // liabilities: 400 (card) + 3000 (debt) + 3000 (manual) = 6400
    expect(summary).toEqual({
      totalAssets: 501000,
      totalLiabilities: 6400,
      netWorth: 501000 - 6400,
    });
  });

  it('returns a net worth of 0 with nothing tracked', () => {
    expect(getNetWorthSummary([], [], [], [], [])).toEqual({
      totalAssets: 0,
      totalLiabilities: 0,
      netWorth: 0,
    });
  });
});

describe('getAssetBreakdown', () => {
  it('lists positive-balance accounts and manual assets, highest first', () => {
    const accounts = [
      makeAccount({ id: 'a1', name: 'Checking', currentBalance: 1000, status: 'active', type: 'bank' }),
      makeAccount({ id: 'a2', name: 'Old card', currentBalance: -50, status: 'active', type: 'credit_card' }),
      makeAccount({ id: 'a3', name: 'Empty', currentBalance: 0, status: 'active', type: 'bank' }),
    ];
    expect(getAssetBreakdown(accounts, [asset])).toEqual([
      { label: 'House', amount: 500000 },
      { label: 'Checking', amount: 1000 },
    ]);
  });

  it('includes a credit card in credit (positive balance) as an asset entry', () => {
    const accounts = [
      makeAccount({ id: 'a1', name: 'Checking', currentBalance: 1000, status: 'active', type: 'bank' }),
      makeAccount({ id: 'a2', name: 'Overpaid card', currentBalance: 200, status: 'active', type: 'credit_card' }),
    ];
    expect(getAssetBreakdown(accounts, [])).toEqual([
      { label: 'Checking', amount: 1000 },
      { label: 'Overpaid card', amount: 200 },
    ]);
  });
});

describe('getLiabilityBreakdown', () => {
  it('lists credit-card debt, outstanding debts, and manual liabilities, highest first', () => {
    const accounts = [
      makeAccount({ id: 'a1', name: 'Card', currentBalance: -400, status: 'active', type: 'credit_card' }),
    ];
    expect(getLiabilityBreakdown(accounts, [debt], [payment], [liability])).toEqual([
      { label: 'Credit Union', amount: 3000 },
      { label: 'Back taxes', amount: 3000 },
      { label: 'Card', amount: 400 },
    ]);
  });
});
