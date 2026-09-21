/**
 * Every kind of money movement eventually lives in this one `transactions`
 * collection (per PHASE_LOG.md's proposed schema) — Phase 7's "unified
 * transaction system" is really about finishing this list and the UI around
 * it, not switching collections later. Types are added to the union only as
 * their own phase actually builds support for them, so a type existing here
 * always means real UI/logic exists for it:
 *   - income        Phase 4
 *   - expense       Phase 5
 *   - refund        Phase 7 ("Refunds must be handled consistently" — Rule 8)
 *   - adjustment    Phase 7
 *   - transfer      Phase 8 (this phase) — NEVER counted as income/expense
 *                   (Rule 4); moves money between two of the user's own
 *                   accounts, so it needs `fromAccountId`/`toAccountId`
 *                   instead of every other type's single `accountId` — see
 *                   `TransactionCommon`/`TransferTransaction` below, and
 *                   `utils/transactionBalance.ts` for why it's the one type
 *                   that never goes through `getBalanceEffect`.
 */
export const TRANSACTION_TYPES = ['income', 'expense', 'refund', 'adjustment', 'transfer'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

/**
 * Income-specific categories, per the product spec's exact list. This is
 * deliberately a fixed enum, not the flexible custom-category system Phase 6
 * builds (that phase is scoped to *expense* categories) — revisit whether
 * income should grow its own custom categories once Phase 6 exists.
 */
export const INCOME_CATEGORIES = [
  'salary',
  'freelance_income',
  'business_income',
  'interest',
  'rental_income',
  'bonus',
  'gift',
  'refund',
  'other_income',
] as const;
export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];

/**
 * Expense categories were a fixed enum through Phase 5. Phase 6 replaces
 * that with a real, per-user, Firestore-backed category system (see
 * `types/category.ts`'s `ExpenseCategoryRecord`) that supports renaming,
 * custom categories, and custom subcategories — exactly what this comment
 * used to say Phase 6 would need to do. A transaction now stores a
 * category **slug** (a plain string, e.g. `'food'`) rather than a value
 * from a closed union, because the set of valid slugs is now user data,
 * not something this module can know at compile time. The 9 default
 * categories are seeded with the same slugs the old fixed enum used
 * (`slugify('Food') === 'food'`, etc.) so every transaction recorded
 * before this phase keeps resolving to the right category with no
 * migration needed — see `utils/expenseCategoryLookup.ts`.
 *
 * A refund (Phase 7) reuses this exact same category/subcategory system —
 * it's what the refunded money was originally spent on, so there is no
 * separate "refund category" list.
 */
export type ExpenseCategorySlug = string;

/**
 * Subcategory values are namespaced by their parent category (each
 * `ExpenseCategoryRecord`'s own `subcategories` array), not a flat union —
 * "maintenance" legitimately means different things under `housing` and
 * `transportation`. A blank string means "no subcategory chosen", valid
 * for every category (required for `other`, which ships with none).
 */
export type ExpenseSubcategory = string;

export const PAYMENT_METHODS = [
  'cash',
  'debit_card',
  'credit_card',
  'upi',
  'net_banking',
  'wallet',
  'cheque',
  'other',
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/**
 * An adjustment (Phase 7) is a manual balance correction — unlike every
 * other type, its effect on the balance isn't implied by the type alone
 * (income always adds, expense always subtracts), so it needs its own
 * explicit direction. See `utils/transactionBalance.ts`'s `getBalanceEffect`.
 */
export const ADJUSTMENT_DIRECTIONS = ['increase', 'decrease'] as const;
export type AdjustmentDirection = (typeof ADJUSTMENT_DIRECTIONS)[number];

/**
 * Fields every transaction shares, regardless of how many accounts it
 * touches. Split out from `TransactionBase` (below) specifically so
 * `TransferTransaction` can share these without also inheriting a single
 * `accountId` that wouldn't make sense for it — a transfer touches two
 * accounts, not one.
 */
interface TransactionCommon {
  id: string;
  userId: string;
  /** Always stored positive — see `utils/transactionBalance.ts` for how the
   * type (not the sign of this value) determines its effect on a balance. */
  amount: number;
  /** The date the money actually moved (user-chosen). */
  date: string;
  description: string;
  notes: string;
  /**
   * Who the money went to or came from. Meaningful for expense/refund
   * (blank is fine for income/adjustment/transfer, where there's no
   * natural "merchant") — kept on every transaction, not just expense's
   * own interface, per the product spec's field list for the unified
   * system.
   */
  merchant: string;
  /** Free-text labels, meaningful for any transaction type — Phase 21
   * formalizes a real tag system (reuse-across-transactions, rename,
   * colors); this is the seed of it. */
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/** `TransactionCommon` plus the single `accountId` every type except
 * `transfer` (Phase 8) is scoped to. */
interface TransactionBase extends TransactionCommon {
  accountId: string;
}

export interface IncomeTransaction extends TransactionBase {
  type: 'income';
  category: IncomeCategory;
  source: string;
  /**
   * Marks this entry as one that repeats — Phase 14 builds the actual
   * recurring-generation engine; this flag just carries the user's intent
   * until then so nothing needs to be re-asked or backfilled later.
   */
  isRecurring: boolean;
}

export interface ExpenseTransaction extends TransactionBase {
  type: 'expense';
  category: ExpenseCategorySlug;
  subcategory: ExpenseSubcategory;
  paymentMethod: PaymentMethod;
}

/**
 * A refund (Rule 8: "must be handled consistently") always increases the
 * account's balance — same direction as income — but is kept as its own
 * type rather than folded into income, so it's never conflated with real
 * earnings in reports or totals. Categorized with the same expense
 * category/subcategory a purchase would have used, since that's what's
 * actually being refunded.
 */
export interface RefundTransaction extends TransactionBase {
  type: 'refund';
  category: ExpenseCategorySlug;
  subcategory: ExpenseSubcategory;
}

/**
 * A manual balance correction — e.g. reconciling a cash count, fixing a
 * bank error, or a one-time opening-balance tweak. `reason` is required
 * (freeform) since an adjustment with no explanation defeats the point of
 * keeping one as its own transaction type instead of just editing the
 * account balance directly.
 */
export interface AdjustmentTransaction extends TransactionBase {
  type: 'adjustment';
  direction: AdjustmentDirection;
  reason: string;
}

/**
 * Moves money between two of the user's own accounts (Rule 3/4: "transfers
 * move money between two accounts and are NEVER counted as income or
 * expense"). Extends `TransactionCommon`, not `TransactionBase` — there is
 * no single `accountId` for a transfer, only a source and a destination.
 * The same `amount` decreases `fromAccountId`'s balance and increases
 * `toAccountId`'s by the same amount (see `transactionService.ts`'s
 * `createTransferTransaction`/`updateTransferTransaction`) — no currency
 * conversion is applied even if the two accounts use different
 * currencies, since Phase 8 doesn't build an FX rate system.
 */
export interface TransferTransaction extends TransactionCommon {
  type: 'transfer';
  fromAccountId: string;
  toAccountId: string;
}

/**
 * A single entry in the unified transaction ledger. A discriminated union
 * on `type` rather than one flat interface with optional fields, so
 * `row.type === 'expense'` narrows `row` to have `subcategory`/etc. at
 * compile time instead of every consumer having to guard against fields
 * that don't apply to the current type. Note that only `TransferTransaction`
 * lacks a plain `accountId` — any code that needs "the account" for a row
 * has to branch on `row.type === 'transfer'` first (see `TransactionsPage`).
 */
export type Transaction =
  | IncomeTransaction
  | ExpenseTransaction
  | RefundTransaction
  | AdjustmentTransaction
  | TransferTransaction;

/**
 * Shape the service layer accepts for creating/editing an income entry.
 * Same fields as `IncomeTransaction`, except `date` is a real `Date` (as
 * the date-picker form produces) rather than the stored ISO string — the
 * service converts it to a Firestore `Timestamp` on write. `merchant`
 * isn't part of the form (there's no meaningful "merchant" for income) —
 * the service writes it as `''` directly.
 */
export type NewIncomeInput = Pick<
  IncomeTransaction,
  'amount' | 'accountId' | 'category' | 'source' | 'description' | 'notes' | 'isRecurring' | 'tags'
> & { date: Date };
export type UpdatableIncomeFields = NewIncomeInput;

/** Same idea as `NewIncomeInput`, for expense entries. */
export type NewExpenseInput = Pick<
  ExpenseTransaction,
  | 'amount'
  | 'accountId'
  | 'category'
  | 'subcategory'
  | 'merchant'
  | 'paymentMethod'
  | 'description'
  | 'notes'
  | 'tags'
> & { date: Date };
export type UpdatableExpenseFields = NewExpenseInput;

/** Same idea as `NewExpenseInput`, for refund entries (no payment method). */
export type NewRefundInput = Pick<
  RefundTransaction,
  'amount' | 'accountId' | 'category' | 'subcategory' | 'merchant' | 'description' | 'notes' | 'tags'
> & { date: Date };
export type UpdatableRefundFields = NewRefundInput;

/**
 * Same idea as `NewIncomeInput`, for adjustment entries. `merchant` isn't
 * part of the form here either — the service writes it as `''` directly.
 */
export type NewAdjustmentInput = Pick<
  AdjustmentTransaction,
  'amount' | 'accountId' | 'direction' | 'reason' | 'description' | 'notes' | 'tags'
> & { date: Date };
export type UpdatableAdjustmentFields = NewAdjustmentInput;

/**
 * Same idea as `NewIncomeInput`, for transfer entries. No `merchant` here
 * either (there's no meaningful "merchant" moving money between your own
 * accounts) — the service writes it as `''` directly. `fromAccountId` and
 * `toAccountId` must differ — enforced by `transferSchemas.ts` and, as a
 * defense-in-depth backstop, `createTransferTransaction`/
 * `updateTransferTransaction` themselves.
 */
export type NewTransferInput = Pick<
  TransferTransaction,
  'amount' | 'fromAccountId' | 'toAccountId' | 'description' | 'notes' | 'tags'
> & { date: Date };
export type UpdatableTransferFields = NewTransferInput;
