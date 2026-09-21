/**
 * A budget (Phase 9) is either one overall spending limit for its whole
 * period, or a set of per-category limits — never both at once, hence the
 * `scope` discriminant rather than always carrying both an `overallAmount`
 * and an `items` list. `period` is informational/labeling only for this
 * phase (it doesn't drive any date auto-computation yet) — `startDate`/
 * `endDate` are always the user's explicit choice. Phase 10 ("budget vs
 * actual") is what makes a budget's numbers mean anything by comparing
 * them against real transactions for that date range.
 */
export const BUDGET_PERIODS = ['monthly', 'weekly', 'custom'] as const;
export type BudgetPeriod = (typeof BUDGET_PERIODS)[number];

export const BUDGET_SCOPES = ['overall', 'category'] as const;
export type BudgetScope = (typeof BUDGET_SCOPES)[number];

/**
 * One category's limit within a `scope: 'category'` budget. Kept as a
 * whole-array field on the budget document (`items: BudgetItem[]`) rather
 * than the spec's separate `budgetItems` collection — same reasoning
 * Phase 6 used for a category's `subcategories`: a budget realistically
 * holds at most a handful of category limits, Firestore has no
 * per-element permission anyway, and one document read is simpler than a
 * subcollection query for something this small. `categoryId` is an
 * expense category slug (Phase 6's `ExpenseCategoryRecord.slug`).
 */
export interface BudgetItem {
  categoryId: string;
  amount: number;
}

/**
 * `warningThreshold`/`overThreshold` are stored as plain percentages of
 * the budgeted amount (e.g. `80` means "80% spent"), not fractions —
 * friendlier to read back out of Firestore and to show in the form
 * without a conversion step. Phase 10 divides actual-spend by budgeted
 * amount, multiplies by 100, and compares against these directly.
 */
export interface Budget {
  id: string;
  userId: string;
  name: string;
  period: BudgetPeriod;
  startDate: string;
  endDate: string;
  scope: BudgetScope;
  /** Used when `scope === 'overall'`; ignored (but still stored as 0)
   * when `scope === 'category'`. */
  overallAmount: number;
  /** Used when `scope === 'category'`; empty when `scope === 'overall'`. */
  items: BudgetItem[];
  warningThreshold: number;
  overThreshold: number;
  createdAt: string;
  updatedAt: string;
}

export type NewBudgetInput = Pick<
  Budget,
  'name' | 'period' | 'scope' | 'overallAmount' | 'items' | 'warningThreshold' | 'overThreshold'
> & { startDate: Date; endDate: Date };
export type UpdatableBudgetFields = NewBudgetInput;
