import type { BudgetFormValues } from '../schemas/budgetSchemas';
import type { Budget } from '../types/budget';
import type { BudgetTemplate, NewBudgetTemplateInput } from '../types/budgetTemplate';
import { toMajorUnits } from './money';

/**
 * Turns a saved template into a ready-to-submit `BudgetFormValues` for
 * `BudgetFormDialog` in `mode: 'create'` — the dialog already accepts
 * arbitrary `initialValues` regardless of mode (see `BudgetsPage.tsx`'s own
 * edit flow), so "use this template" needs nothing beyond building that
 * object. `startDate`/`endDate` are supplied by the caller (defaulting to
 * the current month, same as a fresh "Add Budget") since a template
 * deliberately carries no dates of its own. Phase 34: `template.overallAmount`/
 * `template.items[].amount` are integer minor-unit domain values —
 * converted to the decimal major-unit values `BudgetFormValues` expects
 * (per its own contract, "as the form produces"), since this function
 * populates the form directly rather than going through it.
 */
export function budgetTemplateToFormValues(
  template: BudgetTemplate,
  startDate: Date,
  endDate: Date,
): BudgetFormValues {
  return {
    name: template.name,
    period: template.period,
    startDate,
    endDate,
    scope: template.scope,
    overallAmount: toMajorUnits(template.overallAmount),
    items: template.items.map((item) => ({ ...item, amount: toMajorUnits(item.amount) })),
    warningThreshold: template.warningThreshold,
    overThreshold: template.overThreshold,
  };
}

/**
 * The reverse direction: snapshots an existing budget's shape (everything
 * except its own dates) into a `NewBudgetTemplateInput`, for "Save as
 * template". `name` defaults to the source budget's own name but is a
 * separate argument — `SaveAsTemplateDialog` lets the user rename it (e.g.
 * "Monthly essentials" the budget vs. "Standard month" the template).
 * Phase 34: `budget.overallAmount`/`budget.items[].amount` are integer
 * minor-unit domain values — converted to major units here since
 * `NewBudgetTemplateInput`, like every other service-layer input type, is
 * always major units by contract (`createBudgetTemplate` converts back to
 * minor units itself); this bypasses `BudgetFormDialog` entirely (there's
 * no form for "Save as template"), so the conversion has to happen here
 * instead of at a form boundary.
 */
export function budgetToTemplateInput(budget: Budget, name: string): NewBudgetTemplateInput {
  return {
    name,
    period: budget.period,
    scope: budget.scope,
    overallAmount: toMajorUnits(budget.overallAmount),
    items: budget.items.map((item) => ({ ...item, amount: toMajorUnits(item.amount) })),
    warningThreshold: budget.warningThreshold,
    overThreshold: budget.overThreshold,
  };
}
