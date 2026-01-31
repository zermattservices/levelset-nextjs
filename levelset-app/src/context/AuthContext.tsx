/**
 * AuthContext
 * Manages Supabase Auth for the mobile app
 * Supports email/password and Google OAuth sign-in
 * Syncs with the main dashboard authentication
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase, getOAuthRedirectUrl } from "../lib/supabase";

// Enable web browser redirect handling
WebBrowser.maybeCompleteAuthSession();

// App user data from app_users table (matches dashboard)
export interface AppUser {
  id: string;
  email: string;
  auth_user_id: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  role?: string;
  org_id?: string;
  location_id?: string;
  phone?: string;
  employee_id?: string;
  hire_date?: string;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
  profile_image?: string;
}

interface AuthContextType {
  // Auth state
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  appUser: AppUser | null;
  session: Session | null;
  error: string | null;

  // Computed properties
  email: string;
  fullName: string;
  profileImage: string;
  role: string;
  orgId: string;
  locationId: string;

  // Auth actions
  signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = user !== null && appUser !== null;

  // Fetch app_users data when auth user changes
  const fetchAppUserData = useCallback(async (authUser: User | null) => {
    if (!authUser?.id) {
      setAppUser(null);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from("app_users")
        .select("*")
        .eq("auth_user_id", authUser.id)
        .single();

      if (fetchError) {
        console.error("[Auth] Error fetching app user data:", fetchError);
        setAppUser(null);
        return;
      }

      // If user has a Google profile image and app_user doesn't have one, save it
      const googleAvatar = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture;
      if (googleAvatar && !data.profile_image) {
        const { error: updateError } = await supabase
          .from("app_users")
          .update({ profile_image: googleAvatar })
          .eq("id", data.id);

        if (!updateError) {
          data.profile_image = googleAvatar;
        }
      }

      setAppUser(data);
    } catch (err) {
      console.error("[Auth] Error fetching app user data:", err);
      setAppUser(null);
    }
  }, []);

  // Initialize auth and listen for changes
  useEffect(() => {
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log("[Auth] onAuthStateChange:", event, "hasSession:", !!currentSession);

        if (event === "SIGNED_OUT") {
          setUser(null);
          setAppUser(null);
          setSession(null);
          setIsLoading(false);
        } else if (["SIGNED_IN", "INITIAL_SESSION", "TOKEN_REFRESHED"].includes(event) && currentSession) {
          setUser(currentSession.user);
          setSession(currentSession);
          await fetchAppUserData(currentSession.user);
          setIsLoading(false);
        }
      }
    );

    // Check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session: existingSession } } = await supabase.auth.getSession();

        if (existingSession) {
          console.log("[Auth] Found existing session");
          setUser(existingSession.user);
          setSession(existingSession);
          await fetchAppUserData(existingSession.user);
        }
      } catch (err) {
        console.error("[Auth] Error initializing auth:", err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchAppUserData]);

  // Handle deep link for OAuth callback
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      if (url.includes("auth/callback")) {
        // Extract tokens from URL
        const params = new URLSearchParams(url.split("#")[1] || url.split("?")[1] || "");
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error("[Auth] Error setting session from callback:", sessionError);
            setError("Failed to complete sign in. Please try again.");
          }
        }
      }
    };

    // Listen for deep links
    const subscription = Linking.addEventListener("url", handleDeepLink);

    // Check if app was opened with a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Sign in with email and password
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error("[Auth] Email sign in failed:", signInError);
        setError(signInError.message);
        setIsLoading(false);
        return { success: false, error: signInError.message };
      }

      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Sign in failed";
      console.error("[Auth] Email sign in error:", err);
      setError(errorMessage);
      setIsLoading(false);
      return { success: false, error: errorMessage };
    }
  }, []);

  // Sign in with Google OAuth
  const signInWithGoogle = useCallback(async () => {
    setError(null);

    try {
      const redirectUrl = getOAuthRedirectUrl();
      console.log("[Auth] Google OAuth redirect URL:", redirectUrl);

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (oauthError) {
        console.error("[Auth] Google OAuth error:", oauthError);
        setError(oauthError.message);
        return { success: false, error: oauthError.message };
      }

      if (data.url) {
        // Open browser for OAuth
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

        if (result.type === "success" && result.url) {
          // Handle the callback URL
          const params = new URLSearchParams(result.url.split("#")[1] || result.url.split("?")[1] || "");
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");

          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              setError("Failed to complete sign in. Please try again.");
              return { success: false, error: sessionError.message };
            }

            return { success: true };
          }
        } else if (result.type === "cancel") {
          return { success: false, error: "Sign in was cancelled" };
        }
      }

      return { success: false, error: "Failed to start Google sign in" };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Google sign in failed";
      console.error("[Auth] Google sign in error:", err);
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        console.error("[Auth] Sign out error:", signOutError);
      }
      setUser(null);
      setAppUser(null);
      setSession(null);
      setError(null);
    } catch (err) {
      console.error("[Auth] Sign out error:", err);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Computed properties
  const email = user?.email || "";
  const fullName = appUser?.full_name || appUser?.first_name || "";
  const profileImage = appUser?.profile_image || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || "";
  const role = appUser?.role || "";
  const orgId = appUser?.org_id || "";
  const locationId = appUser?.location_id || "";

  const value = useMemo(
    () => ({
      isLoading,
      isAuthenticated,
      user,
      appUser,
      session,
      error,
      email,
      fullName,
      profileImage,
      role,
      orgId,
      locationId,
      signInWithEmail,
      signInWithGoogle,
      signOut,
      clearError,
    }),
    [
      isLoading,
      isAuthenticated,
      user,
      appUser,
      session,
      error,
      email,
      fullName,
      profileImage,
      role,
      orgId,
      locationId,
      signInWithEmail,
      signInWithGoogle,
      signOut,
      clearError,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default AuthContext;
