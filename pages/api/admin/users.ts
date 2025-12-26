import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Create admin client with service role key to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
    const { data: orgs } = await supabaseAdmin
      .from('orgs')
      .select('id, name');

    const { data: locations } = await supabaseAdmin
      .from('locations')
      .select('id, location_number, org_id');

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
