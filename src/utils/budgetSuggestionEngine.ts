import type { Transaction } from '../types/transaction';
import { getExpenseByCategory, getPeriodTotals } from './dashboardCalculations';
import { getMonthRange } from './reportCalculations';
import { toMajorUnits } from './money';
import { defaultBudgetFormValues, type BudgetFormValues } from '../schemas/budgetSchemas';

/**
 * Phase 26: rule-based budget suggestions — a fixed trailing-month average
 * over real spending, rounded to a friendly number. "Smart" here means the
 * same thing Phase 24 already scoped it to mean when it named this phase
 * as where anything beyond fixed-threshold rules would live: still simple,
 * deterministic arithmetic over the user's own transactions, never any
 * statistical model or forecasting — same "rule-based" boundary Phase 24's
 * insights engine drew for itself.
 */
export const SUGGESTION_TRAILING_MONTHS = 3;

/**
 * Rounds a suggested amount UP to a friendly number, with the rounding
 * increment scaled to the amount's own magnitude (nearest ₹50 under
 * ₹1,000; nearest ₹100 under ₹10,000; nearest ₹500 under ₹100,000; nearest
 * ₹1,000 above that) — a suggested budget of exactly ₹8,432.17 is silly,
 * and a fixed increment regardless of scale would be too coarse for a ₹500
 * grocery budget or absurdly fine for a ₹150,000 rent budget. Rounding UP
 * rather than to the nearest is deliberate: a suggestion trimmed below the
 * recent average would all but guarantee going over budget immediately.
 *
 * Phase 34: `amount` is an integer minor-unit value (like every other
 * amount this module works with — see `getSuggestedOverallBudget`'s doc
 * comment) — every threshold and rounding increment above is stated in
 * major-unit rupees but scaled ×100 below to match, so the actual rounding
 * behavior (in real-world rupee terms) is unchanged from before this phase.
 */
export function roundSuggestedAmount(amount: number): number {
  if (amount <= 0) return 0;
  const increment =
    amount < 100_000 ? 5_000 : amount < 1_000_000 ? 10_000 : amount < 10_000_000 ? 50_000 : 100_000;
  return Math.ceil(amount / increment) * increment;
}

function trailingMonthRanges(referenceDate: Date, monthsBack: number) {
  const ranges: { start: string; end: string }[] = [];
  for (let i = 1; i <= monthsBack; i += 1) {
    const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1);
    ranges.push(getMonthRange(d.getFullYear(), d.getMonth()));
  }
  return ranges;
}

/**
 * A single suggested amount for an overall-scope budget: the trailing
 * 3-month average total expense (Rule 8 net-of-refund, same as
 * `getPeriodTotals`), rounded up. The *current*, still-in-progress month is
 * deliberately excluded — it's partial and would understate the average.
 * `null` when there's no trailing expense data at all to suggest from
 * (a brand-new user), same "needs some history" caveat Phase 24's rules
 * already carry.
 *
 * Returns an integer minor-unit value, like `getPeriodTotals`'s `expense`
 * field it's averaged from — `suggestedOverallBudgetToFormValues` converts
 * it to major units for display/form use.
 */
export function getSuggestedOverallBudget(
  transactions: Transaction[],
  referenceDate: Date = new Date(),
): number | null {
  const ranges = trailingMonthRanges(referenceDate, SUGGESTION_TRAILING_MONTHS);
  const total = ranges.reduce(
    (sum, range) => sum + getPeriodTotals(transactions, range.start, range.end).expense,
    0,
  );
  const average = total / SUGGESTION_TRAILING_MONTHS;
  if (average <= 0) return null;
  return roundSuggestedAmount(average);
}

export interface CategoryBudgetSuggestion {
  categoryId: string;
  suggestedAmount: number;
}

/**
 * One suggested amount per category that had any trailing-month spend,
 * highest-suggestion first — categories with no trailing spend simply
 * aren't suggested yet, rather than showing a suggested ₹0 budget.
 */
export function getSuggestedCategoryBudgets(
  transactions: Transaction[],
  referenceDate: Date = new Date(),
): CategoryBudgetSuggestion[] {
  const totals = new Map<string, number>();
  for (const range of trailingMonthRanges(referenceDate, SUGGESTION_TRAILING_MONTHS)) {
    for (const entry of getExpenseByCategory(transactions, range.start, range.end)) {
      totals.set(entry.categoryId, (totals.get(entry.categoryId) ?? 0) + entry.amount);
    }
  }
  return Array.from(totals.entries())
    .map(([categoryId, total]) => ({
      categoryId,
      suggestedAmount: roundSuggestedAmount(total / SUGGESTION_TRAILING_MONTHS),
    }))
    .filter((entry) => entry.suggestedAmount > 0)
    .sort((a, b) => b.suggestedAmount - a.suggestedAmount);
}

/**
 * Turns a suggested overall amount into a ready-to-submit
 * `BudgetFormValues` for `BudgetFormDialog` in `mode: 'create'` — the same
 * "the dialog already accepts arbitrary `initialValues`" reuse Phase 25's
 * templates leaned on, applied to suggestions instead of a saved template.
 * Phase 34: `amount` is the integer minor-unit value `getSuggestedOverallBudget`
 * returns — converted to major units here, the boundary between this
 * module's internal minor-unit math and `BudgetFormValues`'s major-unit
 * contract.
 */
export function suggestedOverallBudgetToFormValues(
  amount: number,
  startDate: Date,
  endDate: Date,
): BudgetFormValues {
  return {
    ...defaultBudgetFormValues,
    name: 'Suggested budget',
    startDate,
    endDate,
    scope: 'overall',
    overallAmount: toMajorUnits(amount),
  };
}

/** Same idea as `suggestedOverallBudgetToFormValues`, for a category-scope
 * budget built from every current category suggestion at once — each
 * `suggestion.suggestedAmount` is likewise an integer minor-unit value,
 * converted to major units here. */
export function suggestedCategoryBudgetsToFormValues(
  suggestions: CategoryBudgetSuggestion[],
  startDate: Date,
  endDate: Date,
): BudgetFormValues {
  return {
    ...defaultBudgetFormValues,
    name: 'Suggested budget',
    startDate,
    endDate,
    scope: 'category',
    items: suggestions.map((suggestion) => ({
      categoryId: suggestion.categoryId,
      amount: toMajorUnits(suggestion.suggestedAmount),
    })),
  };
}
