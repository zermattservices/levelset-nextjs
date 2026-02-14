import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Box, CircularProgress } from '@mui/material';
import { LoginPageForm } from '@/components/CodeComponents/auth/LoginPageForm';

export function LoginPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = React.useState(true);

  // Get redirect URL from query params - handle both relative and absolute URLs
  const redirectUrl = React.useMemo(() => {
    const redirect = router.query.redirect;
    if (typeof redirect === 'string') {
      // If it's a full URL (starts with http:// or https://), return as-is
      if (redirect.startsWith('http://') || redirect.startsWith('https://')) {
        return redirect;
      }
      // If it's a relative path, return as-is
      if (redirect.startsWith('/')) {
        return redirect;
      }
    }
    return '/';
  }, [router.query.redirect]);

  // Check if user is already authenticated
  React.useEffect(() => {
    const checkAuth = async () => {
      const supabase = (await import('@/util/supabase/component')).createSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.access_token) {
        // User is already authenticated, redirect immediately
        if (redirectUrl.startsWith('http://') || redirectUrl.startsWith('https://')) {
          const url = new URL(redirectUrl);
          url.searchParams.set('token', session.access_token);
          url.searchParams.set('refresh_token', session.refresh_token || '');
          window.location.href = url.toString();
        } else {
          router.push(redirectUrl);
        }
      } else {
        setCheckingAuth(false);
      }
    };

    if (router.isReady) {
      checkAuth();
    }
  }, [router.isReady, redirectUrl, router]);

  const handleSuccess = async () => {
    const supabase = (await import('@/util/supabase/component')).createSupabaseClient();
    
    // Wait for session to be available (poll with timeout)
    let attempts = 0;
    const maxAttempts = 20; // 2 seconds max wait
    
    const waitForSession = async (): Promise<{ access_token: string; refresh_token: string } | null> => {
      while (attempts < maxAttempts) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          return {
            access_token: session.access_token,
            refresh_token: session.refresh_token || ''
          };
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      return null;
    };

    const session = await waitForSession();

    // If redirect is a full URL (cross-domain), use window.location
    if (redirectUrl.startsWith('http://') || redirectUrl.startsWith('https://')) {
      if (session?.access_token) {
        // Redirect with the access token as a query parameter
        // The roadmap domain will use this to set up the session
        const url = new URL(redirectUrl);
        url.searchParams.set('token', session.access_token);
        url.searchParams.set('refresh_token', session.refresh_token);
        window.location.href = url.toString();
      } else {
        // Fallback: redirect without token (user will need to re-auth on roadmap)
        window.location.href = redirectUrl;
      }
    } else {
      // Relative path, use router
      router.push(redirectUrl);
    }
  };

  // Show loading while checking auth
  if (checkingAuth) {
    return (
      <>
        <Head>
          <title>Levelset | Login</title>
        </Head>
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
          <CircularProgress
            size={32}
            sx={{
              color: '#31664a' /* TODO: Use design token */,
              marginBottom: 2,
            }}
          />
          <Box sx={{ color: '#6b7280', fontSize: 14 }}>Checking authentication...</Box>
        </Box>
      </>
    );
  }

  return (
    <>
      <Head>
        <meta name="twitter:card" content="summary" />
        <title key="title">Levelset | Login</title>
        <meta key="og:title" property="og:title" content="Levelset | Login" />
        <meta key="twitter:title" name="twitter:title" content="Levelset | Login" />
      </Head>

      <style>{`
        body {
          margin: 0;
        }
      `}</style>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          width: '100%',
          backgroundColor: '#f3f4f6',
          padding: 2,
          boxSizing: 'border-box',
        }}
      >
        <Box
          sx={{
            width: '100%',
            maxWidth: 420,
            backgroundColor: '#ffffff',
            borderRadius: 4,
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
            padding: { xs: 3, sm: 4 },
            boxSizing: 'border-box',
          }}
        >
          <LoginPageForm
            onSuccess={handleSuccess}
            showGoogleSignIn={true}
            redirectUrl={redirectUrl}
          />
        </Box>
      </Box>
    </>
  );
}

export default LoginPage;
