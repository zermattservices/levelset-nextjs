/**
 * Permissions Provider
 * React context for client-side permission management
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { createSupabaseClient } from '@/util/supabase/component';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';
import { loadUserPermissions, clearPermissionCache } from '@/lib/permissions/service';
import { PermissionKey, P } from '@/lib/permissions/constants';

interface PermissionsContextValue {
  // Permission checking methods
  has: (permission: PermissionKey) => boolean;
  hasAny: (permissions: PermissionKey[]) => boolean;
  hasAll: (permissions: PermissionKey[]) => boolean;

  // User's hierarchy level (for tier-based restrictions)
  hierarchyLevel: number;

  // Can user edit permission levels at target hierarchy?
  canEditLevel: (targetLevel: number) => boolean;

  // Loading state
  loading: boolean;

  // Force refresh permissions (after changes)
  refresh: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const locationContext = useLocationContext();
  const supabase = useMemo(() => createSupabaseClient(), []);

  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [hierarchyLevel, setHierarchyLevel] = useState<number>(999);
  const [loading, setLoading] = useState(true);

  // Load permissions when user/org changes
  const loadPermissions = useCallback(async () => {
    const userId = auth.authUser?.id;
    const orgId = locationContext.selectedLocationOrgId;
    const role = auth.role;

    if (!userId || !orgId) {
      setPermissions(new Set());
      setHierarchyLevel(999);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await loadUserPermissions(
        supabase,
        userId,
        orgId,
        role // Pass role for Levelset Admin bypass
      );
      setPermissions(result.permissions);
      setHierarchyLevel(result.hierarchyLevel);
    } catch (error) {
      console.error('Failed to load permissions:', error);
      setPermissions(new Set());
      setHierarchyLevel(999);
    } finally {
      setLoading(false);
    }
  }, [auth.authUser?.id, locationContext.selectedLocationOrgId, auth.role, supabase]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  // Permission check methods (O(1) lookups)
  const has = useCallback(
    (permission: PermissionKey): boolean => {
      return permissions.has(permission);
    },
    [permissions]
  );

  const hasAny = useCallback(
    (keys: PermissionKey[]): boolean => {
      return keys.some((key) => permissions.has(key));
    },
    [permissions]
  );

  const hasAll = useCallback(
    (keys: PermissionKey[]): boolean => {
      return keys.every((key) => permissions.has(key));
    },
    [permissions]
  );

  const canEditLevel = useCallback(
    (targetLevel: number): boolean => {
      // Level -1 is Levelset Admin, can edit anything
      if (hierarchyLevel === -1) return true;
      return hierarchyLevel < targetLevel;
    },
    [hierarchyLevel]
  );

  const refresh = useCallback(async () => {
    const userId = auth.authUser?.id;
    const orgId = locationContext.selectedLocationOrgId;

    if (userId && orgId) {
      clearPermissionCache(userId, orgId);
    }
    await loadPermissions();
  }, [auth.authUser?.id, locationContext.selectedLocationOrgId, loadPermissions]);

  const value = useMemo(
    () => ({
      has,
      hasAny,
      hasAll,
      hierarchyLevel,
      canEditLevel,
      loading,
      refresh,
    }),
    [has, hasAny, hasAll, hierarchyLevel, canEditLevel, loading, refresh]
  );

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

/**
 * Hook to access permissions
 *
 * Usage:
 *   const { has, hasAny, loading } = usePermissions();
 *   if (has(P.ROSTER_EDIT_ROLES)) { ... }
 */
export function usePermissions(): PermissionsContextValue {
  const context = useContext(PermissionsContext);
  if (!context) {
    // Return safe defaults if used outside provider
    return {
      has: () => false,
      hasAny: () => false,
      hasAll: () => false,
      hierarchyLevel: 999,
      canEditLevel: () => false,
      loading: true,
      refresh: async () => {},
    };
  }
  return context;
}

/**
 * Convenience hook to check a single permission
 *
 * Usage:
 *   const canEditRoles = useHasPermission(P.ROSTER_EDIT_ROLES);
 */
export function useHasPermission(permission: PermissionKey): boolean {
  const { has, loading } = usePermissions();
  return !loading && has(permission);
}

/**
 * Hook to check if user can edit a specific hierarchy level
 */
export function useCanEditLevel(targetLevel: number): boolean {
  const { canEditLevel, loading } = usePermissions();
  return !loading && canEditLevel(targetLevel);
}

// Re-export P for convenience
export { P } from '@/lib/permissions/constants';
export type { PermissionKey } from '@/lib/permissions/constants';
