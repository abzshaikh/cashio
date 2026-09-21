import type { Budget } from '../types/budget';
import type { Transaction } from '../types/transaction';
import type { ExpenseCategoryRecord } from '../types/category';
import type { Debt } from '../types/debt';
import type { DebtPayment } from '../types/debtPayment';
import type { RecurringExpenseRule, RecurringTransaction } from '../types/recurringTransaction';
import { getExpenseByCategory, getPeriodTotals, type PeriodTotals } from './dashboardCalculations';
import { getBiggestExpense, getBudgetsForMonth } from './monthlySummaryCalculations';
import { getBudgetProgress } from './budgetCalculations';
import { getMonthRange } from './reportCalculations';
import { getPeriodOverPeriodChange, getSavingsRate } from './periodComparison';
import { getDebtProgress } from './debtCalculations';
import { getSubscriptionTotals } from './subscriptionCalculations';
import { getCategoryLabel } from './expenseCategoryLookup';
import { formatCurrency, formatPercent } from './formatCurrency';
import { isDateInRange } from './transactionAggregation';

/**
 * Phase 24: a small set of independent, deterministic rules over data every
 * other phase already computes (budgets, categorized spend, savings rate,
 * debts, subscriptions) — "rule-based" as opposed to any statistical or
 * ML-driven prediction, which stays out of scope here (Phase 26, "Smart
 * budget suggestions," is where that kind of thing would live). Every rule
 * is a pure function taking already-loaded data plus a reference date, so
 * each is unit-testable in isolation like every other calculations module,
 * and `generateInsights` just runs all of them and merges the results.
 *
 * Unlike Phase 22/23's Monthly/Yearly Summary, this isn't a browsable-any-
 * period view — insights are inherently about *right now* (this month's
 * standing, a bill due in a few days), so there's no month/year picker;
 * `referenceDate` exists only so the rules are testable against a fixed
 * "today" rather than the real one.
 */

export type InsightSeverity = 'critical' | 'warning' | 'info' | 'positive';

export interface Insight {
  /** Stable, unique key (e.g. `budget-over-${budget.id}`) — suitable as a
   * React list key and stable across re-renders of the same underlying
   * condition. */
  id: string;
  severity: InsightSeverity;
  title: string;
  description: string;
  actionLabel?: string;
  actionPath?: string;
}

const SEVERITY_ORDER: Record<InsightSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
  positive: 3,
};

function sortInsights(insights: Insight[]): Insight[] {
  return [...insights].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

/** One insight per budget touching the given month that's `nearLimit` or
 * `over` — a plain `warning`/`safe` budget isn't actionable enough to
 * surface here (the Budgets/Dashboard pages already show every budget's
 * status continuously). Reuses Phase 22's `getBudgetsForMonth` despite its
 * month-flavored name (see that module's file comment) and Phase 10's
 * `getBudgetProgress` — never re-derives spend totals itself. */
export function getBudgetInsights(
  budgets: Budget[],
  transactions: Transaction[],
  monthStart: string,
  monthEnd: string,
  currency = 'INR',
): Insight[] {
  const insights: Insight[] = [];
  for (const budget of getBudgetsForMonth(budgets, monthStart, monthEnd)) {
    const { total, actual, percentSpent, status } = getBudgetProgress(budget, transactions);
    if (status === 'over') {
      insights.push({
        id: `budget-over-${budget.id}`,
        severity: 'critical',
        title: `${budget.name} is over budget`,
        description: `You've spent ${formatCurrency(actual, { currency })} of your ${formatCurrency(
          total,
          { currency },
        )} "${budget.name}" budget — ${formatCurrency(actual - total, { currency })} over.`,
        actionLabel: 'View budgets',
        actionPath: '/budgets',
      });
    } else if (status === 'nearLimit') {
      insights.push({
        id: `budget-near-${budget.id}`,
        severity: 'warning',
        title: `${budget.name} is close to its limit`,
        description: `You've used ${formatPercent(percentSpent)} of your "${budget.name}" budget.`,
        actionLabel: 'View budgets',
        actionPath: '/budgets',
      });
    }
  }
  return insights;
}

const CATEGORY_SPIKE_MULTIPLE = 1.3;
/** A trailing average under this is too small for a "30% above average"
 * comparison to mean anything (e.g. ₹2 vs ₹5 is technically +150% but not a
 * meaningful spike). Phase 34: amounts are minor units (paise), so this is
 * ₹1 rather than the pre-Phase-34 value of `1`. */
const CATEGORY_SPIKE_MIN_AVERAGE = 100;

/** Categories whose spend this month is at least 30% above their trailing
 * 3-month average — the trend a Monthly Summary reader would have to
 * compare four separate months to notice on their own. */
export function getCategorySpendSpikeInsights(
  transactions: Transaction[],
  categories: ExpenseCategoryRecord[],
  referenceDate: Date = new Date(),
  currency = 'INR',
): Insight[] {
  const { start: monthStart, end: monthEnd } = getMonthRange(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
  );
  const current = getExpenseByCategory(transactions, monthStart, monthEnd);

  const trailingTotals = new Map<string, number>();
  for (let i = 1; i <= 3; i += 1) {
    const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1);
    const range = getMonthRange(d.getFullYear(), d.getMonth());
    for (const entry of getExpenseByCategory(transactions, range.start, range.end)) {
      trailingTotals.set(entry.categoryId, (trailingTotals.get(entry.categoryId) ?? 0) + entry.amount);
    }
  }

  const insights: Insight[] = [];
  for (const entry of current) {
    const average = (trailingTotals.get(entry.categoryId) ?? 0) / 3;
    if (average < CATEGORY_SPIKE_MIN_AVERAGE) continue;
    if (entry.amount < average * CATEGORY_SPIKE_MULTIPLE) continue;
    const changePercent = ((entry.amount - average) / average) * 100;
    const label = getCategoryLabel(categories, entry.categoryId);
    insights.push({
      id: `category-spike-${entry.categoryId}`,
      severity: 'warning',
      title: `${label} spending is up`,
      description: `You've spent ${formatCurrency(entry.amount, { currency })} on ${label} this month — ${changePercent.toFixed(
        0,
      )}% above your 3-month average of ${formatCurrency(average, { currency })}.`,
      actionLabel: 'View transactions',
      actionPath: '/transactions',
    });
  }
  return insights;
}

const LOW_SAVINGS_RATE = 0.1;
const GREAT_SAVINGS_RATE = 0.3;

/** At most one insight, chosen from three mutually-exclusive tiers so the
 * page never shows two conflicting savings-rate callouts for the same
 * month: spending more than earned (critical), a low-but-positive savings
 * rate (warning), or a notably high one worth celebrating (positive). */
export function getSavingsRateInsight(totals: PeriodTotals, currency = 'INR'): Insight | null {
  if (totals.net < 0) {
    return {
      id: 'savings-rate-negative',
      severity: 'critical',
      title: 'You spent more than you earned',
      description: `Your expenses exceeded your income this month by ${formatCurrency(
        Math.abs(totals.net),
        { currency },
      )}.`,
      actionLabel: 'View monthly summary',
      actionPath: '/monthly-summary',
    };
  }
  const rate = getSavingsRate(totals);
  if (rate === null) return null;
  if (rate < LOW_SAVINGS_RATE) {
    return {
      id: 'savings-rate-low',
      severity: 'warning',
      title: 'Your savings rate is low',
      description: `You saved ${formatPercent(rate)} of your income this month. Consider reviewing your top spending categories.`,
      actionLabel: 'View monthly summary',
      actionPath: '/monthly-summary',
    };
  }
  if (rate >= GREAT_SAVINGS_RATE) {
    return {
      id: 'savings-rate-great',
      severity: 'positive',
      title: 'Great savings rate this month',
      description: `You saved ${formatPercent(rate)} of your income this month — keep it up.`,
    };
  }
  return null;
}

const EXPENSE_INCREASE_THRESHOLD = 20;
const EXPENSE_DECREASE_THRESHOLD = -20;

/** At most one insight: total spending up or down at least 20% versus last
 * month. Mirrors Monthly Summary's own trend math (`periodComparison.ts`)
 * rather than re-deriving a percent change. */
export function getExpenseTrendInsight(
  current: PeriodTotals,
  previous: PeriodTotals,
): Insight | null {
  const { expenseChangePercent } = getPeriodOverPeriodChange(current, previous);
  if (expenseChangePercent === null) return null;
  if (expenseChangePercent >= EXPENSE_INCREASE_THRESHOLD) {
    return {
      id: 'expense-trend-up',
      severity: 'warning',
      title: 'Spending increased this month',
      description: `Your total spending is up ${expenseChangePercent.toFixed(0)}% compared to last month.`,
      actionLabel: 'View monthly summary',
      actionPath: '/monthly-summary',
    };
  }
  if (expenseChangePercent <= EXPENSE_DECREASE_THRESHOLD) {
    return {
      id: 'expense-trend-down',
      severity: 'positive',
      title: 'Spending decreased this month',
      description: `Your total spending is down ${Math.abs(expenseChangePercent).toFixed(0)}% compared to last month.`,
    };
  }
  return null;
}

const LARGE_TRANSACTION_MULTIPLE = 3;

/** Flags this month's single biggest expense when it's at least 3x the
 * average expense transaction size *in that same category* over the
 * trailing 3 months — a one-off large purchase standing out from the
 * user's own normal pattern, not an arbitrary fixed dollar threshold. */
export function getLargeTransactionInsight(
  transactions: Transaction[],
  referenceDate: Date = new Date(),
  currency = 'INR',
): Insight | null {
  const { start: monthStart, end: monthEnd } = getMonthRange(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
  );
  const biggest = getBiggestExpense(transactions, monthStart, monthEnd);
  if (!biggest) return null;

  const trailingAmounts: number[] = [];
  for (let i = 1; i <= 3; i += 1) {
    const d = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1);
    const range = getMonthRange(d.getFullYear(), d.getMonth());
    for (const transaction of transactions) {
      if (transaction.type !== 'expense' || transaction.category !== biggest.category) continue;
      if (isDateInRange(transaction.date, range.start, range.end)) trailingAmounts.push(transaction.amount);
    }
  }
  if (trailingAmounts.length === 0) return null;
  const average = trailingAmounts.reduce((sum, amount) => sum + amount, 0) / trailingAmounts.length;
  if (average <= 0 || biggest.amount < average * LARGE_TRANSACTION_MULTIPLE) return null;

  return {
    id: `large-transaction-${biggest.id}`,
    severity: 'info',
    title: 'Unusually large expense',
    description: `Your ${formatCurrency(biggest.amount, { currency })} expense at ${
      biggest.merchant || biggest.description || 'an unnamed merchant'
    } is much higher than your typical expense in that category (avg ${formatCurrency(average, {
      currency,
    })}).`,
    actionLabel: 'View transactions',
    actionPath: '/transactions',
  };
}

/** One insight per debt whose next payment is due soon — reuses Phase 17's
 * `getDebtProgress` for the due-date rolling/status math entirely; a `safe`
 * or already-paid-off debt generates nothing. `nearLimit` (≤3 days) is
 * escalated to `critical` here, `warning` (≤7 days) stays `warning`. */
export function getDebtDueSoonInsights(
  debts: Debt[],
  payments: DebtPayment[],
  asOf: Date = new Date(),
  currency = 'INR',
): Insight[] {
  const insights: Insight[] = [];
  for (const debt of debts) {
    const progress = getDebtProgress(debt, payments, asOf);
    if (progress.isPaidOff || progress.status === 'safe') continue;
    insights.push({
      id: `debt-due-${debt.id}`,
      severity: progress.status === 'nearLimit' ? 'critical' : 'warning',
      title: `${debt.lender} payment due soon`,
      description: `Your minimum payment of ${formatCurrency(debt.minimumPayment, {
        currency,
      })} to ${debt.lender} is due in ${progress.daysUntilDue} day${
        progress.daysUntilDue === 1 ? '' : 's'
      }.`,
      actionLabel: 'View debts',
      actionPath: '/debts',
    });
  }
  return insights;
}

const SUBSCRIPTION_SHARE_THRESHOLD = 0.15;

function isSubscriptionRule(rule: RecurringTransaction): rule is RecurringExpenseRule {
  return rule.type === 'expense' && rule.isSubscription;
}

/** At most one insight: active subscriptions' combined monthly-equivalent
 * cost (Phase 15's `getSubscriptionTotals`) is at least 15% of this month's
 * income. Silent when there's no income to compare against, rather than a
 * misleading divide-by-zero share. */
export function getSubscriptionShareInsight(
  recurringTransactions: RecurringTransaction[],
  monthlyIncome: number,
  currency = 'INR',
): Insight | null {
  const subscriptionRules = recurringTransactions.filter(isSubscriptionRule);
  if (subscriptionRules.length === 0 || monthlyIncome <= 0) return null;
  const { monthlyTotal, activeCount } = getSubscriptionTotals(subscriptionRules);
  if (monthlyTotal <= 0) return null;
  const share = monthlyTotal / monthlyIncome;
  if (share < SUBSCRIPTION_SHARE_THRESHOLD) return null;
  return {
    id: 'subscription-share',
    severity: 'info',
    title: 'Subscriptions are a notable expense',
    description: `Your ${activeCount} active subscription${
      activeCount === 1 ? '' : 's'
    } cost about ${formatCurrency(monthlyTotal, { currency })}/month — ${formatPercent(
      share,
    )} of this month's income.`,
    actionLabel: 'View subscriptions',
    actionPath: '/subscriptions',
  };
}

export interface GenerateInsightsInput {
  transactions: Transaction[];
  budgets: Budget[];
  categories: ExpenseCategoryRecord[];
  debts: Debt[];
  debtPayments: DebtPayment[];
  recurringTransactions: RecurringTransaction[];
  currency?: string;
  referenceDate?: Date;
}

/** Runs every rule above against the same loaded data and merges the
 * results, most severe first. The single, page-facing entry point — the
 * Insights page never calls an individual rule function itself. */
export function generateInsights(input: GenerateInsightsInput): Insight[] {
  const {
    transactions,
    budgets,
    categories,
    debts,
    debtPayments,
    recurringTransactions,
    currency = 'INR',
    referenceDate = new Date(),
  } = input;

  const { start: monthStart, end: monthEnd } = getMonthRange(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
  );
  const previousDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1);
  const previousRange = getMonthRange(previousDate.getFullYear(), previousDate.getMonth());

  const currentTotals = getPeriodTotals(transactions, monthStart, monthEnd);
  const previousTotals = getPeriodTotals(transactions, previousRange.start, previousRange.end);

  const singleInsights = [
    getSavingsRateInsight(currentTotals, currency),
    getExpenseTrendInsight(currentTotals, previousTotals),
    getLargeTransactionInsight(transactions, referenceDate, currency),
    getSubscriptionShareInsight(recurringTransactions, currentTotals.income, currency),
  ].filter((insight): insight is Insight => insight !== null);

  return sortInsights([
    ...getBudgetInsights(budgets, transactions, monthStart, monthEnd, currency),
    ...getCategorySpendSpikeInsights(transactions, categories, referenceDate, currency),
    ...getDebtDueSoonInsights(debts, debtPayments, referenceDate, currency),
    ...singleInsights,
  ]);
}
