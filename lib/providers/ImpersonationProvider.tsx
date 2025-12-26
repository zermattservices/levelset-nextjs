/**
 * Impersonation Provider
 * Allows Levelset Admins to test as other users
 */

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { createSupabaseClient } from '@/util/supabase/component';

// Types for impersonated user data
export interface ImpersonatedUser {
  id: string;
  auth_user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  org_id: string;
  org_name: string;
  location_id: string;
  location_number: string;
  employee_id?: string;
  hire_date?: string;
  active?: boolean;
}

interface ImpersonationContextValue {
  // Current impersonation state
  isImpersonating: boolean;
  impersonatedUser: ImpersonatedUser | null;
  
  // Original admin user data (stored when impersonating)
  originalUserId: string | null;
  
  // Actions
  startImpersonation: (userId: string) => Promise<boolean>;
  endImpersonation: () => void;
  
  // Debug/logging settings
  consoleLoggingEnabled: boolean;
  networkLoggingEnabled: boolean;
  setConsoleLoggingEnabled: (enabled: boolean) => void;
  setNetworkLoggingEnabled: (enabled: boolean) => void;
}

const ImpersonationContext = createContext<ImpersonationContextValue | null>(null);

const IMPERSONATION_STORAGE_KEY = 'levelset_impersonation';

interface StoredImpersonationData {
  impersonatedUser: ImpersonatedUser;
  originalUserId: string;
  consoleLoggingEnabled: boolean;
  networkLoggingEnabled: boolean;
}

export function ImpersonationProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const supabase = useMemo(() => createSupabaseClient(), []);
  
  // State
  const [impersonatedUser, setImpersonatedUser] = useState<ImpersonatedUser | null>(null);
  const [originalUserId, setOriginalUserId] = useState<string | null>(null);
  const [consoleLoggingEnabled, setConsoleLoggingEnabled] = useState(false);
  const [networkLoggingEnabled, setNetworkLoggingEnabled] = useState(false);
  const [initialized, setInitialized] = useState(false);
  
  // Check if current user is a Levelset Admin
  const isLevelsetAdmin = auth.role === 'Levelset Admin';
  
  // Restore impersonation state from sessionStorage on mount
  useEffect(() => {
    if (!auth.isLoaded || initialized) return;
    
    try {
      const stored = sessionStorage.getItem(IMPERSONATION_STORAGE_KEY);
      if (stored) {
        const data: StoredImpersonationData = JSON.parse(stored);
        // Only restore if current user is still the admin who started impersonation
        if (isLevelsetAdmin && data.originalUserId === auth.authUser?.id) {
          setImpersonatedUser(data.impersonatedUser);
          setOriginalUserId(data.originalUserId);
          setConsoleLoggingEnabled(data.consoleLoggingEnabled);
          setNetworkLoggingEnabled(data.networkLoggingEnabled);
        } else {
          // Clear invalid stored data
          sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error('Error restoring impersonation state:', error);
      sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY);
    }
    
    setInitialized(true);
  }, [auth.isLoaded, auth.authUser?.id, isLevelsetAdmin, initialized]);
  
  // Save impersonation state to sessionStorage when it changes
  useEffect(() => {
    if (!initialized) return;
    
    if (impersonatedUser && originalUserId) {
      const data: StoredImpersonationData = {
        impersonatedUser,
        originalUserId,
        consoleLoggingEnabled,
        networkLoggingEnabled,
      };
      sessionStorage.setItem(IMPERSONATION_STORAGE_KEY, JSON.stringify(data));
    } else {
      sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY);
    }
  }, [impersonatedUser, originalUserId, consoleLoggingEnabled, networkLoggingEnabled, initialized]);
  
  // Start impersonation
  const startImpersonation = useCallback(async (userId: string): Promise<boolean> => {
    if (!isLevelsetAdmin) {
      console.error('Only Levelset Admins can impersonate users');
      return false;
    }
    
    try {
      // Fetch the target user's full data
      const { data: userData, error: userError } = await supabase
        .from('app_users')
        .select(`
          id,
          auth_user_id,
          email,
          first_name,
          last_name,
          full_name,
          role,
          org_id,
          location_id,
          employee_id,
          hire_date,
          active
        `)
        .eq('id', userId)
        .single();
      
      if (userError || !userData) {
        console.error('Error fetching user data:', userError);
        return false;
      }
      
      // Fetch org name
      const { data: orgData } = await supabase
        .from('orgs')
        .select('name')
        .eq('id', userData.org_id)
        .single();
      
      // Fetch location number
      const { data: locationData } = await supabase
        .from('locations')
        .select('location_number')
        .eq('id', userData.location_id)
        .single();
      
      const impersonated: ImpersonatedUser = {
        id: userData.id,
        auth_user_id: userData.auth_user_id,
        email: userData.email || '',
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        full_name: userData.full_name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim(),
        role: userData.role || '',
        org_id: userData.org_id || '',
        org_name: orgData?.name || '',
        location_id: userData.location_id || '',
        location_number: locationData?.location_number || '',
        employee_id: userData.employee_id,
        hire_date: userData.hire_date,
        active: userData.active,
      };
      
      // Store original user ID and set impersonated user
      setOriginalUserId(auth.authUser?.id || null);
      setImpersonatedUser(impersonated);
      
      console.log(`[IMPERSONATION] Started impersonating: ${impersonated.full_name} (${impersonated.email})`);
      return true;
    } catch (error) {
      console.error('Error starting impersonation:', error);
      return false;
    }
  }, [auth.authUser?.id, isLevelsetAdmin, supabase]);
  
  // End impersonation
  const endImpersonation = useCallback(() => {
    if (impersonatedUser) {
      console.log(`[IMPERSONATION] Ended impersonation of: ${impersonatedUser.full_name}`);
    }
    setImpersonatedUser(null);
    setOriginalUserId(null);
    setConsoleLoggingEnabled(false);
    setNetworkLoggingEnabled(false);
    sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY);
  }, [impersonatedUser]);
  
  // Context value
  const value = useMemo(
    () => ({
      isImpersonating: !!impersonatedUser,
      impersonatedUser,
      originalUserId,
      startImpersonation,
      endImpersonation,
      consoleLoggingEnabled,
      networkLoggingEnabled,
      setConsoleLoggingEnabled,
      setNetworkLoggingEnabled,
    }),
    [
      impersonatedUser,
      originalUserId,
      startImpersonation,
      endImpersonation,
      consoleLoggingEnabled,
      networkLoggingEnabled,
    ]
  );
  
  return (
    <ImpersonationContext.Provider value={value}>
      {children}
    </ImpersonationContext.Provider>
  );
}

/**
 * Hook to access impersonation context
 */
export function useImpersonation(): ImpersonationContextValue {
  const context = useContext(ImpersonationContext);
  if (!context) {
    // Return safe defaults if used outside provider
    return {
      isImpersonating: false,
      impersonatedUser: null,
      originalUserId: null,
      startImpersonation: async () => false,
      endImpersonation: () => {},
      consoleLoggingEnabled: false,
      networkLoggingEnabled: false,
      setConsoleLoggingEnabled: () => {},
      setNetworkLoggingEnabled: () => {},
    };
  }
  return context;
}

export default ImpersonationProvider;
