import * as React from 'react';
import { useRouter } from 'next/router';
import { createSupabaseClient } from '@/util/supabase/component';
import { Box, CircularProgress } from '@mui/material';

/**
 * Bridge page to transfer auth session from app.levelset.io to roadmap.levelset.io
 * Usage: https://app.levelset.io/auth/bridge?redirect=https://roadmap.levelset.io/path
 */
export default function AuthBridge() {
  const router = useRouter();
  const [status, setStatus] = React.useState<'checking' | 'redirecting' | 'error'>('checking');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const handleBridge = async () => {
      if (!router.isReady) return;

      const redirectParam = router.query.redirect;
      if (!redirectParam || typeof redirectParam !== 'string') {
        setError('Missing redirect parameter');
        setStatus('error');
        return;
      }

      try {
        const supabase = createSupabaseClient();
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session?.access_token) {
          // No session, redirect to login with the original redirect
          const loginUrl = new URL('/auth/login', window.location.origin);
          loginUrl.searchParams.set('redirect', redirectParam);
          window.location.href = loginUrl.toString();
          return;
        }

        // Session exists, redirect to target with tokens
        setStatus('redirecting');
        const targetUrl = new URL(redirectParam);
        targetUrl.searchParams.set('token', session.access_token);
        targetUrl.searchParams.set('refresh_token', session.refresh_token || '');
        window.location.href = targetUrl.toString();
      } catch (err) {
        console.error('Bridge error:', err);
        setError('An error occurred');
        setStatus('error');
      }
    };

    handleBridge();
  }, [router.isReady, router.query.redirect]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#f3f4f6',
        fontFamily: '"Satoshi", system-ui, -apple-system, sans-serif',
      }}
    >
      {status === 'error' ? (
        <>
          <Box sx={{ color: '#dc2626', marginBottom: 2 }}>{error || 'An error occurred'}</Box>
          <Box sx={{ color: '#6b7280', fontSize: 14 }}>Redirecting to login...</Box>
        </>
      ) : (
        <>
          <CircularProgress
            size={32}
            sx={{
              color: '#31664a',
              marginBottom: 2,
            }}
          />
          <Box sx={{ color: '#6b7280', fontSize: 14 }}>
            {status === 'checking' ? 'Checking authentication...' : 'Redirecting...'}
          </Box>
        </>
      )}
    </Box>
  );
}
