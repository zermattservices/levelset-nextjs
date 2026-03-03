import * as React from 'react';
import { useRouter } from 'next/router';
import { createSupabaseClient } from '@/util/supabase/component';

/**
 * Bridge page to transfer auth session from app.levelset.io to roadmap.levelset.io
 * Usage: https://app.levelset.io/auth/bridge?redirect=https://roadmap.levelset.io/path
 *
 * Note: Uses plain HTML/CSS instead of MUI to avoid prerender errors (no ThemeProvider at SSG time).
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
    <div
      style={{
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
      {status === 'error' ? (
        <>
          <div style={{ color: 'var(--ls-color-destructive-vivid)', marginBottom: 16 }}>{error || 'An error occurred'}</div>
          <div style={{ color: 'var(--ls-color-text-tertiary)', fontSize: 14 }}>Redirecting to login...</div>
        </>
      ) : (
        <>
          <div className="auth-spinner" />
          <div style={{ color: 'var(--ls-color-text-tertiary)', fontSize: 14, marginTop: 16 }}>
            {status === 'checking' ? 'Checking authentication...' : 'Redirecting...'}
          </div>
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
