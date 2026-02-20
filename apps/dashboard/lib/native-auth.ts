/**
 * Native Auth Helpers
 * Shared authentication and authorization helpers for native mobile app API routes.
 * These routes use JWT Bearer auth (not the PWA mobile token).
 */

import { createServerSupabaseClient } from './supabase-server';

export interface NativeLocation {
  id: string;
  name: string | null;
  location_number: string | null;
  org_id: string;
}

/**
 * Validate that an authenticated user has access to the requested location_id.
 *
 * Checks (in order):
 * 1. Location exists and belongs to the given orgId
 * 2. User is a Levelset Admin (bypasses location access checks)
 * 3. User's assigned location_id matches
 * 4. User has explicit access via user_location_access table
 *
 * @param authUserId - The Supabase auth user ID (from JWT)
 * @param orgId - The org ID (from withPermissionAndContext middleware)
 * @param locationId - The requested location ID
 * @returns The location record if access is granted, null otherwise
 */
export async function validateLocationAccess(
  authUserId: string,
  orgId: string,
  locationId: string
): Promise<NativeLocation | null> {
  const supabase = createServerSupabaseClient();

  // 1. Fetch the location, verify it belongs to this org
  const { data: location, error: locError } = await supabase
    .from('locations')
    .select('id, name, location_number, org_id')
    .eq('id', locationId)
    .eq('org_id', orgId)
    .single();

  if (locError || !location) return null;

  // 2. Get the app_user record for this auth user + org
  const { data: appUser } = await supabase
    .from('app_users')
    .select('id, location_id, role')
    .eq('auth_user_id', authUserId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (!appUser) return null;

  const loc: NativeLocation = {
    id: location.id,
    name: location.name,
    location_number: location.location_number,
    org_id: location.org_id,
  };

  // 3. Levelset Admin bypasses location access check
  if (appUser.role === 'Levelset Admin') {
    return loc;
  }

  // 4. Check: is this the user's assigned location?
  if (appUser.location_id === locationId) {
    return loc;
  }

  // 5. Check: user_location_access table (multi-location users)
  const { data: access } = await supabase
    .from('user_location_access')
    .select('id')
    .eq('user_id', appUser.id)
    .eq('location_id', locationId)
    .maybeSingle();

  if (access) {
    return loc;
  }

  return null; // No access
}
