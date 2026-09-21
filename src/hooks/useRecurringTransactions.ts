import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscribeToRecurringTransactions } from '../services/recurringTransactionService';
import type { RecurringTransaction } from '../types/recurringTransaction';

/**
 * Realtime subscription to the signed-in user's recurring rules, shared by
 * `RecurringTransactionsPage` (which also creates/edits/deletes/pauses) and
 * `AppLayout`'s `useRecurringTransactionGenerator` (which only needs to
 * *read* them to check for due occurrences) — same shape as
 * `useBudgets`/`useTransactions`/`useAccounts`.
 */
export function useRecurringTransactions() {
  const { user } = useAuth();
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[] | null>(
    null,
  );
  const [error, setError] = useState<Error | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    setRecurringTransactions(null);
    setError(null);
    return subscribeToRecurringTransactions(user.uid, setRecurringTransactions, setError);
    // reloadKey lets a "Try again" action force a fresh subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, reloadKey]);

  const reload = () => setReloadKey((key) => key + 1);

  return { recurringTransactions, error, reload };
}
