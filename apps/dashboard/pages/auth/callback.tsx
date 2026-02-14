import * as React from 'react';
import { useRouter } from 'next/router';
import { createSupabaseClient } from '@/util/supabase/component';
import { Box, CircularProgress } from '@mui/material';

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
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100%',
        backgroundColor: 'var(--ls-color-muted-soft)',
        fontFamily: '"Satoshi", system-ui, -apple-system, sans-serif',
      }}
    >
      {error ? (
        <>
          <Box sx={{ color: '#dc2626', marginBottom: 2 }}>{error}</Box>
          <Box sx={{ color: 'var(--ls-color-muted)', fontSize: 14 }}>Redirecting to login...</Box>
        </>
      ) : (
        <>
          <CircularProgress
            size={32}
            sx={{
              color: 'var(--ls-color-brand)',
              marginBottom: 2,
            }}
          />
          <Box sx={{ color: 'var(--ls-color-muted)', fontSize: 14 }}>Completing sign in...</Box>
        </>
      )}
    </Box>
  );
}
