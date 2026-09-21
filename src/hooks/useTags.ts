import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscribeToTags } from '../services/tagService';
import type { Tag } from '../types/tag';

/**
 * Realtime subscription to the signed-in user's tags, shared by every
 * consumer that needs them (each transaction dialog's `FormTagsInput`, the
 * Transactions table/search, and `SettingsPage`'s `TagsSection` manager) —
 * same shape as `useExpenseCategories`, minus that hook's default-seeding
 * step (there's no fixed starter set of tags the way there is for expense
 * categories; a user's tag list starts empty and grows only from what they
 * create in `TagsSection`).
 */
export function useTags() {
  const { user } = useAuth();
  const [tags, setTags] = useState<Tag[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    setTags(null);
    setError(null);
    return subscribeToTags(user.uid, setTags, setError);
    // reloadKey lets a "Try again" action force a fresh subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, reloadKey]);

  return { tags, error, reload: () => setReloadKey((k) => k + 1) };
}
