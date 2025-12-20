import * as React from 'react';
import { User } from '@supabase/supabase-js';
import { createSupabaseClient } from '@/util/supabase/component';

// Extended user interface that includes appUsers data
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

export interface AuthContextValue {
  user: User | null;
  appUser: AppUser | null;
  isLoaded: boolean;
  isAuthenticated: boolean;
  role: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  locationId: string;
  orgId: string;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [appUser, setAppUser] = React.useState<AppUser | null>(null);
  const [isLoaded, setIsLoaded] = React.useState(false);

  const supabase = React.useMemo(() => createSupabaseClient(), []);

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
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchAppUserData(session.user);
      }
      setIsLoaded(true);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setAppUser(null);
      } else if (['SIGNED_IN', 'INITIAL_SESSION'].includes(event) && session) {
        setUser(session.user);
        fetchAppUserData(session.user);
      }
      setIsLoaded(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchAppUserData]);

  const value: AuthContextValue = React.useMemo(() => ({
    user,
    appUser,
    isLoaded,
    isAuthenticated: !!user && !!appUser,
    role: appUser?.role || '',
    firstName: appUser?.first_name || '',
    lastName: appUser?.last_name || '',
    employeeId: appUser?.employee_id || '',
    locationId: appUser?.location_id || '',
    orgId: appUser?.org_id || '',
  }), [user, appUser, isLoaded]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    // Return default values if used outside provider (for backwards compatibility)
    return {
      user: null,
      appUser: null,
      isLoaded: false,
      isAuthenticated: false,
      role: '',
      firstName: '',
      lastName: '',
      employeeId: '',
      locationId: '',
      orgId: '',
    };
  }
  return context;
}

export default AuthContext;
