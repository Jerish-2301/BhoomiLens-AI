// Auth context — wraps the entire app to expose the current Firebase user
// Uses onAuthStateChanged so the UI always reflects the live auth state.

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  type User,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsub;
  }, []);

  async function login(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function register(email: string, password: string, name: string) {
    const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);
    // Update Firebase Auth display name
    await updateProfile(newUser, { displayName: name });
    // Create user document in Firestore
    await setDoc(doc(db, 'users', newUser.uid), {
      id: newUser.uid,
      email,
      name,
      role: 'PUBLIC',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  async function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const { user: googleUser } = await signInWithPopup(auth, provider);
    // Create Firestore user doc on first sign-in (setDoc merges, so safe to call every time)
    await setDoc(doc(db, 'users', googleUser.uid), {
      id: googleUser.uid,
      email: googleUser.email,
      name: googleUser.displayName,
      role: 'PUBLIC',
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }

  async function logout() {
    await signOut(auth);
  }

  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}
