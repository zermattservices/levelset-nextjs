import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Box } from '@mui/material';
import { LoginPageForm } from '@/components/CodeComponents/auth/LoginPageForm';

export function LoginPage() {
  const router = useRouter();

  // Get redirect URL from query params
  const redirectUrl = React.useMemo(() => {
    const redirect = router.query.redirect;
    if (typeof redirect === 'string' && redirect.startsWith('/')) {
      return redirect;
    }
    return '/';
  }, [router.query.redirect]);

  const handleSuccess = async () => {
    router.push(redirectUrl);
  };

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
          />
        </Box>
      </Box>
    </>
  );
}

export default LoginPage;
