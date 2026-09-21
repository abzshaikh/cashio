export const ACCOUNT_TYPES = [
  'cash',
  'bank',
  'savings',
  'credit_card',
  'wallet',
  'investment',
  'other',
] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const ACCOUNT_STATUSES = ['active', 'inactive', 'closed'] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

/**
 * A financial account (Phase 3). `openingBalance` is set once at creation
 * and never changes — it's the historical starting point. `currentBalance`
 * starts equal to it and, from Phase 4 onward, is only ever adjusted by the
 * centralized transaction/transfer logic (Rules 1–3, 5, 6 in PHASE_LOG.md)
 * — never edited directly by the user, so the balance always reconciles
 * against the transaction history.
 *
 * Phase 18 (Credit Card Management) formalizes a sign convention this model
 * already implied since Phase 3 (see accountSchemas.test.ts's "allows a
 * negative opening balance (e.g. a credit card already carrying a
 * balance)"): for a `credit_card` account, a negative `currentBalance`
 * means money owed. `getBalanceEffect` in `utils/transactionBalance.ts`
 * needed no change for this — an expense charged to a card already applies
 * `-amount` the same as it would to a bank account, which is exactly
 * "spending increases what's owed"; paying a card down is just a transfer
 * into it like any other account. `utils/creditCardCalculations.ts`'s
 * `getCreditCardDebt` reads that stored sign to report debt as a positive
 * number for display.
 *
 * `creditLimit`/`statementDay`/`paymentDueDay` only apply to `credit_card`
 * accounts (`null` otherwise) and, per the proposed data model's original
 * "Credit cards add creditLimit, statementDate, dueDate" line, are stored
 * directly on the account rather than a separate collection — a credit
 * card is still one account, just with extra fields. `statementDay`/
 * `paymentDueDay` are a recurring day-of-month (1–31), named to match
 * `types/debt.ts`'s `paymentDueDay` rather than the original proposal's
 * "-Date" suffix, and reuse that same field's roll-forward/clamp behavior
 * via the shared `utils/dayOfMonth.ts` (extracted from
 * `utils/debtCalculations.ts` this phase specifically so both features
 * share one implementation). These three fields are optional (rather than
 * required-but-nullable, the convention `SavingsGoal`/`Debt` use for their
 * own optional fields) so that the many `Account` object literals already
 * written in earlier phases' tests don't all need updating for a field
 * that's inapplicable to every non-credit-card account anyway.
 */
export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  institution: string;
  accountNumber: string;
  openingBalance: number;
  currentBalance: number;
  currency: string;
  status: AccountStatus;
  notes: string;
  creditLimit?: number | null;
  statementDay?: number | null;
  paymentDueDay?: number | null;
  createdAt: string;
  updatedAt: string;
}

export type NewAccountInput = Pick<
  Account,
  | 'name'
  | 'type'
  | 'institution'
  | 'accountNumber'
  | 'openingBalance'
  | 'currency'
  | 'status'
  | 'notes'
> & {
  creditLimit: number | null;
  statementDay: number | null;
  paymentDueDay: number | null;
};

export type UpdatableAccountFields = Pick<
  Account,
  'name' | 'type' | 'institution' | 'accountNumber' | 'currency' | 'status' | 'notes'
> & {
  creditLimit: number | null;
  statementDay: number | null;
  paymentDueDay: number | null;
};
