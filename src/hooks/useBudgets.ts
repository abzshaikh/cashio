import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscribeToBudgets } from '../services/budgetService';
import type { Budget } from '../types/budget';

/**
 * Realtime subscription to the signed-in user's budgets, shared by any page
 * that only needs to *read* them — `BudgetsPage` still manages its own
 * subscription directly (it also creates/edits/deletes), but Phase 11's
 * dashboard just needs the list, same idea as `useAccounts`/
 * `useTransactions`/`useExpenseCategories`.
 */
export function useBudgets() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    setBudgets(null);
    setError(null);
    return subscribeToBudgets(user.uid, setBudgets, setError);
    // reloadKey lets a "Try again" action force a fresh subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, reloadKey]);

  const reload = () => setReloadKey((key) => key + 1);

  return { budgets, error, reload };
}
