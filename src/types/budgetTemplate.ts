import type { BudgetItem, BudgetPeriod, BudgetScope } from './budget';

/**
 * Phase 25's reusable "shape of a budget" snapshot — everything a `Budget`
 * has except its date range, since the whole point of a template is to
 * spin up a new budget for *whatever period comes next*, not to repeat the
 * same fixed dates. `period` is kept (still just informational/labeling,
 * same as `Budget.period`) so "Use template" can default the new budget's
 * period selector to whatever the template was saved with.
 */
export interface BudgetTemplate {
  id: string;
  userId: string;
  name: string;
  period: BudgetPeriod;
  scope: BudgetScope;
  /** Used when `scope === 'overall'`; stored as 0 when `scope === 'category'`. */
  overallAmount: number;
  /** Used when `scope === 'category'`; empty when `scope === 'overall'`. */
  items: BudgetItem[];
  warningThreshold: number;
  overThreshold: number;
  createdAt: string;
  updatedAt: string;
}

export type NewBudgetTemplateInput = Pick<
  BudgetTemplate,
  'name' | 'period' | 'scope' | 'overallAmount' | 'items' | 'warningThreshold' | 'overThreshold'
>;

/**
 * Templates are create/delete only for this phase — there's no "Edit
 * template" flow (renaming or reshaping one is exactly as easy as saving a
 * new one from a current budget and deleting the old), so no
 * `UpdatableBudgetTemplateFields`/`updateBudgetTemplate` exists yet. See
 * PHASE_LOG.md Phase 25 "Known limitations".
 */
