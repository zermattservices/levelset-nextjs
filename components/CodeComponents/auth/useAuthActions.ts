import { createSupabaseClient } from "@/util/supabase/component";

/**
 * Custom hook for authentication actions that can be used in Plasmic
 */
export function useAuthActions() {
  const supabase = createSupabaseClient();
  
  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: typeof window !== "undefined" ? window.location.origin : undefined } });
      if (error) {
        console.error('Sign in failed:', error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      console.error('Sign in failed:', error);
      return { success: false, error: errorMessage };
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error('Email sign in failed:', error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Email sign in failed';
      console.error('Email sign in failed:', error);
      return { success: false, error: errorMessage };
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        console.error('Email sign up failed:', error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Email sign up failed';
      console.error('Email sign up failed:', error);
      return { success: false, error: errorMessage };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        console.error('Password reset failed:', error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
      console.error('Password reset failed:', error);
      return { success: false, error: errorMessage };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out failed:', error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign out failed';
      console.error('Sign out failed:', error);
      return { success: false, error: errorMessage };
    }
  };

  return {
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    signOut
  };
}

/**
 * Global function that can be called from Plasmic event handlers
 * Only available on client-side
 */
if (typeof window !== 'undefined') {
  (window as any).handleGoogleSignIn = async () => {
    const { signInWithGoogle } = useAuthActions();
    return await signInWithGoogle();
  };

  (window as any).handleEmailSignIn = async (email: string, password: string) => {
    const { signInWithEmail } = useAuthActions();
    return await signInWithEmail(email, password);
  };

  (window as any).handleEmailSignUp = async (email: string, password: string) => {
    const { signUpWithEmail } = useAuthActions();
    return await signUpWithEmail(email, password);
  };

  (window as any).handlePasswordReset = async (email: string) => {
    const { resetPassword } = useAuthActions();
    return await resetPassword(email);
  };

  (window as any).handleSignOut = async () => {
    const { signOut } = useAuthActions();
    return await signOut();
  };
}
