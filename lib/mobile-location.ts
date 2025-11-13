import { createServerSupabaseClient } from './supabase-server';

export interface MobileLocation {
  id: string;
  name: string | null;
  location_number: string | null;
  org_id: string | null;
  location_mobile_token: string;
}

export async function fetchLocationByToken(token: string): Promise<MobileLocation | null> {
  if (!token) {
    return null;
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from('locations')
    .select('id, name, location_number, org_id, location_mobile_token')
    .eq('location_mobile_token', token)
    .maybeSingle();

  if (error) {
    console.error('[mobile] Failed to fetch location by token', token, error);
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    name: data.name ?? null,
    location_number: data.location_number ?? null,
    org_id: data.org_id ?? null,
    location_mobile_token: data.location_mobile_token,
  };
}

