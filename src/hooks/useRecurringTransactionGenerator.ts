import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useRecurringTransactions } from './useRecurringTransactions';
import { generateDueOccurrences } from '../services/recurringTransactionService';

/**
 * Runs Phase 14's recurring-generation engine once per app session:
 * whenever the signed-in user's recurring rules have loaded, checks every
 * active one for due occurrences and creates the corresponding real ledger
 * transactions (see `generateDueOccurrences`'s doc comment for why this is
 * a client-driven, best-effort check rather than a server-side scheduled
 * job). Mounted once in `AppLayout` so it runs regardless of which page the
 * user lands on first — a recurring salary entry should show up on the
 * Dashboard or Transactions page without requiring a visit to the Recurring
 * Transactions page specifically.
 *
 * Guarded by a ref (same one-shot-per-mount pattern `useExpenseCategories`
 * uses for its default-category seeding) so a re-render — or the
 * subscription simply delivering the same list again — never re-runs the
 * check and risks generating something twice. A fresh check does happen on
 * a full page reload/new session, which is exactly when it should: that is
 * when real time has actually passed and new occurrences might be due.
 */
export function useRecurringTransactionGenerator(): void {
  const { user } = useAuth();
  const { error: notifyError, success } = useNotification();
  const { recurringTransactions } = useRecurringTransactions();
  const hasChecked = useRef(false);

  useEffect(() => {
    if (!user || recurringTransactions === null || hasChecked.current) return;
    hasChecked.current = true;

    generateDueOccurrences(user.uid, recurringTransactions)
      .then((generatedCount) => {
        if (generatedCount > 0) {
          success(
            generatedCount === 1
              ? '1 recurring transaction was added automatically.'
              : `${generatedCount} recurring transactions were added automatically.`,
          );
        }
      })
      .catch((err: unknown) => {
        notifyError(
          err instanceof Error ? err.message : 'Failed to check recurring transactions.',
        );
      });
  }, [user, recurringTransactions, notifyError, success]);
}
