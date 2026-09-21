import type {
  ExpenseCategorySlug,
  ExpenseSubcategory,
  IncomeCategory,
  PaymentMethod,
} from './transaction';

/**
 * How often a recurring rule repeats. `quarterly` isn't just "every 3
 * months" spelled out for the user — `utils/recurringCalculations.ts`'s
 * `addInterval` literally advances the date by 3 months for it, same
 * native-`Date` month arithmetic `monthly`/`yearly` use (see that file's
 * doc comment for the accepted month-length rollover limitation).
 */
export const RECURRING_FREQUENCIES = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] as const;
export type RecurringFrequency = (typeof RECURRING_FREQUENCIES)[number];

/**
 * A recurring rule only ever generates one of these two transaction types —
 * the two that naturally repeat on a schedule (salary, rent, subscriptions,
 * loan EMIs). `refund`/`adjustment` are one-off by nature, and a recurring
 * `transfer` is left out of this phase's scope (see PHASE_LOG.md's Phase 14
 * section for the reasoning); nothing here stops a later phase from adding
 * it the same way Phase 8 added `transfer` to `TRANSACTION_TYPES`.
 */
export const RECURRING_TRANSACTION_TYPES = ['income', 'expense'] as const;
export type RecurringTransactionType = (typeof RECURRING_TRANSACTION_TYPES)[number];

/**
 * Fields every recurring rule shares, regardless of which transaction type
 * it generates. `startDate`/`endDate`/`nextOccurrence`/`lastGeneratedDate`
 * are all "YYYY-MM-DD" strings (never a full timestamp) — the same
 * date-only convention `utils/dateRangePresets.ts` uses, since a recurring
 * rule only ever cares about calendar days, not times.
 */
interface RecurringTransactionCommon {
  id: string;
  userId: string;
  /** Always stored positive, same convention as `Transaction.amount`. */
  amount: number;
  frequency: RecurringFrequency;
  /** The first occurrence's date. Never changes the rule's already-advanced
   * schedule once occurrences exist — see `recurringTransactionService.ts`. */
  startDate: string;
  /** `null` means the rule repeats indefinitely. */
  endDate: string | null;
  accountId: string;
  description: string;
  notes: string;
  /** Paused rules are skipped entirely by the generation engine — see
   * `generateDueOccurrences`. Toggled from the Recurring Transactions page
   * without opening the edit dialog. */
  isActive: boolean;
  /** The next date this rule is due to generate a transaction for. Starts
   * equal to `startDate` and is advanced by the generation engine each time
   * it produces an occurrence — never by editing the rule (see
   * `updateRecurringTransaction`'s doc comment for why). */
  nextOccurrence: string;
  /** The most recent occurrence date actually generated, or `null` if this
   * rule has never generated one yet. */
  lastGeneratedDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringIncomeRule extends RecurringTransactionCommon {
  type: 'income';
  category: IncomeCategory;
  source: string;
}

export interface RecurringExpenseRule extends RecurringTransactionCommon {
  type: 'expense';
  category: ExpenseCategorySlug;
  subcategory: ExpenseSubcategory;
  merchant: string;
  paymentMethod: PaymentMethod;
  /**
   * Marks this rule as a subscription (Netflix, Spotify, a gym membership)
   * rather than some other recurring expense (rent, a loan EMI) — Phase
   * 15's Subscriptions page is a filtered view over exactly the expense
   * rules with this flag set, not a separate collection (see
   * PHASE_LOG.md's Phase 14 section, which already called this out as the
   * plan). Meaningless for `RecurringIncomeRule` — nothing is ever a
   * "subscription" on the income side — so it lives only here rather than
   * on `RecurringTransactionCommon`.
   */
  isSubscription: boolean;
}

/** A discriminated union on `type`, same pattern as `Transaction` in
 * `types/transaction.ts` — `rule.type === 'expense'` narrows `rule` to have
 * `subcategory`/`merchant`/`paymentMethod` at compile time. */
export type RecurringTransaction = RecurringIncomeRule | RecurringExpenseRule;

/**
 * Shape the service layer accepts for creating/editing a recurring rule.
 * Like `NewIncomeInput`/`NewExpenseInput`, dates are real `Date`s (as the
 * form produces) rather than the stored "YYYY-MM-DD" strings. Carries every
 * type-specific field regardless of `type` (the unused side is written as
 * `''`/a harmless default by the service, same convention
 * `transactionService.ts` uses for e.g. income's blank `merchant`) so the
 * form dialog can stay a single component with one schema instead of two
 * parallel ones for a feature this size.
 */
export interface NewRecurringTransactionInput {
  type: RecurringTransactionType;
  amount: number;
  frequency: RecurringFrequency;
  startDate: Date;
  endDate: Date | null;
  accountId: string;
  /** An `IncomeCategory` when `type === 'income'`, an expense category slug
   * when `type === 'expense'` — validated by the dialog's cascading
   * selects, not the schema, same division of responsibility
   * `expenseSchemas.ts` already documents for a plain expense entry. */
  category: string;
  subcategory: string;
  merchant: string;
  paymentMethod: PaymentMethod;
  /** Ignored (stored as `false`) when `type === 'income'` — see
   * `RecurringExpenseRule.isSubscription`. */
  isSubscription: boolean;
  source: string;
  description: string;
  notes: string;
}
export type UpdatableRecurringTransactionFields = NewRecurringTransactionInput;
