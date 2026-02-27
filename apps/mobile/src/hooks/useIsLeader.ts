/**
 * useIsLeader Hook
 * Determines if the current user is a "leader" (full app access) or "team member" (restricted).
 *
 * Leader detection uses the permission system (not hardcoded role names):
 * - Levelset Admins are always leaders
 * - Users with PE_SUBMIT_RATINGS or DISC_SUBMIT_INFRACTIONS permission are leaders
 * - Everyone else is a team member
 *
 * Mirrors the permission resolution logic from apps/dashboard/lib/permissions/service.ts
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

// Permission keys that indicate leader status (from packages/permissions)
const LEADER_PERMISSIONS = [
  "positional_excellence.submit_ratings",
  "discipline.submit_infractions",
];

interface UseIsLeaderResult {
  isLeader: boolean;
  isLoading: boolean;
}

export function useIsLeader(): UseIsLeaderResult {
  const { appUser, isAuthenticated } = useAuth();
  const [isLeader, setIsLeader] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkLeaderStatus = useCallback(async () => {
    if (!isAuthenticated || !appUser) {
      setIsLeader(false);
      setIsLoading(false);
      return;
    }

    // Levelset Admins are always leaders
    if (appUser.role === "Levelset Admin") {
      setIsLeader(true);
      setIsLoading(false);
      return;
    }

    if (!appUser.org_id) {
      setIsLeader(false);
      setIsLoading(false);
      return;
    }

    try {
      // Resolve which permission profile to use
      let profileId = appUser.permission_profile_id;

      if (appUser.use_role_default || !profileId) {
        // Need to resolve from employee role → org_roles → system profile
        if (appUser.employee_id) {
          // Get employee's role
          const { data: employee } = await supabase
            .from("employees")
            .select("role")
            .eq("id", appUser.employee_id)
            .maybeSingle();

          if (employee?.role && appUser.org_id) {
            // Look up hierarchy level from org_roles
            const { data: roleData } = await supabase
              .from("org_roles")
              .select("hierarchy_level")
              .eq("org_id", appUser.org_id)
              .eq("role_name", employee.role)
              .maybeSingle();

            const hierarchyLevel = roleData?.hierarchy_level ?? 999;

            // Find system default profile for this hierarchy level
            const { data: systemProfile } = await supabase
              .from("permission_profiles")
              .select("id")
              .eq("org_id", appUser.org_id)
              .eq("hierarchy_level", hierarchyLevel)
              .eq("is_system_default", true)
              .maybeSingle();

            profileId = systemProfile?.id ?? undefined;
          }
        }
      }

      if (!profileId) {
        // No profile found — treat as team member
        setIsLeader(false);
        setIsLoading(false);
        return;
      }

      // Check if profile has leader-level permissions
      const { data: accessData } = await supabase
        .from("permission_profile_access")
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
        .eq("profile_id", profileId)
        .eq("is_enabled", true);

      if (accessData) {
        const userPermissions = new Set<string>();
        for (const access of accessData as any[]) {
          const subItem = access.permission_sub_items;
          const moduleKey = subItem.permission_modules.key;
          const subItemKey = subItem.key;
          userPermissions.add(`${moduleKey}.${subItemKey}`);
        }

        const hasLeaderPermission = LEADER_PERMISSIONS.some((p) =>
          userPermissions.has(p)
        );
        setIsLeader(hasLeaderPermission);
      } else {
        setIsLeader(false);
      }
    } catch (err) {
      console.error("[useIsLeader] Error checking permissions:", err);
      // Default to leader on error to avoid locking users out
      setIsLeader(true);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, appUser]);

  useEffect(() => {
    checkLeaderStatus();
  }, [checkLeaderStatus]);

  return { isLeader, isLoading };
}

export default useIsLeader;
