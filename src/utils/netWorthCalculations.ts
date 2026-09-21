import type { Account } from '../types/account';
import type { Debt } from '../types/debt';
import type { DebtPayment } from '../types/debtPayment';
import type { Asset } from '../types/asset';
import type { Liability } from '../types/liability';
import { getCreditCardDebt } from './creditCardCalculations';
import { getDebtProgress } from './debtCalculations';

/**
 * Phase 27's net worth math is deliberately almost entirely reuse: every
 * number here either reads a field that already exists (an `Account`'s
 * `currentBalance`, a manual `Asset`/`Liability`'s `value`) or calls a
 * calculation an earlier phase already wrote and tested
 * (`getCreditCardDebt` from Phase 18, `getDebtProgress` from Phase 17) —
 * the same "reuse existing generic calculations across features" principle
 * Phase 22/23/24/26 all followed. Nothing here re-derives a credit card's
 * sign convention or a debt's outstanding-balance math from scratch.
 *
 * Single-currency limitation: like every other phase since Phase 8, these
 * functions simply sum `currentBalance`/`value` fields regardless of an
 * account's own `currency` — there's no conversion rate available to mix
 * currencies meaningfully, the same accepted limitation
 * `accountFormatting.ts`'s `sumBalancesByCurrency` already documents.
 */

/** Active accounts' balances, summed as assets. Closed/inactive accounts
 * are excluded, same as `sumBalancesByCurrency`. A credit card only
 * contributes here while it's *in credit* (a positive balance — a real
 * receivable, e.g. after an overpayment or a refund posted to the card):
 * `getAccountLiabilitiesTotal` already correctly floors a credit card's
 * contribution at 0 whenever it's carrying debt, via `getCreditCardDebt`,
 * so excluding every credit card here regardless of sign used to make a
 * card in credit vanish from both sides of net worth — silently
 * understating both total assets and net worth (it stayed correctly
 * counted in `accountFormatting.ts`'s `sumBalancesByCurrency`, which
 * doesn't special-case credit cards at all, so the two pages disagreed). */
export function getAccountAssetsTotal(accounts: Account[]): number {
  return accounts
    .filter((account) => account.status === 'active')
    .reduce((sum, account) => {
      if (account.type === 'credit_card') {
        return account.currentBalance > 0 ? sum + account.currentBalance : sum;
      }
      return sum + account.currentBalance;
    }, 0);
}

/** Active credit-card accounts' owed balances, summed as liabilities —
 * reuses `getCreditCardDebt` rather than re-reading the negative-balance
 * sign convention directly. */
export function getAccountLiabilitiesTotal(accounts: Account[]): number {
  return accounts
    .filter((account) => account.status === 'active' && account.type === 'credit_card')
    .reduce((sum, account) => sum + getCreditCardDebt(account.currentBalance), 0);
}

/** Every tracked `Debt`'s outstanding balance, summed as liabilities —
 * reuses `getDebtProgress` rather than re-deriving payment totals. */
export function getDebtsLiabilitiesTotal(
  debts: Debt[],
  payments: DebtPayment[],
  asOf: Date = new Date(),
): number {
  return debts.reduce(
    (sum, debt) => sum + getDebtProgress(debt, payments, asOf).outstandingAmount,
    0,
  );
}

export function getManualAssetsTotal(assets: Asset[]): number {
  return assets.reduce((sum, asset) => sum + asset.value, 0);
}

export function getManualLiabilitiesTotal(liabilities: Liability[]): number {
  return liabilities.reduce((sum, liability) => sum + liability.value, 0);
}

export interface NetWorthSummary {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
}

/** Everything a Net Worth stat-card row needs in one call, mirroring the
 * "combine every X-progress number into one call" convention
 * `debtCalculations.ts`'s `getDebtProgress` and `goalCalculations.ts`'s
 * `getGoalProgress` already set. */
export function getNetWorthSummary(
  accounts: Account[],
  debts: Debt[],
  debtPayments: DebtPayment[],
  assets: Asset[],
  liabilities: Liability[],
  asOf: Date = new Date(),
): NetWorthSummary {
  const totalAssets = getAccountAssetsTotal(accounts) + getManualAssetsTotal(assets);
  const totalLiabilities =
    getAccountLiabilitiesTotal(accounts) +
    getDebtsLiabilitiesTotal(debts, debtPayments, asOf) +
    getManualLiabilitiesTotal(liabilities);
  return { totalAssets, totalLiabilities, netWorth: totalAssets - totalLiabilities };
}

export interface BreakdownEntry {
  label: string;
  amount: number;
}

/** One entry per positive-balance asset-side account plus one per manual
 * asset, highest first — flat rather than grouped by type, since a
 * handful of named entries (an account's name, an asset's label) is more
 * useful at a glance in a breakdown chart than a handful of type buckets. */
export function getAssetBreakdown(accounts: Account[], assets: Asset[]): BreakdownEntry[] {
  const entries: BreakdownEntry[] = [];
  for (const account of accounts) {
    // No separate credit-card exclusion needed: the balance check below
    // already keeps a debt-carrying (negative-balance) card off the asset
    // side, the same way `getAccountLiabilitiesTotal`'s doc comment
    // describes — see that function for why blanket-excluding every
    // credit card here regardless of sign was the bug.
    if (account.status !== 'active') continue;
    if (account.currentBalance <= 0) continue;
    entries.push({ label: account.name, amount: account.currentBalance });
  }
  for (const asset of assets) {
    if (asset.value <= 0) continue;
    entries.push({ label: asset.label, amount: asset.value });
  }
  return entries.sort((a, b) => b.amount - a.amount);
}

/** Same idea as `getAssetBreakdown` for the liability side: one entry per
 * credit card carrying debt, one per debt with an outstanding balance, and
 * one per manual liability. */
export function getLiabilityBreakdown(
  accounts: Account[],
  debts: Debt[],
  payments: DebtPayment[],
  liabilities: Liability[],
  asOf: Date = new Date(),
): BreakdownEntry[] {
  const entries: BreakdownEntry[] = [];
  for (const account of accounts) {
    if (account.status !== 'active' || account.type !== 'credit_card') continue;
    const debt = getCreditCardDebt(account.currentBalance);
    if (debt <= 0) continue;
    entries.push({ label: account.name, amount: debt });
  }
  for (const debt of debts) {
    const outstanding = getDebtProgress(debt, payments, asOf).outstandingAmount;
    if (outstanding <= 0) continue;
    entries.push({ label: debt.lender, amount: outstanding });
  }
  for (const liability of liabilities) {
    if (liability.value <= 0) continue;
    entries.push({ label: liability.label, amount: liability.value });
  }
  return entries.sort((a, b) => b.amount - a.amount);
}
