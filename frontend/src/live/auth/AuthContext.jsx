import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onIdTokenChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '../../firebase';

const VALID_ROLES = new Set(['admin', 'mp', 'agency', 'public']);

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [claims, setClaims] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setClaims(null);
        setLoading(false);
        return;
      }
      const tokenResult = await firebaseUser.getIdTokenResult();
      setUser(firebaseUser);
      setClaims(tokenResult.claims);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function login(email, password) {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(friendlyAuthError(err));
      throw err;
    }
  }

  async function signupPublic(email, password) {
    setError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(friendlyAuthError(err));
      throw err;
    }
  }

  async function logout() {
    await signOut(auth);
  }

  const role = claims && VALID_ROLES.has(claims.role) ? claims.role : (user ? 'public' : null);

  const value = {
    user,
    claims,
    role,
    agencyId: claims?.agency_id || null,
    state: claims?.state || null,
    loading,
    error,
    setError,
    login,
    signupPublic,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

function friendlyAuthError(err) {
  const code = err?.code || '';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
    return 'Incorrect email or password.';
  }
  if (code.includes('email-already-in-use')) return 'An account with that email already exists.';
  if (code.includes('weak-password')) return 'Password must be at least 6 characters.';
  if (code.includes('invalid-email')) return 'Enter a valid email address.';
  if (code.includes('too-many-requests')) return 'Too many attempts. Please wait and try again.';
  return 'Something went wrong. Please try again.';
}
