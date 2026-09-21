import { DEFAULT_USER_SETTINGS, type UserSettings } from '../types/userSettings';
import { DASHBOARD_WIDGET_IDS, type DashboardWidgetId } from '../config/dashboardWidgets';
import type { InsightSeverity } from './insightsEngine';

/**
 * The untyped shape a `settings/{uid}` Firestore document might actually
 * contain — anything from a document that doesn't exist yet (`undefined`)
 * to one saved by an earlier version of this schema missing a field a
 * later phase added. Every field is `unknown` on purpose: this is the
 * boundary that turns "whatever Firestore handed back" into a fully-typed,
 * always-safe `UserSettings`, so every check below is a real runtime type
 * check, not a cast.
 */
export interface RawUserSettingsData {
  defaultBudgetPeriod?: unknown;
  defaultBudgetWarningThreshold?: unknown;
  defaultBudgetOverThreshold?: unknown;
  defaultAccountId?: unknown;
  defaultCategoryId?: unknown;
  notifyOnSeverity?: unknown;
  dashboardWidgets?: unknown;
}

const BUDGET_PERIODS_SET = new Set(['monthly', 'weekly', 'custom']);
const DASHBOARD_WIDGET_SET = new Set<string>(DASHBOARD_WIDGET_IDS);

/**
 * Keeps only recognized, de-duplicated widget ids, preserving whatever
 * order the document already had — an unknown id (e.g. one a since-removed
 * feature used to write) is silently dropped rather than crashing the
 * dashboard. Falls back to every widget in its default order only when the
 * field itself is missing or malformed (not an array at all); a document
 * that deliberately saved an empty array (every widget hidden) keeps it,
 * since that's a real, distinct choice from "never saved a preference."
 */
function sanitizeDashboardWidgets(raw: unknown): DashboardWidgetId[] {
  if (!Array.isArray(raw)) return [...DEFAULT_USER_SETTINGS.dashboardWidgets];
  const seen = new Set<string>();
  const result: DashboardWidgetId[] = [];
  for (const entry of raw) {
    if (typeof entry === 'string' && DASHBOARD_WIDGET_SET.has(entry) && !seen.has(entry)) {
      seen.add(entry);
      result.push(entry as DashboardWidgetId);
    }
  }
  return result;
}

/**
 * Pure merge-with-defaults logic, split out from `userSettingsService.ts`
 * (which only adds the Firestore-specific bits — `onSnapshot`, converting
 * a `Timestamp` to an ISO string) the same way Phase 35 split
 * `notificationSync.ts`'s dedup rule out of `notificationService.ts` — so
 * this, the part with actual branching logic, is unit-testable without
 * mocking Firestore at all, and the service stays a thin wrapper.
 */
export function mergeUserSettingsDefaults(
  uid: string,
  data: RawUserSettingsData | undefined,
  updatedAt: string,
): UserSettings {
  const period = data?.defaultBudgetPeriod;
  const notifyOnSeverity = data?.notifyOnSeverity as Partial<Record<InsightSeverity, boolean>> | undefined;

  return {
    userId: uid,
    defaultBudgetPeriod:
      typeof period === 'string' && BUDGET_PERIODS_SET.has(period)
        ? (period as UserSettings['defaultBudgetPeriod'])
        : DEFAULT_USER_SETTINGS.defaultBudgetPeriod,
    defaultBudgetWarningThreshold:
      typeof data?.defaultBudgetWarningThreshold === 'number'
        ? data.defaultBudgetWarningThreshold
        : DEFAULT_USER_SETTINGS.defaultBudgetWarningThreshold,
    defaultBudgetOverThreshold:
      typeof data?.defaultBudgetOverThreshold === 'number'
        ? data.defaultBudgetOverThreshold
        : DEFAULT_USER_SETTINGS.defaultBudgetOverThreshold,
    defaultAccountId: typeof data?.defaultAccountId === 'string' ? data.defaultAccountId : null,
    defaultCategoryId: typeof data?.defaultCategoryId === 'string' ? data.defaultCategoryId : null,
    notifyOnSeverity: {
      critical: notifyOnSeverity?.critical ?? DEFAULT_USER_SETTINGS.notifyOnSeverity.critical,
      warning: notifyOnSeverity?.warning ?? DEFAULT_USER_SETTINGS.notifyOnSeverity.warning,
      info: notifyOnSeverity?.info ?? DEFAULT_USER_SETTINGS.notifyOnSeverity.info,
      positive: notifyOnSeverity?.positive ?? DEFAULT_USER_SETTINGS.notifyOnSeverity.positive,
    },
    dashboardWidgets: sanitizeDashboardWidgets(data?.dashboardWidgets),
    updatedAt,
  };
}

/**
 * A saved `defaultAccountId`/`defaultCategoryId` (Phase 36) can outlive the
 * account or expense category it points at — deleting one doesn't clear
 * whichever settings still reference it, since nothing currently watches
 * for that. Every place that pre-fills a form field from one of these
 * defaults (`TransactionsPage`'s "Add" dialogs, `QuickAddTransactionDialog`)
 * must run it through this first, rather than trusting it's still valid:
 * otherwise a stale id either shows as a blank, nothing-selected `<Select>`
 * (an out-of-range MUI value) or, worse, quietly submits a transaction
 * against an account/category that's no longer there. `null` here means
 * "no usable default" — exactly like a setting that was never set.
 */
export function resolveLiveDefaultId(id: string | null, liveIds: ReadonlySet<string>): string | null {
  return id !== null && liveIds.has(id) ? id : null;
}
