import * as React from "react";
import { createSupabaseClient } from "@/util/supabase/component";

export interface GoogleSignInButtonProps {
  className?: string;
  children?: React.ReactNode;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

export function GoogleSignInButton({ 
  className = "", 
  children,
  onSuccess,
  onError,
  disabled = false
}: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const supabase = createSupabaseClient();

  const handleSignIn = async () => {
    if (disabled || isLoading) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined
        }
      });
      if (error) {
        console.error('Sign in failed:', error);
        onError?.(error.message);
      } else {
        onSuccess?.();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      console.error('Sign in failed:', error);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSignIn}
      disabled={disabled || isLoading}
      className={`google-signin-button ${className}`}
      data-plasmic-name="google-signin-button"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 24px',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        backgroundColor: '#ffffff',
        color: '#374151',
        fontSize: '14px',
        fontWeight: '500',
        cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
        opacity: disabled || isLoading ? 0.6 : 1,
        transition: 'all 0.15s ease-in-out',
        fontFamily: '"Satoshi", system-ui, -apple-system, sans-serif'
      }}
      onMouseEnter={(e) => {
        if (!disabled && !isLoading) {
          e.currentTarget.style.backgroundColor = '#f9fafb';
          e.currentTarget.style.borderColor = '#d1d5db';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !isLoading) {
          e.currentTarget.style.backgroundColor = '#ffffff';
          e.currentTarget.style.borderColor = '#e5e7eb';
        }
      }}
    >
      {isLoading ? (
        <>
          <div className="animate-spin -ml-1 mr-3 h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full"></div>
          Signing in...
        </>
      ) : children || (
        <>
          <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </>
      )}
    </button>
  );
}
