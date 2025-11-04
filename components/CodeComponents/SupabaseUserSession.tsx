import { DataProvider, usePlasmicCanvasContext } from '@plasmicapp/loader-nextjs';
import { User } from '@supabase/supabase-js';
import { createSupabaseClient } from '@/util/supabase/component';
import React from 'react';

// Extended user interface that includes appUsers data
export interface AppUser {
  id: string;
  email: string;
  auth_user_id: string; // Links to auth.users.id
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

// Combined user data for Plasmic
export interface UserWithAppData {
  auth: User | null;
  appUser: AppUser | null;
  isLoaded: boolean;
}

export function SupabaseUserSession({
  children,
  staticToken,
}: {
  className?: string;
  staticToken?: string;
  children?: React.ReactNode;
}) {
  const supabase = createSupabaseClient();
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [appUser, setAppUser] = React.useState<AppUser | null>(null);
  const [isLoaded, setIsLoaded] = React.useState(false);

  const inEditor = usePlasmicCanvasContext();

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
    if (inEditor) {
      if (staticToken) {
        supabase.auth
          .getUser(staticToken)
          .then((res) => {
            setCurrentUser(res.data.user);
            fetchAppUserData(res.data.user);
          })
          .finally(() => {
            setIsLoaded(true);
          });
      } else {
        // No static token provided in editor, just set loaded to true
        setIsLoaded(true);
      }
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event == "SIGNED_OUT") {
        setCurrentUser(null);
        setAppUser(null);
      } else if (["SIGNED_IN", "INITIAL_SESSION"].includes(event) && session) {
        setCurrentUser(session.user);
        fetchAppUserData(session.user);
      }
      setIsLoaded(true);
    });

    return subscription.unsubscribe;
  }, [fetchAppUserData]);

  // Flatten the data structure for Plasmic dynamic values - memoized to prevent unnecessary re-renders
  const userData = React.useMemo(() => ({
    // Basic auth data
    email: currentUser?.email || '',
    id: currentUser?.id || '',
    isLoaded: isLoaded,
    
    // App user data (flattened)
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
    
    // Full objects for components that need them
    authUser: currentUser,
    appUser: appUser,
  }), [currentUser, appUser, isLoaded]);

  return (
    <DataProvider name="auth" data={userData}>
      {isLoaded && children}
    </DataProvider>
  );
}
