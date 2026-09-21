import { doc, onSnapshot, setDoc, serverTimestamp, type DocumentData } from 'firebase/firestore';
import { db } from '../firebase/config';
import { toDate } from '../utils/formatDate';
import { mergeUserSettingsDefaults } from '../utils/userSettingsDefaults';
import type { UpdatableUserSettingsFields, UserSettings } from '../types/userSettings';

function settingsDocRef(uid: string) {
  return doc(db, 'settings', uid);
}

function mapSettingsDoc(uid: string, data: DocumentData | undefined): UserSettings {
  return mergeUserSettingsDefaults(uid, data, toDate(data?.updatedAt)?.toISOString() ?? '');
}

/**
 * Realtime subscription to the signed-in user's settings document.
 * Unlike `createUserScopedCollection`'s subscriptions (a list that starts
 * empty), this always delivers a fully-populated `UserSettings` —
 * `mergeUserSettingsDefaults` backfills defaults whether the document
 * exists with some fields, or doesn't exist at all yet. See that
 * function's own doc comment for why the default-filling logic itself
 * lives in `utils/` rather than here.
 */
export function subscribeToUserSettings(
  uid: string,
  onData: (settings: UserSettings) => void,
  onError: (error: Error) => void,
): () => void {
  return onSnapshot(
    settingsDocRef(uid),
    (snapshot) => onData(mapSettingsDoc(uid, snapshot.exists() ? snapshot.data() : undefined)),
    onError,
  );
}

/**
 * Saves the user's complete settings in one write. Always the *full*
 * field set (never a partial patch) — `SettingsContext`'s `updateSettings`
 * always calls this with every field already merged in, the same
 * "the form always submits the whole entity" convention every other
 * form in this app follows (`updateUserProfile` is the one exception,
 * and even that only patches an already-created document — this
 * document may not exist yet for a user who saves settings for the very
 * first time, so `setDoc` rather than `updateDoc`). `merge: true` is
 * belt-and-suspenders since every field is always present anyway.
 */
export async function saveUserSettings(uid: string, fields: UpdatableUserSettingsFields): Promise<void> {
  await setDoc(
    settingsDocRef(uid),
    { ...fields, userId: uid, updatedAt: serverTimestamp() },
    { merge: true },
  );
}
