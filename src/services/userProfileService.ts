import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { DEFAULT_CURRENCY_CODE } from '../config/currencies';
import { getBrowserTimezone } from '../config/timezones';
import type { UpdatableUserProfileFields, UserProfile } from '../types/user';

function userDocRef(uid: string) {
  return doc(db, 'users', uid);
}

interface NewProfileInput {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
}

/** Creates the Firestore profile document for a newly registered user. */
export async function createUserProfile({
  uid,
  firstName,
  lastName,
  email,
}: NewProfileInput): Promise<void> {
  await setDoc(userDocRef(uid), {
    uid,
    firstName,
    lastName,
    email,
    photoURL: null,
    currency: DEFAULT_CURRENCY_CODE,
    country: '',
    timezone: getBrowserTimezone(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** Reads a user's profile document. Returns null if it doesn't exist yet. */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(userDocRef(uid));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  return {
    uid,
    firstName: data.firstName ?? '',
    lastName: data.lastName ?? '',
    email: data.email ?? '',
    photoURL: data.photoURL ?? null,
    currency: data.currency ?? DEFAULT_CURRENCY_CODE,
    country: data.country ?? '',
    timezone: data.timezone ?? getBrowserTimezone(),
    createdAt: data.createdAt?.toDate?.().toISOString() ?? '',
    updatedAt: data.updatedAt?.toDate?.().toISOString() ?? '',
  };
}

export async function updateUserProfile(
  uid: string,
  fields: Partial<UpdatableUserProfileFields>,
): Promise<void> {
  await updateDoc(userDocRef(uid), { ...fields, updatedAt: serverTimestamp() });
}
