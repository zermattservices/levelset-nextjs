import { createSupabaseClient } from "@/util/supabase/component";

// Global logout function that can be called from anywhere
export async function logoutUser(): Promise<void> {
  try {
    const supabase = createSupabaseClient();
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Logout error:', error);
      throw error;
    }
    
    // Redirect to login page
    window.location.href = "/auth/login";
  } catch (err) {
    console.error('Logout error:', err);
    throw err;
  }
}

// Make it available globally for Plasmic
if (typeof window !== 'undefined') {
  (window as any).logoutUser = logoutUser;
}
