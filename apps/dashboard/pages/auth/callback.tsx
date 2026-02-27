import * as React from 'react';
import { useRouter } from 'next/router';
import { createSupabaseClient } from '@/util/supabase/component';

/**
 * OAuth callback page — waits for Supabase to establish the session, then redirects.
 *
 * Note: Uses plain HTML/CSS instead of MUI to avoid prerender errors (no ThemeProvider at SSG time).
 */
export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const handleCallback = async () => {
      const supabase = createSupabaseClient();

      // Get the redirect URL from query params
      const redirectParam = router.query.redirect;
      const redirectUrl = typeof redirectParam === 'string' ? redirectParam : '/';

      try {
        // Supabase handles the OAuth callback automatically via URL hash
        // We just need to wait for the session to be established
        let attempts = 0;
        const maxAttempts = 30; // 3 seconds max wait

        while (attempts < maxAttempts) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            // Session is ready, now handle redirect
            if (redirectUrl.startsWith('http://') || redirectUrl.startsWith('https://')) {
              // Cross-domain redirect - pass tokens
              const url = new URL(redirectUrl);
              url.searchParams.set('token', session.access_token);
              url.searchParams.set('refresh_token', session.refresh_token || '');
              window.location.href = url.toString();
            } else {
              // Same-domain redirect
              router.push(redirectUrl);
            }
            return;
          }
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        // If we get here, session wasn't established
        setError('Authentication failed. Please try again.');
        setTimeout(() => {
          router.push('/auth/login');
        }, 2000);
      } catch (err) {
        console.error('Auth callback error:', err);
        setError('An error occurred during authentication.');
        setTimeout(() => {
          router.push('/auth/login');
        }, 2000);
      }
    };

    if (router.isReady) {
      handleCallback();
    }
  }, [router.isReady, router.query.redirect, router]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#f5f5f5',
        fontFamily: '"Satoshi", system-ui, -apple-system, sans-serif',
      }}
    >
      {error ? (
        <>
          <div style={{ color: '#dc2626', marginBottom: 16 }}>{error}</div>
          <div style={{ color: '#888', fontSize: 14 }}>Redirecting to login...</div>
        </>
      ) : (
        <>
          <div className="auth-spinner" />
          <div style={{ color: '#888', fontSize: 14, marginTop: 16 }}>Completing sign in...</div>
        </>
      )}
      <style jsx>{`
        .auth-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #e5e7eb;
          border-top-color: #2563eb;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
