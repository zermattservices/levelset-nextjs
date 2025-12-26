/**
 * Default Permission Matrix
 * Single source of truth for default permissions by hierarchy level
 * Used for seeding and custom level creation
 */

import { P, PermissionKey } from './constants';

// Default permissions by hierarchy level
// This is THE source of truth - used for seeding and custom level creation
export const DEFAULT_PERMISSIONS: Record<number, Set<PermissionKey>> = {
  // Level 0 - Full Access (Operator)
  0: new Set([
    // All permissions enabled
    ...Object.values(P),
  ]),

  // Level 1 - Manager Access (Director)
  1: new Set([
    // Positional Excellence - all
    P.PE_VIEW_DASHBOARD,
    P.PE_SUBMIT_RATINGS,
    P.PE_GENERATE_REPORTS,
    P.PE_DELETE_MODIFY_RATINGS,
    P.PE_MANAGE_POSITIONS,
    P.PE_MANAGE_RATING_CRITERIA,
    P.PE_MANAGE_ROLE_MAPPINGS,
    P.PE_MANAGE_RATING_SCALE,
    // Discipline - all
    P.DISC_VIEW_DASHBOARD,
    P.DISC_SUBMIT_INFRACTIONS,
    P.DISC_RECORD_ACTIONS,
    P.DISC_GENERATE_REPORTS,
    P.DISC_DELETE_MODIFY_INFRACTIONS,
    P.DISC_DELETE_MODIFY_ACTIONS,
    P.DISC_MANAGE_INFRACTIONS,
    P.DISC_MANAGE_ACTIONS,
    P.DISC_MANAGE_ACCESS,
    P.DISC_MANAGE_NOTIFICATIONS,
    // Roster - all
    P.ROSTER_VIEW,
    P.ROSTER_EDIT_FOH_BOH,
    P.ROSTER_EDIT_ROLES,
    P.ROSTER_EDIT_AVAILABILITY,
    P.ROSTER_EDIT_CERTIFICATION,
    P.ROSTER_EDIT_EMPLOYEE,
    P.ROSTER_TERMINATE,
    P.ROSTER_SYNC,
    P.ROSTER_MANAGE_PAY,
    // Org Settings - all
    P.ORG_VIEW_SETTINGS,
    P.ORG_MANAGE_LOCATION,
    P.ORG_MANAGE_ORG,
    // Users - view only (not manage)
    P.USERS_VIEW,
    // Roles - view only (not manage)
    P.ROLES_VIEW,
    // Permissions - all
    P.PERMS_VIEW,
    P.PERMS_MANAGE,
    // Mobile - all
    P.MOBILE_ACCESS,
    P.MOBILE_MANAGE_CONFIG,
    P.MOBILE_VIEW_PASSWORD,
    P.MOBILE_CHANGE_PASSWORD,
  ]),

  // Level 2 - Supervisor Access (Team Lead)
  2: new Set([
    // Positional Excellence - view, submit only
    P.PE_VIEW_DASHBOARD,
    P.PE_SUBMIT_RATINGS,
    // Discipline - view, submit only
    P.DISC_VIEW_DASHBOARD,
    P.DISC_SUBMIT_INFRACTIONS,
    // Roster - view, edit FOH/BOH only
    P.ROSTER_VIEW,
    P.ROSTER_EDIT_FOH_BOH,
    // Org Settings - view only
    P.ORG_VIEW_SETTINGS,
    // Permissions - view and manage (for levels below)
    P.PERMS_VIEW,
    P.PERMS_MANAGE,
    // Mobile - access only
    P.MOBILE_ACCESS,
  ]),

  // Level 3+ - Standard Access (Team Member)
  3: new Set([
    // Positional Excellence - view and submit only
    P.PE_VIEW_DASHBOARD,
    P.PE_SUBMIT_RATINGS,
    // Mobile - access only
    P.MOBILE_ACCESS,
  ]),
};

// Helper to get default permissions for any level
export function getDefaultPermissions(level: number): Set<PermissionKey> {
  if (level <= 0) return new Set(DEFAULT_PERMISSIONS[0]);
  if (level === 1) return new Set(DEFAULT_PERMISSIONS[1]);
  if (level === 2) return new Set(DEFAULT_PERMISSIONS[2]);
  return new Set(DEFAULT_PERMISSIONS[3]); // 3+ all get same defaults
}

// Helper to get default permission array for a level
export function getDefaultPermissionsArray(level: number): PermissionKey[] {
  return Array.from(getDefaultPermissions(level));
}

// Profile name mapping by hierarchy level
export const DEFAULT_PROFILE_NAMES: Record<number, string> = {
  0: 'Full Access',
  1: 'Manager Access',
  2: 'Supervisor Access',
  3: 'Standard Access',
};

// Get profile name for a hierarchy level
export function getDefaultProfileName(level: number): string {
  if (level <= 0) return DEFAULT_PROFILE_NAMES[0];
  if (level === 1) return DEFAULT_PROFILE_NAMES[1];
  if (level === 2) return DEFAULT_PROFILE_NAMES[2];
  return DEFAULT_PROFILE_NAMES[3];
}
