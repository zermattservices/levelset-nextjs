import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);

// Create admin client with service role key for user management
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

interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  orgId: string;
  employeeId: string;
}

// Check if email domain uses Google (Gmail/Google Workspace) via MX records
async function isGoogleEmail(email: string): Promise<{ isGoogle: boolean; error?: string }> {
  const domain = email.split('@')[1]?.toLowerCase();
  
  if (!domain) {
    return { isGoogle: false };
  }
  
  // Direct Gmail domains
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    return { isGoogle: true };
  }
  
  // Check MX records for Google Workspace domains
  try {
    const mxRecords = await resolveMx(domain);
    const isGoogle = mxRecords.some(record => 
      record.exchange.toLowerCase().includes('google') ||
      record.exchange.toLowerCase().includes('googlemail')
    );
    return { isGoogle };
  } catch (error) {
    // MX lookup failed - return unknown
    return { isGoogle: false, error: 'MX lookup failed' };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, firstName, lastName, role, orgId, employeeId } = req.body as CreateUserRequest;

    // Validate required fields
    if (!email || !password || !orgId || !employeeId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if email already exists in auth.users
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      console.error('Error checking existing users:', listError);
      return res.status(500).json({ error: 'Failed to check existing users' });
    }

    const emailExists = (existingUsers?.users || []).some(
      (u: any) => u.email?.toLowerCase() === email.toLowerCase()
    );
    if (emailExists) {
      return res.status(400).json({ error: 'A user with this email already exists' });
    }

    // Check if employee already has an app_user account
    const { data: existingAppUser } = await supabaseAdmin
      .from('app_users')
      .select('id')
      .eq('employee_id', employeeId)
      .maybeSingle();

    if (existingAppUser) {
      return res.status(400).json({ error: 'This employee already has a dashboard account' });
    }

    // Create the auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
      },
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return res.status(400).json({ error: authError.message || 'Failed to create auth user' });
    }

    if (!authData.user) {
      return res.status(500).json({ error: 'Failed to create auth user' });
    }

    // Determine permissions based on role
    let permissions = 'user';
    const roleLower = role.toLowerCase();
    if (roleLower.includes('operator') || roleLower.includes('owner')) {
      permissions = 'operator';
    } else if (
      roleLower.includes('executive') ||
      roleLower.includes('director') ||
      roleLower.includes('admin') ||
      roleLower.includes('manager')
    ) {
      permissions = 'admin';
    }

    // Create the app_user entry with temp password stored
    const { error: appUserError } = await supabaseAdmin
      .from('app_users')
      .insert({
        email,
        first_name: firstName,
        last_name: lastName,
        role,
        org_id: orgId,
        employee_id: employeeId,
        auth_user_id: authData.user.id,
        permissions,
        temp_password: password, // Store temp password for admin reference
      });

    if (appUserError) {
      console.error('Error creating app_user:', appUserError);
      // Try to clean up the auth user we just created
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({ error: 'Failed to create user profile' });
    }

    // Check if email is a Google email
    const googleCheck = await isGoogleEmail(email);

    return res.status(200).json({
      success: true,
      userId: authData.user.id,
      isGoogleEmail: googleCheck.isGoogle,
      googleCheckFailed: !!googleCheck.error,
    });

  } catch (error) {
    console.error('Unexpected error creating user:', error);
    return res.status(500).json({ error: 'An unexpected error occurred' });
  }
}
