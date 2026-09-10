'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
}

const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || '').toLowerCase().trim();

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAdminClaim, setHasAdminClaim] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          // Forcing a refresh is a network call, which offline can only fail
          // — after a delay the user spends looking at a spinner. The claims
          // already on the device are good enough until the connection returns.
          const tokenResult = await firebaseUser.getIdTokenResult(navigator.onLine);
          setHasAdminClaim(!!tokenResult.claims.admin);
        } catch {
          setHasAdminClaim(false);
        }
      } else {
        setHasAdminClaim(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (name: string, email: string, password: string): Promise<User> => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: name });
    // Send email verification to the newly registered user
    try {
      await sendEmailVerification(credential.user);
    } catch (verErr) {
      console.warn('sendEmailVerification non-fatal error during signup:', verErr);
    }
    return credential.user;
  };

  const logout = async () => {
    await signOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const resendVerification = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('No user is currently authenticated.');
    }
    await sendEmailVerification(currentUser);
  };

  // Derive isAdmin from custom claim OR email match
  const isEmailAdmin = !!user && !!ADMIN_EMAIL && user.email?.toLowerCase().trim() === ADMIN_EMAIL;
  const isAdmin = hasAdminClaim || isEmailAdmin;

  return (
    <AuthContext.Provider
      value={{ user, loading, isAdmin, login, signup, logout, resetPassword, resendVerification }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

