import type { BudgetPeriod } from './budget';
import type { InsightSeverity } from '../utils/insightsEngine';
import { DASHBOARD_WIDGET_IDS, type DashboardWidgetId } from '../config/dashboardWidgets';

/**
 * Phase 36: per-user app preferences, stored as a single document at
 * `settings/{uid}` (the doc ID *is* the user's UID — there is never more
 * than one settings document per user, unlike every other collection in
 * this app which is a list of many documents scoped by a `userId` field).
 * This is deliberately a small, closed set of fields rather than a
 * catch-all "preferences bag" — each field exists because a concrete
 * feature elsewhere in the app reads it:
 *
 * - `defaultBudgetPeriod`/`defaultBudgetWarningThreshold`/
 *   `defaultBudgetOverThreshold` pre-fill `BudgetsPage`'s "Add Budget"
 *   dialog (Phase 9) so a user who always budgets weekly at the same
 *   thresholds doesn't re-enter them every time.
 * - `defaultAccountId` pre-fills the account field when adding a new
 *   Income or Expense (Phase 7) — the single most repetitive field for
 *   someone who mostly transacts from one account.
 * - `defaultCategoryId` pre-fills the category field when adding a new
 *   Expense (Phase 7) — an expense-category slug (Phase 6), not
 *   meaningful for Income (which has its own fixed category enum).
 * - `notifyOnSeverity` gates which of Phase 24's insight severities
 *   (`InsightSeverity`) Phase 35's `useNotificationSync` turns into a
 *   persisted, badge-counted notification — e.g. someone who finds
 *   "positive" nudges noisy can turn just that severity off without
 *   losing critical/warning alerts.
 * - `dashboardWidgets` (Phase 39) is which of `DashboardPage`'s
 *   customizable sections `DashboardCustomizeDialog` shows, and in what
 *   order — an id's absence means "hidden" rather than a separate
 *   visibility map, so order and visibility live in one field instead of
 *   two that could disagree.
 *
 * `theme` (light/dark) is deliberately *not* here even though the
 * original data-model sketch listed it under `settings` — it already
 * works well as a per-device `localStorage` preference
 * (`ColorModeContext`, Phase 1), and syncing it to Firestore would mean
 * reconciling two sources of truth (a local toggle vs. a synced value)
 * for a preference that arguably *should* differ per device (a laptop
 * used outdoors vs. a phone in bed). See PHASE_LOG.md's Phase 36 section
 * for the full reasoning.
 */
export interface UserSettings {
  userId: string;
  defaultBudgetPeriod: BudgetPeriod;
  /** Percentage of the budgeted amount, matching `Budget.warningThreshold`'s
   * own convention (e.g. `80` means "80% spent"), not a fraction. */
  defaultBudgetWarningThreshold: number;
  defaultBudgetOverThreshold: number;
  /** An `Account.id`, or `null` when the user hasn't chosen one — the
   * account field then falls back to blank, exactly like today. */
  defaultAccountId: string | null;
  /** An expense category slug (`ExpenseCategoryRecord.slug`), or `null`. */
  defaultCategoryId: string | null;
  notifyOnSeverity: Record<InsightSeverity, boolean>;
  /** Which `DashboardWidgetId`s show on the dashboard, and in what order.
   * A widget missing from this list is hidden. */
  dashboardWidgets: DashboardWidgetId[];
  updatedAt: string;
}

export type UpdatableUserSettingsFields = Omit<UserSettings, 'userId' | 'updatedAt'>;

/**
 * What every user effectively has until they save their own choices —
 * used both to seed the Settings form before the first Firestore read
 * resolves, and to backfill any field missing from an existing document
 * (e.g. one saved before a later phase added a new field).
 */
export const DEFAULT_USER_SETTINGS: UpdatableUserSettingsFields = {
  defaultBudgetPeriod: 'monthly',
  defaultBudgetWarningThreshold: 80,
  defaultBudgetOverThreshold: 100,
  defaultAccountId: null,
  defaultCategoryId: null,
  notifyOnSeverity: {
    critical: true,
    warning: true,
    info: true,
    positive: true,
  },
  dashboardWidgets: [...DASHBOARD_WIDGET_IDS],
};
