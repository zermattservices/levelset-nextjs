/**
 * Permission Service
 * Core permission loading and checking logic (used by both client and server)
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { PermissionKey, P, SUB_ITEM_METADATA } from './constants';

// Cache interface
interface PermissionCache {
  permissions: Set<string>;
  hierarchyLevel: number;
  loadedAt: number;
  orgId: string;
}

// In-memory cache (per-request on server, per-session on client)
const permissionCache = new Map<string, PermissionCache>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Load all permissions for a user in an organization
 * Returns cached result if available and fresh
 */
export async function loadUserPermissions(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  userRole?: string // 'Levelset Admin' bypasses all checks
): Promise<{ permissions: Set<string>; hierarchyLevel: number }> {
  // BYPASS: Levelset Admin has all permissions
  if (userRole === 'Levelset Admin') {
    return {
      permissions: new Set(Object.values(P)),
      hierarchyLevel: -1, // Special level for Levelset Admin
    };
  }

  // Check cache
  const cacheKey = `${userId}:${orgId}`;
  const cached = permissionCache.get(cacheKey);
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS && cached.orgId === orgId) {
    return { permissions: cached.permissions, hierarchyLevel: cached.hierarchyLevel };
  }

  // Fetch user's app_users record
  const { data: appUser, error: appUserError } = await supabase
    .from('app_users')
    .select(
      `
      id,
      permission_profile_id,
      use_role_default,
      employee_id,
      employees!app_users_employee_id_fkey (
        role
      )
    `
    )
    .eq('auth_user_id', userId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (appUserError || !appUser) {
    console.error('Failed to load app_user for permissions:', appUserError);
    return { permissions: new Set(), hierarchyLevel: 999 };
  }

  // Determine which profile to use
  let profileId = appUser.permission_profile_id;
  let hierarchyLevel = 999;

  if (appUser.use_role_default || !profileId) {
    // Get profile from role's hierarchy level
    const employeeData = appUser.employees as { role?: string } | null;
    const employeeRole = employeeData?.role;

    if (employeeRole) {
      // Look up hierarchy level from org_roles
      const { data: roleData } = await supabase
        .from('org_roles')
        .select('hierarchy_level')
        .eq('org_id', orgId)
        .eq('role_name', employeeRole)
        .maybeSingle();

      hierarchyLevel = roleData?.hierarchy_level ?? 999;
    }

    // Find system profile for this hierarchy level
    const { data: systemProfile } = await supabase
      .from('permission_profiles')
      .select('id')
      .eq('org_id', orgId)
      .eq('hierarchy_level', hierarchyLevel)
      .eq('is_system_default', true)
      .maybeSingle();

    profileId = systemProfile?.id;
  } else {
    // Using explicit profile - get its hierarchy level
    const { data: profile } = await supabase
      .from('permission_profiles')
      .select('hierarchy_level')
      .eq('id', profileId)
      .maybeSingle();

    hierarchyLevel = profile?.hierarchy_level ?? 999;
  }

  // Fetch enabled permissions for the profile
  const permissions = new Set<string>();

  if (profileId) {
    const { data: accessData } = await supabase
      .from('permission_profile_access')
      .select(
        `
        is_enabled,
        permission_sub_items!inner (
          key,
          permission_modules!inner (
            key
          )
        )
      `
      )
      .eq('profile_id', profileId)
      .eq('is_enabled', true);

    if (accessData) {
      for (const access of accessData as any[]) {
        const subItem = access.permission_sub_items;
        const moduleKey = subItem.permission_modules.key;
        const subItemKey = subItem.key;
        permissions.add(`${moduleKey}.${subItemKey}`);
      }
    }
  }

  // Cache the result
  permissionCache.set(cacheKey, {
    permissions,
    hierarchyLevel,
    loadedAt: Date.now(),
    orgId,
  });

  return { permissions, hierarchyLevel };
}

/**
 * Check if user has a specific permission
 */
export async function checkPermission(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  permission: PermissionKey,
  userRole?: string
): Promise<boolean> {
  const { permissions } = await loadUserPermissions(supabase, userId, orgId, userRole);
  return permissions.has(permission);
}

/**
 * Check if user has any of the specified permissions
 */
export async function checkAnyPermission(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  permissionKeys: PermissionKey[],
  userRole?: string
): Promise<boolean> {
  const { permissions } = await loadUserPermissions(supabase, userId, orgId, userRole);
  return permissionKeys.some((key) => permissions.has(key));
}

/**
 * Check if user has all of the specified permissions
 */
export async function checkAllPermissions(
  supabase: SupabaseClient,
  userId: string,
  orgId: string,
  permissionKeys: PermissionKey[],
  userRole?: string
): Promise<boolean> {
  const { permissions } = await loadUserPermissions(supabase, userId, orgId, userRole);
  return permissionKeys.every((key) => permissions.has(key));
}

/**
 * Check if user can edit a permission level (tier restriction)
 */
export function canEditPermissionLevel(
  userHierarchyLevel: number,
  targetHierarchyLevel: number
): boolean {
  // Levelset Admin (level -1) can edit anything
  if (userHierarchyLevel === -1) return true;
  // Users can only edit levels below their own
  return userHierarchyLevel < targetHierarchyLevel;
}

/**
 * Clear permission cache for a user (call after permission changes)
 */
export function clearPermissionCache(userId: string, orgId?: string) {
  if (orgId) {
    permissionCache.delete(`${userId}:${orgId}`);
  } else {
    // Clear all entries for this user
    for (const key of Array.from(permissionCache.keys())) {
      if (key.startsWith(`${userId}:`)) {
        permissionCache.delete(key);
      }
    }
  }
}

/**
 * Clear all permission cache entries
 */
export function clearAllPermissionCache() {
  permissionCache.clear();
}

/**
 * Handle permission dependencies (e.g., change_password requires view_password)
 */
export function resolveDependencies(permissions: Set<PermissionKey>): Set<PermissionKey> {
  const resolved = new Set(permissions);

  for (const key of Array.from(permissions)) {
    const metadata = SUB_ITEM_METADATA[key];
    if (metadata?.dependsOn && !resolved.has(metadata.dependsOn)) {
      resolved.add(metadata.dependsOn);
    }
  }

  return resolved;
}

/**
 * Get all permissions that depend on a given permission
 */
export function getDependentPermissions(permission: PermissionKey): PermissionKey[] {
  const dependents: PermissionKey[] = [];

  for (const [key, metadata] of Object.entries(SUB_ITEM_METADATA)) {
    if (metadata.dependsOn === permission) {
      dependents.push(key as PermissionKey);
    }
  }

  return dependents;
}
