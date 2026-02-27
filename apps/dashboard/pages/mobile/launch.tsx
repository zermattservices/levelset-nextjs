import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

const STORAGE_KEY = 'levelset.mobile.lastToken';

/**
 * Mobile launch page — checks for a saved location token and redirects.
 *
 * Note: Uses plain HTML/CSS instead of MUI to avoid prerender errors (no ThemeProvider at SSG time).
 */
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
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#f2f5f4',
          padding: '32px 16px 48px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        {state === 'checking' ? (
          <div className="launch-spinner" />
        ) : (
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: 16,
              border: '1px solid #e5e5e5',
              padding: '32px 28px',
              maxWidth: 420,
              textAlign: 'center',
              boxShadow: '0 16px 40px rgba(17, 24, 39, 0.12)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: '#333',
              }}
            >
              Link Required
            </div>
            <div
              style={{
                fontSize: 15,
                color: '#666',
                lineHeight: 1.5,
              }}
            >
              Open the Levelset mobile portal from the original location link to register your device for quick access.
            </div>
            <button
              onClick={() => router.push('/')}
              style={{
                backgroundColor: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 20px',
                fontSize: 15,
                fontWeight: 600,
                fontFamily: 'inherit',
                cursor: 'pointer',
                marginTop: 8,
              }}
            >
              Return to Levelset
            </button>
          </div>
        )}
      </div>
      <style jsx>{`
        .launch-spinner {
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
    </>
  );
}
