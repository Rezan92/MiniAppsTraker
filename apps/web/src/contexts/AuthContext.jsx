import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null); // This is Supabase user
  const [userData, setUserData] = useState(null); // This is backend user (tenant_id, role)
  const [loading, setLoading] = useState(true);

  const fetchBackendUser = async (currentSession) => {
    if (!currentSession) {
      setUserData(null);
      return;
    }
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${currentSession.access_token}` }
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch backend context');
      }
      
      const json = await res.json();
      setUserData(json.data);
    } catch (err) {
      console.error("AuthContext fetchBackendUser error:", err);
      // Fallback: Clear session to prevent zombie state
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setUserData(null);
    }
  };

  const initAuth = async () => {
    const { data: { session: initSession } } = await supabase.auth.getSession();
    setSession(initSession);
    setUser(initSession?.user ?? null);
    
    if (initSession) {
      await fetchBackendUser(initSession);
    }
    setLoading(false);
  };

  useEffect(() => {
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession && newSession.access_token !== session?.access_token) {
        await fetchBackendUser(newSession);
      } else if (!newSession) {
        setUserData(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    return supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  const signInWithEmail = async (email, password) => {
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signUpWithEmail = async (email, password) => {
    return supabase.auth.signUp({ email, password });
  };

  const resetPassword = async (email) => {
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
  };

  const signOut = async () => {
    setUserData(null);
    return supabase.auth.signOut();
  };

  // Helper to force a refetch (e.g. after onboarding)
  const refreshUserData = async () => {
    if (session) {
      await fetchBackendUser(session);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, userData, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword, signOut, refreshUserData }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
