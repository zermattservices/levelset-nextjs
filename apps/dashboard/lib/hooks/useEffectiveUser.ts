/**
 * useEffectiveUser Hook
 * Returns the effective user data - impersonated user when impersonating, otherwise the auth user
 * This should be used for displaying user information throughout the app
 */

import { useMemo } from 'react';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useImpersonation } from '@/lib/providers/ImpersonationProvider';

export interface EffectiveUser {
  // Core user info
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  org_id: string;
  location_id: string;
  
  // Status
  isLoaded: boolean;
  isImpersonating: boolean;
  
  // Original admin info (when impersonating)
  originalUserId: string | null;
  
  // Helper booleans
  isLevelsetAdmin: boolean;
  isOperator: boolean;
}

export function useEffectiveUser(): EffectiveUser {
  const auth = useAuth();
  const { isImpersonating, impersonatedUser, originalUserId } = useImpersonation();
  
  return useMemo(() => {
    // When impersonating, use impersonated user data
    if (isImpersonating && impersonatedUser) {
      return {
        id: impersonatedUser.id,
        email: impersonatedUser.email,
        first_name: impersonatedUser.first_name,
        last_name: impersonatedUser.last_name,
        full_name: impersonatedUser.full_name,
        role: impersonatedUser.role,
        org_id: impersonatedUser.org_id,
        location_id: impersonatedUser.location_id,
        isLoaded: true,
        isImpersonating: true,
        originalUserId,
        isLevelsetAdmin: impersonatedUser.role === 'Levelset Admin',
        isOperator: impersonatedUser.role === 'Owner/Operator',
      };
    }
    
    // Otherwise, use the actual auth user
    return {
      id: auth.id,
      email: auth.email,
      first_name: auth.first_name,
      last_name: auth.last_name,
      full_name: auth.full_name || `${auth.first_name} ${auth.last_name}`.trim(),
      role: auth.role,
      org_id: auth.org_id,
      location_id: auth.location_id,
      isLoaded: auth.isLoaded,
      isImpersonating: false,
      originalUserId: null,
      isLevelsetAdmin: auth.role === 'Levelset Admin',
      isOperator: auth.role === 'Owner/Operator',
    };
  }, [auth, isImpersonating, impersonatedUser, originalUserId]);
}

export default useEffectiveUser;
