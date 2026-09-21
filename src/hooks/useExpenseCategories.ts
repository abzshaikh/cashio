import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { ensureDefaultExpenseCategories, subscribeToExpenseCategories } from '../services/categoryService';
import type { ExpenseCategoryRecord } from '../types/category';

/**
 * Realtime subscription to the signed-in user's expense categories, shared
 * by every page that needs them (`TransactionsPage`'s expense dialog and
 * table, and `SettingsPage`'s `CategoriesSection` manager) so there is one
 * place that both loads them and seeds the 9 defaults — not two copies of
 * that logic that could drift. Seeding is attempted once per mount
 * (whichever of these pages the user opens first), and is idempotent
 * (`ensureDefaultExpenseCategories` only creates what's missing), so it
 * doesn't matter which page gets there first or whether both are used in
 * the same session.
 */
export function useExpenseCategories() {
  const { user } = useAuth();
  const { error: notifyError } = useNotification();

  const [categories, setCategories] = useState<ExpenseCategoryRecord[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const seedAttempted = useRef(false);

  useEffect(() => {
    if (!user) return;
    setCategories(null);
    setError(null);
    return subscribeToExpenseCategories(user.uid, setCategories, setError);
    // reloadKey lets a "Try again" action force a fresh subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, reloadKey]);

  useEffect(() => {
    if (!user || categories === null || seedAttempted.current) return;
    seedAttempted.current = true;
    ensureDefaultExpenseCategories(
      user.uid,
      categories.map((c) => c.slug),
    ).catch((err) => {
      notifyError(err instanceof Error ? err.message : 'Failed to set up default categories.');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, categories]);

  return { categories, error, reload: () => setReloadKey((k) => k + 1) };
}
