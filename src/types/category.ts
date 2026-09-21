/**
 * Phase 6's real, per-user expense category system — replaces the fixed
 * `EXPENSE_CATEGORIES` enum Phases 5 shipped with. See the comment on
 * `ExpenseCategorySlug` in `types/transaction.ts` for how a transaction's
 * `category`/`subcategory` fields (plain slug strings) relate to the
 * records here.
 */

/** A subcategory nested inside its parent category's `subcategories` array. */
export interface ExpenseSubcategoryRecord {
  /** Stable identifier stored on transactions — immutable once created. */
  slug: string;
  /** Editable display label. */
  name: string;
}

export interface ExpenseCategoryRecord {
  id: string;
  userId: string;
  /** Stable identifier stored on transactions — immutable once created. */
  slug: string;
  /** Editable display label. */
  name: string;
  /**
   * True for the 9 categories seeded from `config/defaultExpenseCategories.ts`.
   * Informational only — defaults can still be renamed or deleted like any
   * other category (the spec only requires that custom ones can be
   * *added*, not that defaults are locked); the flag just lets the UI show
   * a "Default" badge.
   */
  isDefault: boolean;
  subcategories: ExpenseSubcategoryRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface NewExpenseCategoryInput {
  name: string;
}

export interface NewExpenseSubcategoryInput {
  name: string;
}
