import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null); // This is Supabase user
  const [userData, setUserData] = useState(null); // This is backend user (tenant_id, role)
  const [loading, setLoading] = useState(true);

  // Mutable refs to track token and ongoing requests without stale closure traps
  const currentTokenRef = useRef(null);
  const isFetchingRef = useRef(false);

  const fetchBackendUser = async (currentSession) => {
    if (!currentSession?.access_token) {
      setUserData(null);
      currentTokenRef.current = null;
      return;
    }

    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${currentSession.access_token}` }
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          try { await supabase.auth.signOut({ scope: 'local' }); } catch (_) {}
          setSession(null);
          setUser(null);
          setUserData(null);
          currentTokenRef.current = null;
          return;
        }
        if (res.status === 429) {
          console.warn("AuthContext: Rate limit reached on /api/auth/me");
          return;
        }
        throw new Error('Failed to fetch backend context');
      }
      
      const json = await res.json();
      setUserData(json.data);
      currentTokenRef.current = currentSession.access_token;
    } catch (err) {
      console.error("AuthContext fetchBackendUser error:", err);
    } finally {
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session: initSession } } = await supabase.auth.getSession();
      setSession(initSession);
      setUser(initSession?.user ?? null);
      
      if (initSession) {
        currentTokenRef.current = initSession.access_token;
        await fetchBackendUser(initSession);
      }
      setLoading(false);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession) {
        // Only fetch backend user when the access token actually changes (e.g. login or token refresh)
        if (newSession.access_token !== currentTokenRef.current) {
          currentTokenRef.current = newSession.access_token;
          await fetchBackendUser(newSession);
        }
      } else {
        currentTokenRef.current = null;
        setUserData(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async (redirectTo) => {
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectTo || window.location.href }
    });
  };

  const signInWithEmail = async (email, password) => {
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signUpWithEmail = async (email, password, metadata = {}) => {
    return supabase.auth.signUp({ 
      email, 
      password,
      options: { data: metadata }
    });
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
