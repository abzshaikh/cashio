import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscribeToDebts } from '../services/debtService';
import type { Debt } from '../types/debt';

/**
 * Realtime, read-only subscription to the signed-in user's debts — same
 * shape as `useBudgets`/`useTransactions`/`useAccounts`. `DebtsPage` still
 * manages its own subscription directly (it also creates/edits/deletes),
 * but Phase 24's Insights page just needs the list to check upcoming
 * payment due dates.
 */
export function useDebts() {
  const { user } = useAuth();
  const [debts, setDebts] = useState<Debt[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    setDebts(null);
    setError(null);
    return subscribeToDebts(user.uid, setDebts, setError);
    // reloadKey lets a "Try again" action force a fresh subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, reloadKey]);

  const reload = () => setReloadKey((key) => key + 1);

  return { debts, error, reload };
}
