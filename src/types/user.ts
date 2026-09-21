/**
 * The app's user profile document, stored at `users/{uid}` in Firestore
 * (see PHASE_LOG.md's data model). Distinct from Firebase Auth's own user
 * object — this holds app-specific preferences Firebase Auth has no place
 * for (currency, country, timezone, …).
 */
export interface UserProfile {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  photoURL: string | null;
  /** ISO 4217 currency code, e.g. "INR". */
  currency: string;
  country: string;
  /** IANA timezone identifier, e.g. "Asia/Kolkata". */
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export type UpdatableUserProfileFields = Pick<
  UserProfile,
  'firstName' | 'lastName' | 'photoURL' | 'currency' | 'country' | 'timezone'
>;
