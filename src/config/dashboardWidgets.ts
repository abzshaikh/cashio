/**
 * Phase 39: the set of dashboard sections a user can show/hide and
 * reorder — everything on `DashboardPage` below the always-shown stat
 * row (total balance/income/expenses/net), which stays fixed since it's
 * the "at a glance" summary the page exists for, not a widget someone
 * would want to remove. Adding a new customizable section later means
 * adding one entry here, one case in `DashboardPage`'s widget renderer,
 * and one size in its size map — the same "one place defines the set,
 * everything else maps over it" shape `TRANSACTION_TYPE_CHIP_META` and
 * `INSIGHT_SEVERITY_META` already use for their own closed sets.
 */
export type DashboardWidgetId = 'activeBudgets' | 'recentTransactions' | 'categorySpending';

export const DASHBOARD_WIDGET_IDS: DashboardWidgetId[] = [
  'activeBudgets',
  'recentTransactions',
  'categorySpending',
];

export const DASHBOARD_WIDGET_META: Record<DashboardWidgetId, { label: string; description: string }> = {
  activeBudgets: {
    label: 'Active budgets',
    description: 'Progress bars for budgets running today.',
  },
  recentTransactions: {
    label: 'Recent transactions',
    description: 'Your five most recent transactions.',
  },
  categorySpending: {
    label: 'Spending by category',
    description: "This month's expenses broken down by category.",
  },
};
