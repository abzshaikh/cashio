import { z } from 'zod';
import { BUDGET_PERIODS, BUDGET_SCOPES } from '../types/budget';
import { moneyAmountSchema } from './moneySchemas';

export const budgetItemFormSchema = z.object({
  categoryId: z.string().min(1, 'Select a category'),
  amount: moneyAmountSchema(),
});
export type BudgetItemFormValues = z.infer<typeof budgetItemFormSchema>;

/**
 * `overallAmount` is only actually required when `scope === 'overall'`,
 * and `items` only when `scope === 'category'` — neither field can be a
 * plain required primitive, so both checks live in `.refine`s below
 * instead (same division of responsibility already used elsewhere for
 * fields whose validity depends on another field's value).
 */
export const budgetFormSchema = z
  .object({
    name: z.string().min(1, 'Enter a budget name').max(120),
    period: z.enum(BUDGET_PERIODS),
    startDate: z.date({ error: 'Select a start date' }),
    endDate: z.date({ error: 'Select an end date' }),
    scope: z.enum(BUDGET_SCOPES),
    overallAmount: z.coerce
      .number({ error: 'Enter a valid amount' })
      .nonnegative('Amount cannot be negative'),
    items: z.array(budgetItemFormSchema),
    warningThreshold: z.coerce
      .number({ error: 'Enter a percentage' })
      .min(1, 'Must be at least 1%')
      .max(200, 'Must be 200% or less'),
    overThreshold: z.coerce
      .number({ error: 'Enter a percentage' })
      .min(1, 'Must be at least 1%')
      .max(500, 'Must be 500% or less'),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'End date must be on or after the start date',
    path: ['endDate'],
  })
  .refine((data) => data.scope !== 'overall' || data.overallAmount > 0, {
    message: 'Enter a budget amount',
    path: ['overallAmount'],
  })
  .refine((data) => data.scope !== 'category' || data.items.length > 0, {
    message: 'Add at least one category',
    path: ['items'],
  })
  .refine((data) => data.warningThreshold <= data.overThreshold, {
    message: 'Must be at or below the over-budget threshold',
    path: ['warningThreshold'],
  });
export type BudgetFormValues = z.infer<typeof budgetFormSchema>;

// Exported so other "start a new budget defaulted to the current month"
// entry points — Phase 25's "use template" flow in BudgetsPage.tsx — apply
// the exact same default dates as a fresh "Add Budget", without redefining
// what "current month" means in a second place.
export function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export function endOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0);
}

export const defaultBudgetFormValues: BudgetFormValues = {
  name: '',
  period: 'monthly',
  startDate: startOfCurrentMonth(),
  endDate: endOfCurrentMonth(),
  scope: 'overall',
  overallAmount: 0,
  items: [],
  warningThreshold: 80,
  overThreshold: 100,
};
