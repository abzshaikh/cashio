import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscribeToDebtPayments } from '../services/debtService';
import type { DebtPayment } from '../types/debtPayment';

/**
 * Realtime, read-only subscription to every payment the signed-in user has
 * recorded across all their debts — the read-only sibling `useDebts` gets,
 * needed by Phase 24's Insights page (via `debtCalculations.ts`'s
 * `getDebtProgress`) alongside the debts themselves to know each debt's
 * outstanding balance and next due date.
 */
export function useDebtPayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<DebtPayment[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    setPayments(null);
    setError(null);
    return subscribeToDebtPayments(user.uid, setPayments, setError);
    // reloadKey lets a "Try again" action force a fresh subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, reloadKey]);

  const reload = () => setReloadKey((key) => key + 1);

  return { payments, error, reload };
}
