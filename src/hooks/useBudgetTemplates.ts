import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscribeToBudgetTemplates } from '../services/budgetTemplateService';
import type { BudgetTemplate } from '../types/budgetTemplate';

/**
 * Realtime subscription to the signed-in user's saved budget templates —
 * same shape as `useTags`. `BudgetsPage` still manages budgets' own
 * subscription directly (it mutates them), but templates are read-only
 * here; creating/deleting one is a one-shot call from
 * `BudgetTemplatesSection`, not something this hook needs to expose.
 */
export function useBudgetTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<BudgetTemplate[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    setTemplates(null);
    setError(null);
    return subscribeToBudgetTemplates(user.uid, setTemplates, setError);
    // reloadKey lets a "Try again" action force a fresh subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, reloadKey]);

  return { templates, error, reload: () => setReloadKey((k) => k + 1) };
}
