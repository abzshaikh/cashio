import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscribeToNotifications } from '../services/notificationService';
import type { AppNotification } from '../types/notification';

/**
 * Realtime, read-only subscription to the signed-in user's notifications —
 * same shape as `useDebts`/`useBudgets`/`useTransactions`. Used by both
 * `NotificationBell` (to render the list/badge) and `useNotificationSync`
 * (to see what's already unread before creating anything new).
 */
export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    setNotifications(null);
    setError(null);
    return subscribeToNotifications(user.uid, setNotifications, setError);
    // reloadKey lets a "Try again" action force a fresh subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, reloadKey]);

  const reload = () => setReloadKey((key) => key + 1);

  return { notifications, error, reload };
}
