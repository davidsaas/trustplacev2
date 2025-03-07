"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { Database } from "@/lib/supabase-types";

type UserDetails = Database["public"]["Tables"]["users"]["Row"] | null;

interface AuthContextType {
  user: User | null;
  userDetails: UserDetails;
  isPremium: boolean;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  refreshUserDetails: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Get premium status based on user details
  const isPremium = Boolean(
    userDetails?.is_premium && 
    userDetails?.premium_until && 
    new Date(userDetails.premium_until) > new Date()
  );

  // Fetch user details from our users table
  const fetchUserDetails = async (userId: string) => {
    try {
      // Try to get existing user details
      let { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.log("Initial fetch error:", error);
        
        if (error.code === 'PGRST116') { // No rows returned
          // Try to create the user record
          const { data: authUser } = await supabase.auth.getUser();
          if (!authUser?.user?.email) throw new Error("No authenticated user found");

          console.log("Creating user record for:", { userId, email: authUser.user.email });

          // Retry the insert with the current user's auth context
          const insertResult = await supabase
            .from("users")
            .insert({
              id: userId,
              email: authUser.user.email,
            })
            .select()
            .single();

          if (insertResult.error) {
            console.error("Insert error details:", insertResult.error);
            throw new Error(`Failed to create user record: ${insertResult.error.message}`);
          }

          data = insertResult.data;
        } else {
          throw error;
        }
      }
      
      return data;
    } catch (error: any) {
      console.error("Error in fetchUserDetails:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      return null;
    }
  };

  // Refresh user details (useful after updating premium status)
  const refreshUserDetails = async () => {
    if (user) {
      const details = await fetchUserDetails(user.id);
      setUserDetails(details);
    }
  };

  // Initialize auth state
  useEffect(() => {
    const initialize = async () => {
      try {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUser(session.user);
          const details = await fetchUserDetails(session.user.id);
          setUserDetails(details);
        }
      } catch (error) {
        console.error("Error during auth initialization:", error);
      } finally {
        setLoading(false);
      }
    };

    initialize();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          const details = await fetchUserDetails(session.user.id);
          setUserDetails(details);
        } else {
          setUser(null);
          setUserDetails(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sign in with email/password
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      router.push("/dashboard");
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Sign up with email/password
  const signUp = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
      
      router.push("/login?message=Check your email to confirm your account");
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) throw error;
    } catch (error: any) {
      setError(error.message);
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      router.push("/");
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    userDetails,
    isPremium,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    refreshUserDetails,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}; 