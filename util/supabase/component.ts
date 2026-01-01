import { createBrowserClient } from "@supabase/ssr";

/**
 * Create a new Supabase client to be used in the component. Gets executed on the client side, in browser.
 * Learn more about client types in supabase https://supabase.com/docs/guides/auth/server-side/nextjs?router=pages
 * 
 * Note: Supabase browser clients use localStorage by default, which is domain-specific.
 * For cross-domain auth, we need to manually sync sessions or use the bridge approach.
 */
export function createSupabaseClient() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Note: createBrowserClient doesn't support cookieOptions directly
      // Cookies would require server-side configuration
      // For cross-domain, we use token passing via URL or bridge page
    }
  );

  return supabase;
}

