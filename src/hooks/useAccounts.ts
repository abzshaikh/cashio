import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscribeToAccounts } from '../services/accountService';
import type { Account } from '../types/account';

/**
 * Realtime subscription to the signed-in user's accounts, shared by any
 * page that only needs to *read* them — `AccountsPage` still manages its
 * own subscription directly (it also creates/edits/deletes), but Phase
 * 11's dashboard just needs the list, same idea as `useTransactions` and
 * `useExpenseCategories`.
 */
export function useAccounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    setAccounts(null);
    setError(null);
    return subscribeToAccounts(user.uid, setAccounts, setError);
    // reloadKey lets a "Try again" action force a fresh subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, reloadKey]);

  const reload = () => setReloadKey((key) => key + 1);

  return { accounts, error, reload };
}
