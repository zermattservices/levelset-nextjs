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
  useRef,
} from "react";
import { AppState, AppStateStatus } from "react-native";
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
  nickname?: string;
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
  permission_profile_id?: string;
  use_role_default?: boolean;
}

// Employee data joined from employees table
export interface EmployeeData {
  birth_date?: string;
  hire_date?: string;
  phone?: string;
  role?: string; // org-specific role (e.g. "Executive", "Operator")
  title?: string; // job title (e.g. "General Manager", "Shift Lead")
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
  firstName: string;
  lastName: string;
  nickname: string;
  profileImage: string;
  role: string;
  phone: string;
  employeeId: string;
  hireDate: string;
  orgId: string;
  locationId: string;

  // Employee data (from employees table)
  position: string;
  jobTitle: string;
  birthDate: string;
  startDate: string;
  employeePhone: string;

  // Multi-org support
  getAppUserForOrg: (orgId: string) => Promise<AppUser | null>;

  // Auth actions
  signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  updateNickname: (nickname: string) => Promise<{ success: boolean; error?: string }>;
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
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = user !== null && appUser !== null;

  // Cache for org-specific app_user lookups (multi-org support)
  const orgAppUserCache = useRef<Map<string, AppUser | null>>(new Map());

  // Fetch the app_user record for a specific org (for multi-org users)
  const getAppUserForOrg = useCallback(async (orgId: string): Promise<AppUser | null> => {
    // Check cache first
    if (orgAppUserCache.current.has(orgId)) {
      return orgAppUserCache.current.get(orgId) ?? null;
    }

    // If primary appUser matches, use it
    if (appUser?.org_id === orgId) {
      orgAppUserCache.current.set(orgId, appUser);
      return appUser;
    }

    // Query for the app_user in the specified org
    if (!user?.id) return null;

    try {
      const { data, error: fetchError } = await supabase
        .from("app_users")
        .select("*")
        .eq("auth_user_id", user.id)
        .eq("org_id", orgId)
        .maybeSingle();

      if (fetchError) {
        console.error("[Auth] Error fetching app_user for org:", orgId, fetchError);
        return null;
      }

      orgAppUserCache.current.set(orgId, data);
      return data;
    } catch (err) {
      console.error("[Auth] Error fetching app_user for org:", orgId, err);
      return null;
    }
  }, [user?.id, appUser]);

  // Fetch employee record linked to app_user
  const fetchEmployeeData = useCallback(async (employeeId: string | null | undefined) => {
    if (!employeeId) {
      setEmployeeData(null);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from("employees")
        .select("birth_date, hire_date, phone, role, title")
        .eq("id", employeeId)
        .single();

      if (fetchError) {
        console.error("[Auth] Error fetching employee data:", fetchError);
        setEmployeeData(null);
        return;
      }

      setEmployeeData(data);
    } catch (err) {
      console.error("[Auth] Error fetching employee data:", err);
      setEmployeeData(null);
    }
  }, []);

  // Fetch app_users data when auth user changes
  const fetchAppUserData = useCallback(async (authUser: User | null) => {
    if (!authUser?.id) {
      setAppUser(null);
      setEmployeeData(null);
      return;
    }

    try {
      // Use limit(1) instead of .single() to handle users with app_user
      // records in multiple orgs. Order by created_at so the primary
      // (earliest-created) record is returned.
      const { data: rows, error: fetchError } = await supabase
        .from("app_users")
        .select("*")
        .eq("auth_user_id", authUser.id)
        .order("created_at", { ascending: true })
        .limit(1);

      const data = rows?.[0] ?? null;

      if (fetchError) {
        console.error("[Auth] Error fetching app user data:", fetchError);
        setAppUser(null);
        return;
      }

      if (!data) {
        console.error("[Auth] No app_user found for auth_user_id:", authUser.id);
        setAppUser(null);
        return;
      }
      console.log("[Auth] Found app_user:", data.id, "org:", data.org_id);

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

      // Fetch linked employee data
      await fetchEmployeeData(data.employee_id);
    } catch (err) {
      console.error("[Auth] Error fetching app user data:", err);
      setAppUser(null);
    }
  }, [fetchEmployeeData]);

  // Initialize auth and listen for changes.
  // IMPORTANT: Do NOT await async work (e.g. Supabase queries) inside
  // onAuthStateChange — the callback runs while Supabase holds an internal
  // auth lock, so any query that reads the session will deadlock.
  // Instead, just update user/session state here and let the separate
  // useEffect below handle fetching app user data.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log("[Auth] onAuthStateChange:", event, "hasSession:", !!currentSession);

        if (event === "SIGNED_OUT") {
          setUser(null);
          setAppUser(null);
          setSession(null);
          setError(null);
          setIsLoading(false);
        } else if (currentSession) {
          // For token refreshes where the user hasn't changed, just update
          // the session and clear loading — no need to re-fetch app user data.
          if (event === "TOKEN_REFRESHED") {
            setSession(currentSession);
            setIsLoading(false);
          } else {
            // New sign-in or initial session — fetch app user data.
            setIsLoading(true);
            setUser(currentSession.user);
            setSession(currentSession);
          }
        } else {
          // No session (e.g. INITIAL_SESSION with expired refresh token)
          setUser(null);
          setAppUser(null);
          setSession(null);
          setIsLoading(false);
        }
      }
    );

    // Clear stale refresh tokens on startup to prevent error banners
    supabase.auth.getSession().then(({ error: sessionError }) => {
      if (sessionError) {
        console.log("[Auth] Stale session cleared:", sessionError.message);
        supabase.auth.signOut();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Refresh session when app comes back to foreground.
  // Without this, a stale/expired token after backgrounding causes an
  // infinite spinner because onAuthStateChange never fires.
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (appStateRef.current !== "active" && nextState === "active") {
        console.log("[Auth] App foregrounded — refreshing session");
        supabase.auth.getSession().then(({ data, error: sessionError }) => {
          if (sessionError || !data.session) {
            console.log("[Auth] Session expired after background, signing out");
            supabase.auth.signOut();
          } else {
            // Session is still valid — make sure we're not stuck loading
            setIsLoading(false);
          }
        });
      }
      appStateRef.current = nextState;
    });

    return () => subscription.remove();
  }, []);

  // Fetch app user data when auth user changes (kept outside onAuthStateChange
  // to avoid Supabase auth lock deadlock).
  const prevUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    const userId = user?.id ?? null;
    if (userId === prevUserIdRef.current) return;
    prevUserIdRef.current = userId;

    if (!user) {
      setAppUser(null);
      setEmployeeData(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    console.log("[Auth] Fetching app user data for:", user.id);
    fetchAppUserData(user).then(() => {
      if (!cancelled) {
        console.log("[Auth] App user data loaded, setting isLoading=false");
        setIsLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [user, fetchAppUserData]);

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
      setEmployeeData(null);
      setSession(null);
      setError(null);
      orgAppUserCache.current.clear();
    } catch (err) {
      console.error("[Auth] Sign out error:", err);
    }
  }, []);

  // Update nickname
  const updateNickname = useCallback(async (newNickname: string) => {
    if (!appUser?.id) return { success: false, error: "No user found" };

    try {
      const { error: updateError } = await supabase
        .from("app_users")
        .update({ nickname: newNickname })
        .eq("id", appUser.id);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      setAppUser((prev) => prev ? { ...prev, nickname: newNickname } : prev);
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Update failed";
      return { success: false, error: errorMessage };
    }
  }, [appUser?.id]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Computed properties
  const email = user?.email || "";
  const fullName = appUser?.full_name ||
    [appUser?.first_name, appUser?.last_name].filter(Boolean).join(" ") ||
    "";
  const firstName = appUser?.first_name || "";
  const lastName = appUser?.last_name || "";
  const nickname = appUser?.nickname || "";
  const profileImage = appUser?.profile_image || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || "";
  const role = appUser?.role || "";
  const phone = appUser?.phone || "";
  const employeeId = appUser?.employee_id || "";
  const hireDate = appUser?.hire_date || "";
  const orgId = appUser?.org_id || "";
  const locationId = appUser?.location_id || "";

  // Employee-sourced properties
  const position = employeeData?.role || "";
  const jobTitle = employeeData?.title || "";
  const birthDate = employeeData?.birth_date || "";
  const startDate = employeeData?.hire_date || "";
  const employeePhone = employeeData?.phone || phone;

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
      firstName,
      lastName,
      nickname,
      profileImage,
      role,
      phone,
      employeeId,
      hireDate,
      orgId,
      locationId,
      position,
      jobTitle,
      birthDate,
      startDate,
      employeePhone,
      getAppUserForOrg,
      signInWithEmail,
      signInWithGoogle,
      signOut,
      updateNickname,
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
      firstName,
      lastName,
      nickname,
      profileImage,
      role,
      phone,
      employeeId,
      hireDate,
      orgId,
      locationId,
      position,
      jobTitle,
      birthDate,
      startDate,
      employeePhone,
      getAppUserForOrg,
      signInWithEmail,
      signInWithGoogle,
      signOut,
      updateNickname,
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
