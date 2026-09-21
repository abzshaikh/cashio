import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useTransactions } from './useTransactions';
import { useBudgets } from './useBudgets';
import { useExpenseCategories } from './useExpenseCategories';
import { useDebts } from './useDebts';
import { useDebtPayments } from './useDebtPayments';
import { useRecurringTransactions } from './useRecurringTransactions';
import { useNotifications } from './useNotifications';
import { generateInsights } from '../utils/insightsEngine';
import { selectNewNotifications } from '../utils/notificationSync';
import { createNotification } from '../services/notificationService';

/**
 * Phase 35: runs Phase 24's insight rules once per app session and turns
 * any newly-firing condition into a persisted, unread notification — the
 * durable counterpart to `InsightsPage`'s own always-fresh, never-stored
 * `generateInsights` call. Mounted once in `AppLayout`, mirroring
 * `useRecurringTransactionGenerator`'s exact "runs regardless of which page
 * loads first, guarded by a ref so it never re-fires on a re-render" shape
 * — see that hook's own doc comment for why a one-shot-per-mount check is
 * the right granularity (a fresh check on every new session/reload is
 * exactly when something new might actually be true).
 *
 * Needs the same six data sources `InsightsPage` reads (transactions,
 * budgets, categories, debts, debt payments, recurring transactions) plus
 * the user's own existing notifications, so this hook — like
 * `InsightsPage` — subscribes to all of them directly rather than waiting
 * for whichever page the user happens to visit.
 *
 * Phase 36 adds one more gate: `settings.notifyOnSeverity` (per-severity
 * on/off, defaulting to all-on) is applied *before* `selectNewNotifications`
 * ever sees an insight whose severity the user turned off — an insight
 * filtered out here never creates a notification, but still shows on
 * `InsightsPage` exactly as before (that page reads `generateInsights`
 * directly and doesn't consult these settings at all). The sync also
 * waits for `SettingsContext`'s `loading` to clear, the same way it
 * already waits for every other data source — syncing against the
 * momentary default (all severities on) before the user's real saved
 * choice has loaded back from Firestore would be a real, if narrow, race.
 */
export function useNotificationSync(): void {
  const { user, profile } = useAuth();
  const { settings, loading: settingsLoading } = useSettings();
  const { transactions } = useTransactions();
  const { budgets } = useBudgets();
  const { categories } = useExpenseCategories();
  const { debts } = useDebts();
  const { payments: debtPayments } = useDebtPayments();
  const { recurringTransactions } = useRecurringTransactions();
  const { notifications } = useNotifications();
  const hasSynced = useRef(false);

  useEffect(() => {
    if (
      !user ||
      hasSynced.current ||
      settingsLoading ||
      transactions === null ||
      budgets === null ||
      categories === null ||
      debts === null ||
      debtPayments === null ||
      recurringTransactions === null ||
      notifications === null
    ) {
      return;
    }
    hasSynced.current = true;

    const insights = generateInsights({
      transactions,
      budgets,
      categories,
      debts,
      debtPayments,
      recurringTransactions,
      currency: profile?.currency ?? 'INR',
    }).filter((insight) => settings.notifyOnSeverity[insight.severity]);
    const toCreate = selectNewNotifications(insights, notifications);
    // Best-effort: a failed write here shouldn't surface as a user-facing
    // error toast on every page load — the worst case is simply that a
    // notification doesn't appear until the next session picks it up again.
    toCreate.forEach((input) => {
      createNotification(user.uid, input).catch(() => {
        /* best-effort, see comment above */
      });
    });
  }, [
    user,
    profile,
    settings,
    settingsLoading,
    transactions,
    budgets,
    categories,
    debts,
    debtPayments,
    recurringTransactions,
    notifications,
  ]);
}
