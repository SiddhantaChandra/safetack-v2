import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { useRouter, useSegments } from 'expo-router';
import supabase from '../services/SupabaseService';

export interface AuthResult {
  success: boolean;
  data?: any;
  error?: any;
}

export interface User {
  id: string;
  email?: string;
  identities?: any[];
  // Add any other user properties you need
}

export interface Session {
  user: User;
  // Add other session properties as needed
}

interface UserContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, name: string) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
  isGuest: boolean;
  setGuest: (value: boolean) => void;
}

// Create context with default values
const UserContext = createContext<UserContextType>({
  user: null,
  session: null,
  loading: true,
  signIn: async () => ({ success: false }),
  signUp: async () => ({ success: false }),
  signOut: async () => ({ success: false }),
  isGuest: false,
  setGuest: () => {}
});

interface UserProviderProps {
  children: ReactNode;
}

// Provider component
export const UserProvider = ({ children }: UserProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isGuest, setIsGuest] = useState<boolean>(false);
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
    const inAuthGroup = segments[0] === '(auth)';

    // If the user is not signed in and not a guest and not on auth page, redirect to auth
    if (!user && !isGuest && !inAuthGroup) {
      router.replace('/(auth)');
    } else if ((user || isGuest) && inAuthGroup) {
      // If the user is signed in or guest but on auth page, redirect to home
      router.replace('/');
    }
  }, [user, loading, segments, isGuest, router]);

  // Sign in with email and password
  const signIn = async (email: string, password: string): Promise<AuthResult> => {
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
  const signUp = async (email: string, password: string, name: string): Promise<AuthResult> => {
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
  const signOut = async (): Promise<AuthResult> => {
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
  const setGuest = (value: boolean): void => {
    setIsGuest(!!value);
  };

  // Context value
  const value: UserContextType = {
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