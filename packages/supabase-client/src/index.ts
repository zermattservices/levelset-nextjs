/**
 * @levelset/supabase-client - Supabase client wrappers
 *
 * Stub package: provides server-side Supabase client creation for the agent service.
 * Dashboard continues using its own lib/supabase-server.ts and util/supabase/ directly.
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Create a Supabase client using service role key (for server-side use only).
 * Used by the agent service to bypass RLS.
 */
export function createServiceClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Create a Supabase client using an anon key + user JWT (for verifying user identity).
 */
export function createAnonClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
  }

  return createClient(url, key);
}
