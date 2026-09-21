import type { BudgetPeriod } from '../types/budget';

export const budgetPeriodMeta: Record<BudgetPeriod, { label: string }> = {
  monthly: { label: 'Monthly' },
  weekly: { label: 'Weekly' },
  custom: { label: 'Custom' },
};

export const budgetPeriodOptions = (Object.keys(budgetPeriodMeta) as BudgetPeriod[]).map(
  (value) => ({ value, label: budgetPeriodMeta[value].label }),
);
