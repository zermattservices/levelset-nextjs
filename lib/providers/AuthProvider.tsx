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
        setAppUser(data);
      }
    } catch (err) {
      console.error('Error fetching app user data:', err);
      setAppUser(null);
    }
  }, [supabase]);

  React.useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setCurrentUser(null);
        setAppUser(null);
      } else if (["SIGNED_IN", "INITIAL_SESSION"].includes(event) && session) {
        setCurrentUser(session.user);
        fetchAppUserData(session.user);
      }
      setIsLoaded(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchAppUserData]);

  // Create auth data object with exact same shape as SupabaseUserSession
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
    authUser: currentUser,
    appUser: appUser,
  }), [currentUser, appUser, isLoaded]);

  return (
    <AuthContext.Provider value={authData}>
      {isLoaded && children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
