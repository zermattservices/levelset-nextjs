import * as React from "react";
import { createSupabaseClient } from "@/util/supabase/component";

export interface LoginPageFormProps {
  className?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  showGoogleSignIn?: boolean;
  redirectUrl?: string;
}

export function LoginPageForm({ 
  className = "", 
  onSuccess,
  onError,
  showGoogleSignIn = true,
  redirectUrl
}: LoginPageFormProps) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const supabase = createSupabaseClient();

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      const message = "Please enter both email and password";
      setErrorMessage(message);
      onError?.(message);
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        const message = error.message || "Incorrect email or password";
        setErrorMessage(message);
        onError?.(message);
      } else {
        setErrorMessage(null);
        onSuccess?.();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sign in failed";
      setErrorMessage(message);
      onError?.(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setGoogleLoading(true);
    try {
      // For OAuth, we need to handle the redirect properly
      // If redirectUrl is a cross-domain URL, we'll handle it after OAuth callback
      // Otherwise, use the redirectUrl or default to current origin
      let oauthRedirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
      
      // If we have a redirect URL, encode it as a parameter to pass through OAuth
      if (redirectUrl) {
        const callbackUrl = new URL(window.location.origin + '/auth/callback');
        callbackUrl.searchParams.set('redirect', redirectUrl);
        oauthRedirectTo = callbackUrl.toString();
      }
      
      const { error } = await supabase.auth.signInWithOAuth({ 
        provider: 'google',
        options: {
          redirectTo: oauthRedirectTo
        }
      });
      
      if (error) {
        const message = error.message || "Google sign-in failed";
        setErrorMessage(message);
        onError?.(message);
        setGoogleLoading(false);
      }
      // Note: onSuccess won't be called for OAuth as it redirects away
      // The redirect will be handled by the callback page
    } catch (error) {
      const message = error instanceof Error ? error.message : "Google sign-in failed";
      setErrorMessage(message);
      onError?.(message);
      setGoogleLoading(false);
    }
  };

  return (
    <div className={`login-page-form ${className}`} data-plasmic-name="login-page-form">
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        fontFamily: '"Satoshi", system-ui, -apple-system, sans-serif',
        padding: '40px 0',
      }}>
        {/* Logo */}
        <div style={{ marginBottom: '40px', textAlign: 'center' }} data-plasmic-name="logo">
          <img 
            src="/logos/levelset-horizontal-lockup.png" 
            alt="Levelset" 
            style={{
              height: '40px',
              width: 'auto',
              maxWidth: '200px'
            }}
            onError={(e) => {
              // Fallback to text if image fails to load
              e.currentTarget.style.display = 'none';
              const fallback = e.currentTarget.parentElement?.querySelector('.logo-fallback') as HTMLElement;
              if (fallback) fallback.style.display = 'block';
            }}
          />
          {/* Fallback text logo if image fails to load */}
          <h1 className="logo-fallback" style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#31664A',
            margin: 0,
            textAlign: 'center',
            position: 'relative',
            fontFamily: '"Satoshi", system-ui, -apple-system, sans-serif',
            display: 'none'
          }}>
            Levelset
            {/* Logo styling with two parallel lines centered under the text */}
            <div style={{
              position: 'absolute',
              bottom: '-4px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '16px',
              height: '2px',
              backgroundColor: '#31664A',
              borderRadius: '1px'
            }}></div>
            <div style={{
              position: 'absolute',
              bottom: '-8px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '20px',
              height: '2px',
              backgroundColor: '#31664A',
              borderRadius: '1px'
            }}></div>
          </h1>
        </div>

        {/* Main Title */}
        <h2 style={{
          fontSize: '28px',
          fontWeight: '700',
          color: '#111827',
          margin: '0 0 8px 0',
          textAlign: 'center',
          fontFamily: '"Mont", system-ui, -apple-system, sans-serif'
        }} data-plasmic-name="main-title">
          Log in to your account
        </h2>

        {/* Subtitle */}
        <p style={{
          fontSize: '16px',
          fontWeight: '400',
          color: '#6b7280',
          margin: '0 0 32px 0',
          textAlign: 'center',
          fontFamily: '"Satoshi", system-ui, -apple-system, sans-serif'
        }} data-plasmic-name="subtitle">
          Welcome back! Please enter your details.
        </p>

        {errorMessage && (
          <div
            data-plasmic-name="error-banner"
            style={{
              width: '100%',
              maxWidth: '400px',
              marginBottom: '16px',
              padding: '12px 16px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fca5a5',
              borderRadius: '8px',
              color: '#b91c1c',
              fontFamily: '"Satoshi", system-ui, -apple-system, sans-serif',
              fontSize: '14px',
            }}
          >
            {errorMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleEmailSignIn} style={{ width: '100%', maxWidth: '400px' }}>
          {/* Email Input */}
          <div style={{ marginBottom: '16px' }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email..."
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '16px',
                border: '1px solid ' + (errorMessage ? '#fca5a5' : '#e5e7eb'),
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                color: '#111827',
                fontFamily: '"Satoshi", system-ui, -apple-system, sans-serif',
                outline: 'none',
                boxSizing: 'border-box',
                height: '48px',
                lineHeight: '24px',
                verticalAlign: 'middle',
                display: 'flex',
                alignItems: 'center'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#31664A';
                e.target.style.boxShadow = '0 0 0 3px rgba(49, 102, 74, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = errorMessage ? '#fca5a5' : '#e5e7eb';
                e.target.style.boxShadow = 'none';
              }}
              data-plasmic-name="email-input"
            />
          </div>

          {/* Password Input */}
          <div style={{ marginBottom: '24px' }}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="........."
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '16px',
                border: '1px solid ' + (errorMessage ? '#fca5a5' : '#e5e7eb'),
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                color: '#111827',
                fontFamily: '"Satoshi", system-ui, -apple-system, sans-serif',
                outline: 'none',
                boxSizing: 'border-box',
                height: '48px',
                lineHeight: '24px',
                verticalAlign: 'middle',
                display: 'flex',
                alignItems: 'center'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#31664A';
                e.target.style.boxShadow = '0 0 0 3px rgba(49, 102, 74, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = errorMessage ? '#fca5a5' : '#e5e7eb';
                e.target.style.boxShadow = 'none';
              }}
              data-plasmic-name="password-input"
            />
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '16px',
              fontWeight: '600',
              backgroundColor: '#31664A',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontFamily: '"Satoshi", system-ui, -apple-system, sans-serif',
              marginBottom: showGoogleSignIn ? '16px' : '0',
              opacity: isLoading ? 0.7 : 1,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.backgroundColor = '#2a5a3f';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.backgroundColor = '#31664A';
              }
            }}
            data-plasmic-name="signin-button"
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {/* Google Sign In Button */}
        {showGoogleSignIn && (
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            style={{
              width: '100%',
              maxWidth: '400px',
              padding: '12px 16px',
              fontSize: '16px',
              fontWeight: '500',
              backgroundColor: '#ffffff',
              color: '#111827',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              cursor: googleLoading ? 'not-allowed' : 'pointer',
              fontFamily: '"Satoshi", system-ui, -apple-system, sans-serif',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              opacity: googleLoading ? 0.7 : 1,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (!googleLoading) {
                e.currentTarget.style.backgroundColor = '#f9fafb';
                e.currentTarget.style.borderColor = '#d1d5db';
              }
            }}
            onMouseLeave={(e) => {
              if (!googleLoading) {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }
            }}
            data-plasmic-name="google-signin-button"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {googleLoading ? 'Signing in...' : 'Sign in with Google'}
          </button>
        )}
      </div>
    </div>
  );
}
