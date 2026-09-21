import type { Account } from '../types/account';

/**
 * Masks a long numeric account identifier down to its last 4 digits
 * (e.g. "1234567890" -> "•••• 7890"). Short or non-numeric values (a
 * wallet's display name, say) are shown as-is since masking would just be
 * confusing there.
 */
export function maskAccountNumber(value: string): string {
  const digitsOnly = value.replace(/\s+/g, '');
  if (digitsOnly.length > 4 && /^\d+$/.test(digitsOnly)) {
    return `•••• ${digitsOnly.slice(-4)}`;
  }
  return value;
}

/**
 * Sums account balances grouped by currency — balances in different
 * currencies can't be added together without a conversion rate. Phase 27
 * (Net Worth) arrived at the same limitation rather than solving it: with
 * no exchange-rate data source, `utils/netWorthCalculations.ts` simply
 * sums `currentBalance`/`value` fields across accounts and manual entries
 * regardless of currency, same as this function already does. Only
 * `active` accounts count toward totals; closed/inactive accounts are
 * excluded.
 */
export function sumBalancesByCurrency(accounts: Account[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const account of accounts) {
    if (account.status !== 'active') continue;
    totals[account.currency] = (totals[account.currency] ?? 0) + account.currentBalance;
  }
  return totals;
}
