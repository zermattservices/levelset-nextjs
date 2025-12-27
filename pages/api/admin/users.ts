import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check for required env vars
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('[admin/users] Starting request');
  console.log('[admin/users] SUPABASE_URL exists:', !!supabaseUrl);
  console.log('[admin/users] SERVICE_ROLE_KEY exists:', !!serviceRoleKey);
  console.log('[admin/users] SERVICE_ROLE_KEY length:', serviceRoleKey?.length || 0);

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[admin/users] Missing required environment variables');
    return res.status(500).json({ error: 'Server configuration error', details: 'Missing environment variables' });
  }

  // Create admin client inside handler to avoid module-level errors
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  
  console.log('[admin/users] Supabase admin client created');

  try {
    const { org_id, location_id } = req.query;
    console.log('[admin/users] Query params:', { org_id, location_id });

    // Build query for app_users
    let query = supabaseAdmin
      .from('app_users')
      .select(`
        id,
        auth_user_id,
        email,
        first_name,
        last_name,
        role,
        org_id,
        location_id,
        employee_id,
        created_at
      `)
      .order('first_name');

    // Apply filters if provided
    if (org_id && typeof org_id === 'string') {
      query = query.eq('org_id', org_id);
    }
    if (location_id && typeof location_id === 'string') {
      query = query.eq('location_id', location_id);
    }

    const { data: users, error: usersError } = await query;

    console.log('[admin/users] Users query result:', { 
      count: users?.length || 0, 
      error: usersError?.message || null 
    });

    if (usersError) {
      console.error('[admin/users] Error fetching users:', usersError);
      return res.status(500).json({ error: 'Failed to fetch users', details: usersError.message });
    }

    // Fetch orgs and locations separately for display names
    const { data: orgs, error: orgsError } = await supabaseAdmin
      .from('orgs')
      .select('id, name')
      .order('name');

    console.log('[admin/users] Orgs query result:', { 
      count: orgs?.length || 0, 
      error: orgsError?.message || null 
    });

    if (orgsError) {
      console.error('[admin/users] Error fetching orgs:', orgsError);
    }

    const { data: locations, error: locationsError } = await supabaseAdmin
      .from('locations')
      .select('id, location_number, org_id')
      .order('location_number');

    console.log('[admin/users] Locations query result:', { 
      count: locations?.length || 0, 
      error: locationsError?.message || null 
    });

    if (locationsError) {
      console.error('[admin/users] Error fetching locations:', locationsError);
    }

    // Fetch user_location_access for all users
    const { data: locationAccess, error: accessError } = await supabaseAdmin
      .from('user_location_access')
      .select('user_id, location_id');

    if (accessError) {
      console.error('[admin/users] Error fetching location access:', accessError);
    }

    console.log('[admin/users] Location access query result:', { 
      count: locationAccess?.length || 0, 
      error: accessError?.message || null 
    });

    // Create lookup maps
    const orgMap = new Map((orgs || []).map(o => [o.id, o]));
    const locationMap = new Map((locations || []).map(l => [l.id, l]));

    // Create a map of user_id to array of location_ids
    const userLocationsMap = new Map<string, string[]>();
    for (const access of locationAccess || []) {
      const existing = userLocationsMap.get(access.user_id) || [];
      existing.push(access.location_id);
      userLocationsMap.set(access.user_id, existing);
    }

    // Enrich users with org and location data, and construct full_name
    const enrichedUsers = (users || []).map(user => {
      const locationIds = userLocationsMap.get(user.id) || [];
      // Map location IDs to location objects with their numbers
      const locationObjects = locationIds
        .map(locId => locationMap.get(locId))
        .filter(Boolean)
        .sort((a, b) => (a?.location_number || '').localeCompare(b?.location_number || ''));
      
      return {
        ...user,
        full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
        active: true,
        hire_date: user.created_at,
        orgs: user.org_id ? orgMap.get(user.org_id) || null : null,
        locations: locationObjects.length > 0 ? locationObjects : (user.location_id ? [locationMap.get(user.location_id)] : []).filter(Boolean),
        location_access: locationIds,
      };
    });

    console.log('[admin/users] Returning:', {
      users: enrichedUsers.length,
      orgs: orgs?.length || 0,
      locations: locations?.length || 0
    });

    return res.status(200).json({
      users: enrichedUsers,
      orgs: orgs || [],
      locations: locations || [],
    });

  } catch (error: any) {
    console.error('[admin/users] Unexpected error:', error);
    return res.status(500).json({ error: 'An unexpected error occurred', details: error?.message || 'Unknown error' });
  }
}
