import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile as updateFirebaseProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '../firebase/config';
import {
  createUserProfile,
  getUserProfile,
  updateUserProfile,
} from '../services/userProfileService';
import type { UpdatableUserProfileFields, UserProfile } from '../types/user';

interface AuthContextValue {
  /** The raw Firebase Auth user, or null when signed out. */
  user: FirebaseUser | null;
  /** The app's Firestore profile document for the signed-in user. */
  profile: UserProfile | null;
  /** True until the initial auth state has resolved — avoids a login flash. */
  initializing: boolean;
  /** True while the Firestore profile document is (re)loading. */
  profileLoading: boolean;
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  register: (
    firstName: string,
    lastName: string,
    email: string,
    password: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (fields: Partial<UpdatableUserProfileFields>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        setProfileLoading(true);
        try {
          const loaded = await getUserProfile(firebaseUser.uid);
          setProfile(loaded);
        } finally {
          setProfileLoading(false);
        }
      } else {
        setProfile(null);
      }
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  const login = useCallback(async (email: string, password: string, rememberMe: boolean) => {
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const register = useCallback(
    async (firstName: string, lastName: string, email: string, password: string) => {
      await setPersistence(auth, browserLocalPersistence);
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateFirebaseProfile(credential.user, {
        displayName: `${firstName} ${lastName}`.trim(),
      });
      await createUserProfile({ uid: credential.user.uid, firstName, lastName, email });
      const loaded = await getUserProfile(credential.user.uid);
      setProfile(loaded);
    },
    [],
  );

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  }, []);

  const updateProfileFields = useCallback(
    async (fields: Partial<UpdatableUserProfileFields>) => {
      if (!user) throw new Error('Not signed in');
      await updateUserProfile(user.uid, fields);
      if (fields.firstName !== undefined || fields.lastName !== undefined || fields.photoURL !== undefined) {
        await updateFirebaseProfile(user, {
          displayName:
            fields.firstName !== undefined || fields.lastName !== undefined
              ? `${fields.firstName ?? profile?.firstName ?? ''} ${fields.lastName ?? profile?.lastName ?? ''}`.trim()
              : undefined,
          photoURL: fields.photoURL !== undefined ? fields.photoURL : undefined,
        });
      }
      setProfile((prev) => (prev ? { ...prev, ...fields } : prev));
    },
    [user, profile],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      initializing,
      profileLoading,
      login,
      register,
      logout,
      resetPassword,
      updateProfile: updateProfileFields,
    }),
    [user, profile, initializing, profileLoading, login, register, logout, resetPassword, updateProfileFields],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
