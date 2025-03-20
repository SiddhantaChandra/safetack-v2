import React, { createContext, useState, useEffect, useContext } from 'react';
import { useRouter, useSegments } from 'expo-router';
import supabase from '../services/SupabaseService';

// Create context
const UserContext = createContext({
  user: null,
  session: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  isGuest: false,
  setGuest: () => {}
});

// Provider component
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  // Initialize auth state
  useEffect(() => {
    // Get current session and subscribe to auth changes
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user || null);
      setLoading(false);
    });

    // Set up auth state subscriber
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user || null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Handle routing based on auth state
  useEffect(() => {
    if (loading) return;

    // Get the first segment of the current path
    const inAuthGroup = segments[0] === 'auth';

    // If the user is not signed in and not a guest and not on auth page, redirect to auth
    if (!user && !isGuest && !inAuthGroup) {
      router.replace('/auth');
    } else if ((user || isGuest) && inAuthGroup) {
      // If the user is signed in or guest but on auth page, redirect to home
      router.replace('/');
    }
  }, [user, loading, segments, isGuest]);

  // Sign in with email and password
  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error };
    }
  };

  // Sign up with email and password
  const signUp = async (email, password, name) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name }
        }
      });
      
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      return { success: false, error };
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Reset guest mode too
      setIsGuest(false);
      
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  };

  // Set guest mode
  const setGuest = (value) => {
    setIsGuest(!!value);
  };

  // Context value
  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    isGuest,
    setGuest
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

// Custom hook
export const useUser = () => useContext(UserContext);

export default UserContext;