import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscribeToTransactions } from '../services/transactionService';
import type { Transaction } from '../types/transaction';

/**
 * Realtime subscription to the signed-in user's full transaction ledger.
 * `TransactionsPage` still manages its own subscription directly (it needs
 * to react to its own mutations too), but Phase 10's budget-vs-actual
 * comparison and later phases (Phase 11's dashboard, Phase 12's reports)
 * only need to *read* the ledger — this hook is the one place that does,
 * following the same shape as `useExpenseCategories`.
 */
export function useTransactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    setTransactions(null);
    setError(null);
    return subscribeToTransactions(user.uid, setTransactions, setError);
    // reloadKey lets a "Try again" action force a fresh subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, reloadKey]);

  const reload = () => setReloadKey((key) => key + 1);

  return { transactions, error, reload };
}
