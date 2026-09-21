import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import { subscribeToUserSettings, saveUserSettings } from '../services/userSettingsService';
import { DEFAULT_USER_SETTINGS } from '../types/userSettings';
import type { UpdatableUserSettingsFields, UserSettings } from '../types/userSettings';

function defaultsFor(uid: string): UserSettings {
  return { ...DEFAULT_USER_SETTINGS, userId: uid, updatedAt: '' };
}

interface SettingsContextValue {
  /** Always a fully-populated object — defaults before the first
   * Firestore read resolves and for a user who has never saved settings,
   * exactly like `subscribeToUserSettings`'s own guarantee. Consumers
   * never need to null-check this. */
  settings: UserSettings;
  /** True only until the first snapshot (or its absence) has been
   * observed — `settings` is already usable during this window, this is
   * for a page that wants to avoid a flash of default values. */
  loading: boolean;
  error: Error | null;
  updateSettings: (fields: UpdatableUserSettingsFields) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

/**
 * Phase 36: mounted once, near the root (inside `AuthProvider`, since it
 * needs the signed-in user's UID), so every consumer — the Settings page's
 * own form, `useNotificationSync`'s severity filter, `BudgetsPage`'s and
 * `TransactionsPage`'s "Add" defaults — shares one subscription rather
 * than each re-reading `settings/{uid}` independently. Same reasoning as
 * `AuthContext` centralizing the profile document.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // Only ever holds a *subscribed* document's data — the signed-out case
  // is derived below rather than written here, so signing out never needs
  // an effect to reset this state (see the lint-flagged pattern this
  // replaced: setting state synchronously in an effect just to mirror
  // something already derivable from `user` during render).
  const [subscribed, setSubscribed] = useState<UserSettings | null>(null);
  const [subscribedLoading, setSubscribedLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) return;
    // Both callbacks below run asynchronously (Firestore always delivers
    // `onSnapshot`'s first event on a later tick, never synchronously
    // during subscribe), so — unlike the "no user" case this replaced —
    // there's no redundant same-tick render for oxlint's
    // `set-state-in-effect` rule to flag here; this really is "wait for
    // an external system, then update," the exact case that rule exists
    // to allow.
    const unsubscribe = subscribeToUserSettings(
      user.uid,
      (loaded) => {
        setSubscribed(loaded);
        setSubscribedLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setSubscribedLoading(false);
      },
    );
    return unsubscribe;
  }, [user]);

  const updateSettings = useCallback(
    async (fields: UpdatableUserSettingsFields) => {
      if (!user) throw new Error('Not signed in');
      await saveUserSettings(user.uid, fields);
      // Optimistic local update — the realtime subscription above will
      // confirm this shortly after with a server-stamped `updatedAt`,
      // same pattern `AuthContext.updateProfile` already uses.
      setSubscribed((prev) => ({ ...(prev ?? defaultsFor(user.uid)), ...fields }));
    },
    [user],
  );

  const settings = user ? (subscribed ?? defaultsFor(user.uid)) : defaultsFor('');
  const loading = user ? subscribedLoading : false;

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, loading, error, updateSettings }),
    [settings, loading, error, updateSettings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}
