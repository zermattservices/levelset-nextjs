import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Box, Button, CircularProgress, Typography } from '@mui/material';

const STORAGE_KEY = 'levelset.mobile.lastToken';

export default function MobileLaunchPage() {
  const router = useRouter();
  const [state, setState] = React.useState<'checking' | 'missing'>('checking');

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const queryToken = typeof router.query.token === 'string' ? router.query.token : null;
    if (queryToken) {
      window.localStorage.setItem(STORAGE_KEY, queryToken);
    }

    const token = window.localStorage.getItem(STORAGE_KEY);
    if (token) {
      router.replace(`/mobile/${token}`).catch(() => setState('missing'));
    } else {
      setState('missing');
    }
  }, [router, router.query.token]);

  return (
    <>
      <Head>
        <title>Levelset Mobile Portal</title>
        <link rel="manifest" href={`/api/mobile/manifest/${router.query.token ?? ''}`} />
        <link rel="icon" href="/Levelset Icon Non Trans.png" />
      </Head>
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: '#f2f5f4',
          padding: '32px 16px 48px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {state === 'checking' ? (
          <CircularProgress color="inherit" />
        ) : (
          <Box
            sx={{
              backgroundColor: 'var(--ls-color-bg-container)',
              borderRadius: '16px',
              border: '1px solid var(--ls-color-muted-border)',
              padding: '32px 28px',
              maxWidth: 420,
              textAlign: 'center',
              boxShadow: '0 16px 40px rgba(17, 24, 39, 0.12)',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <Typography
              sx={{
                fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                fontSize: 22,
                fontWeight: 700,
                color: 'var(--ls-color-neutral-soft-foreground)',
              }}
            >
              Link Required
            </Typography>
            <Typography
              sx={{
                fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                fontSize: 15,
                color: 'var(--ls-color-text-secondary)',
              }}
            >
              Open the Levelset mobile portal from the original location link to register your device for quick access.
            </Typography>
            <Button
              variant="contained"
              onClick={() => router.push('/')}
              sx={{
                textTransform: 'none',
                backgroundColor: 'var(--ls-color-brand)',
                borderRadius: '8px',
                '&:hover': { backgroundColor: 'var(--ls-color-brand-hover)' },
                fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
            >
              Return to Levelset
            </Button>
          </Box>
        )}
      </Box>
    </>
  );
}
