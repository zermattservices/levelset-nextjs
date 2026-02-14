import React from 'react';
import { User } from '@supabase/supabase-js';
import { createSupabaseClient } from '@/util/supabase/component';

// Extended user interface that includes appUsers data (same as SupabaseUserSession)
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

// Auth context data shape - matches SupabaseUserSession exactly
export interface AuthData {
  email: string;
  id: string;
  isLoaded: boolean;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  org_id: string;
  location_id: string;
  employee_id: string;
  phone: string;
  hire_date: string;
  active: boolean;
  profile_image: string;
  authUser: User | null;
  appUser: AppUser | null;
}

const AuthContext = React.createContext<AuthData | undefined>(undefined);

export function useAuth(): AuthData {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    // Return default values if used outside provider
    return {
      email: '',
      id: '',
      isLoaded: false,
      first_name: '',
      last_name: '',
      full_name: '',
      role: '',
      org_id: '',
      location_id: '',
      employee_id: '',
      phone: '',
      hire_date: '',
      active: false,
      profile_image: '',
      authUser: null,
      appUser: null,
    };
  }
  return context;
}

export function AuthProvider({ children }: { children?: React.ReactNode }) {
  const supabase = React.useMemo(() => createSupabaseClient(), []);
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [appUser, setAppUser] = React.useState<AppUser | null>(null);
  const [isLoaded, setIsLoaded] = React.useState(false);

  // Fetch app user data when auth user changes
  const fetchAppUserData = React.useCallback(async (authUser: User | null) => {
    if (!authUser?.id) {
      setAppUser(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .single();

      if (error) {
        console.error('Error fetching app user data:', error);
        setAppUser(null);
      } else {
        // If user has a Google profile image and app_user doesn't have one, save it
        const googleAvatar = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture;
        if (googleAvatar && !data.profile_image) {
          // Update the profile image in the database
          const { error: updateError } = await supabase
            .from('app_users')
            .update({ profile_image: googleAvatar })
            .eq('id', data.id);
          
          if (!updateError) {
            data.profile_image = googleAvatar;
          }
        }
        setAppUser(data);
      }
    } catch (err) {
      console.error('Error fetching app user data:', err);
      setAppUser(null);
    }
  }, [supabase]);

  React.useEffect(() => {
    // Track if we're in the process of setting session from cookies to avoid infinite loops
    let isSettingSessionFromCookies = false;
    
    // Helper function to set shared cookies for cross-domain auth
    const setSharedCookies = (session: any) => {
      if (!session?.access_token) return;
      
      const maxAge = 100 * 365 * 24 * 60 * 60; // 100 years, never expires
      const domain = '.levelset.io'; // Shared across all subdomains
      const cookieOptions = `Domain=${domain}; path=/; max-age=${maxAge}; SameSite=Lax; secure`;
      
      document.cookie = `levelset-access-token=${session.access_token}; ${cookieOptions}`;
      document.cookie = `levelset-refresh-token=${session.refresh_token || ''}; ${cookieOptions}`;
      console.log('[Auth] Shared cookies set');
    };

    // Helper function to clear shared cookies
    const clearSharedCookies = () => {
      const expires = new Date(0).toUTCString();
      const domain = '.levelset.io';
      const cookieOptions = `Domain=${domain}; path=/; expires=${expires}; SameSite=Lax; secure`;
      
      document.cookie = `levelset-access-token=; ${cookieOptions}`;
      document.cookie = `levelset-refresh-token=; ${cookieOptions}`;
      console.log('[Auth] Shared cookies cleared');
    };

    // Helper function to get cookies
    const getSharedCookies = () => {
      const cookies = document.cookie.split(/\s*;\s*/).map(cookie => cookie.split('='));
      const accessTokenCookie = cookies.find(x => x[0] === 'levelset-access-token');
      const refreshTokenCookie = cookies.find(x => x[0] === 'levelset-refresh-token');
      return {
        accessToken: accessTokenCookie?.[1] || null,
        refreshToken: refreshTokenCookie?.[1] || null,
      };
    };

    // Set up auth state change listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth] onAuthStateChange:', event, 'hasSession:', !!session);
      
      if (event === "SIGNED_OUT") {
        setCurrentUser(null);
        setAppUser(null);
        clearSharedCookies();
        setIsLoaded(true);
      } else if (["SIGNED_IN", "INITIAL_SESSION", "TOKEN_REFRESHED"].includes(event) && session) {
        setCurrentUser(session.user);
        fetchAppUserData(session.user);
        // Only update cookies if this wasn't triggered by us setting session from cookies
        if (!isSettingSessionFromCookies) {
          setSharedCookies(session);
        }
        setIsLoaded(true);
      }
    });

    // Initialize auth - try existing session first, then cookies
    const initializeAuth = async () => {
      console.log('[Auth] Initializing...');
      
      // First, check if there's already a session
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      
      if (existingSession) {
        console.log('[Auth] Found existing session');
        setCurrentUser(existingSession.user);
        fetchAppUserData(existingSession.user);
        setSharedCookies(existingSession);
        setIsLoaded(true);
        return;
      }
      
      // No existing session - try to restore from shared cookies
      const { accessToken, refreshToken } = getSharedCookies();
      console.log('[Auth] No existing session, checking cookies...', { hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken });
      
      if (accessToken && refreshToken) {
        try {
          isSettingSessionFromCookies = true;
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          isSettingSessionFromCookies = false;
          
          if (!error && data.session) {
            console.log('[Auth] Session restored from cookies');
            // onAuthStateChange will handle setting user state
            return;
          } else {
            console.log('[Auth] Failed to restore session from cookies:', error?.message);
            // Clear invalid cookies
            clearSharedCookies();
          }
        } catch (error) {
          isSettingSessionFromCookies = false;
          console.error('[Auth] Error setting session from cookies:', error);
          clearSharedCookies();
        }
      }
      
      // No valid session found
      console.log('[Auth] No valid session found');
      setIsLoaded(true);
    };

    initializeAuth();

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchAppUserData]);

  // Create auth data object with exact same shape as SupabaseUserSession
  // Get profile image from app_user or fall back to Google OAuth avatar
  const profileImage = appUser?.profile_image || 
    currentUser?.user_metadata?.avatar_url || 
    currentUser?.user_metadata?.picture || 
    '';

  const authData: AuthData = React.useMemo(() => ({
    email: currentUser?.email || '',
    id: currentUser?.id || '',
    isLoaded: isLoaded,
    first_name: appUser?.first_name || '',
    last_name: appUser?.last_name || '',
    full_name: appUser?.full_name || '',
    role: appUser?.role || '',
    org_id: appUser?.org_id || '',
    location_id: appUser?.location_id || '',
    employee_id: appUser?.employee_id || '',
    phone: appUser?.phone || '',
    hire_date: appUser?.hire_date || '',
    active: appUser?.active || false,
    profile_image: profileImage,
    authUser: currentUser,
    appUser: appUser,
  }), [currentUser, appUser, isLoaded, profileImage]);

  return (
    <AuthContext.Provider value={authData}>
      {isLoaded && children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
