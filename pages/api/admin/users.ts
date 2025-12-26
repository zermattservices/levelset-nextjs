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

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // Create admin client inside handler to avoid module-level errors
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    const { org_id, location_id } = req.query;

    // Build query for app_users
    let query = supabaseAdmin
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
      .order('full_name');

    // Apply filters if provided
    if (org_id && typeof org_id === 'string') {
      query = query.eq('org_id', org_id);
    }
    if (location_id && typeof location_id === 'string') {
      query = query.eq('location_id', location_id);
    }

    const { data: users, error: usersError } = await query;

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    // Fetch orgs and locations separately for display names
    const { data: orgs, error: orgsError } = await supabaseAdmin
      .from('orgs')
      .select('id, name')
      .order('name');

    if (orgsError) {
      console.error('Error fetching orgs:', orgsError);
    }

    const { data: locations, error: locationsError } = await supabaseAdmin
      .from('locations')
      .select('id, location_number, org_id')
      .order('location_number');

    if (locationsError) {
      console.error('Error fetching locations:', locationsError);
    }

    // Create lookup maps
    const orgMap = new Map((orgs || []).map(o => [o.id, o]));
    const locationMap = new Map((locations || []).map(l => [l.id, l]));

    // Enrich users with org and location data
    const enrichedUsers = (users || []).map(user => ({
      ...user,
      orgs: user.org_id ? orgMap.get(user.org_id) || null : null,
      locations: user.location_id ? locationMap.get(user.location_id) || null : null,
    }));

    return res.status(200).json({
      users: enrichedUsers,
      orgs: orgs || [],
      locations: locations || [],
    });

  } catch (error) {
    console.error('Unexpected error fetching users:', error);
    return res.status(500).json({ error: 'An unexpected error occurred' });
  }
}
