import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { createSupabaseClient } from '@/util/supabase/component';

interface InviteData {
  firstName: string;
  lastName: string;
  email: string;
  orgName: string;
  role: string;
  token: string;
}

export function SignupPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = React.useState(true);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [inviteData, setInviteData] = React.useState<InviteData | null>(null);
  const [emailSent, setEmailSent] = React.useState(false);
  const [resendLoading, setResendLoading] = React.useState(false);
  const [resendCooldown, setResendCooldown] = React.useState(0);

  const supabase = createSupabaseClient();

  // Check if user is already authenticated + handle invite token
  React.useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      // Check for invite token
      const inviteToken = router.query.invite as string;
      if (inviteToken) {
        try {
          const res = await fetch(`/api/onboarding/validate-invite?token=${inviteToken}`);
          if (res.ok) {
            const data = await res.json();
            setInviteData({
              firstName: data.firstName,
              lastName: data.lastName,
              email: data.email,
              orgName: data.orgName,
              role: data.role,
              token: inviteToken,
            });
            setEmail(data.email || '');
          }
        } catch {
          // Invalid invite — still allow signup
        }
      }

      if (session?.access_token) {
        // If already authenticated and there's an invite, accept it first
        if (inviteToken) {
          try {
            await fetch('/api/onboarding/accept-invite', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({ token: inviteToken }),
            });
          } catch {
            // Non-fatal
          }
        }
        router.push(inviteToken ? '/' : '/onboarding');
      } else {
        setCheckingAuth(false);
      }
    };

    if (router.isReady) {
      checkAuth();
    }
  }, [router.isReady]);

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email || !password || !confirmPassword) {
      setErrorMessage('Please fill in all fields');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?redirect=/onboarding`,
        },
      });

      if (error) {
        setErrorMessage(error.message || 'Sign up failed');
        return;
      }

      // If Supabase requires email confirmation
      if (data.user && !data.session) {
        setEmailSent(true);
        setErrorMessage(null);
        return;
      }

      // If auto-confirmed (session exists immediately)
      if (data.session) {
        // Accept invite if present
        if (inviteData?.token) {
          try {
            await fetch('/api/onboarding/accept-invite', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${data.session.access_token}`,
              },
              body: JSON.stringify({ token: inviteData.token }),
            });
            router.push('/');
            return;
          } catch {
            // Non-fatal — still redirect
          }
        }
        router.push('/onboarding');
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setErrorMessage(null);
    setGoogleLoading(true);
    try {
      const redirectPath = inviteData?.token ? `/?invite=${inviteData.token}` : '/onboarding';
      const callbackUrl = new URL(window.location.origin + '/auth/callback');
      callbackUrl.searchParams.set('redirect', redirectPath);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl.toString(),
        },
      });

      if (error) {
        setErrorMessage(error.message || 'Google sign-up failed');
        setGoogleLoading(false);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Google sign-up failed');
      setGoogleLoading(false);
    }
  };

  // Resend cooldown timer
  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleResendEmail = async () => {
    setResendLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?redirect=/onboarding`,
        },
      });
      if (error) {
        setErrorMessage(error.message || 'Failed to resend email');
      } else {
        setSuccessMessage('Verification email resent. Check your inbox.');
        setResendCooldown(60);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to resend email');
    } finally {
      setResendLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <>
        <Head>
          <title>Levelset | Sign Up</title>
        </Head>
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
          <div
            style={{
              width: 32,
              height: 32,
              border: '3px solid var(--ls-color-muted-border)',
              borderTopColor: 'var(--ls-color-brand)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              marginBottom: 16,
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ color: 'var(--ls-color-muted)', fontSize: 14 }}>Checking authentication...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Levelset | Start Free Trial</title>
      </Head>

      <style>{`body { margin: 0; }`}</style>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          width: '100%',
          backgroundColor: 'var(--ls-color-muted-soft)',
          padding: 16,
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 420,
            backgroundColor: 'var(--ls-color-bg-container)',
            borderRadius: 16,
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
            padding: 32,
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              fontFamily: '"Satoshi", system-ui, -apple-system, sans-serif',
            }}
          >
            {/* Logo */}
            <div style={{ marginBottom: '32px', textAlign: 'center' }}>
              <img
                src="/logos/levelset-horizontal-lockup.png"
                alt="Levelset"
                style={{ height: '40px', width: 'auto', maxWidth: '200px' }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.parentElement?.querySelector('.logo-fallback') as HTMLElement;
                  if (fallback) fallback.style.display = 'block';
                }}
              />
              <h1
                className="logo-fallback"
                style={{
                  fontSize: '32px',
                  fontWeight: '700',
                  color: 'var(--ls-color-brand)',
                  margin: 0,
                  fontFamily: '"Satoshi", system-ui, -apple-system, sans-serif',
                  display: 'none',
                }}
              >
                Levelset
              </h1>
            </div>

            {emailSent ? (
              <>
                {/* Email confirmation state */}
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    backgroundColor: 'var(--ls-color-success-soft)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 20,
                  }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--ls-color-success-base)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M22 4L12 13L2 4" />
                  </svg>
                </div>

                <h2
                  style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    color: 'var(--ls-color-neutral-soft-foreground)',
                    margin: '0 0 8px 0',
                    textAlign: 'center',
                    fontFamily: '"Mont", system-ui, -apple-system, sans-serif',
                  }}
                >
                  Check your email
                </h2>

                <p
                  style={{
                    fontSize: '15px',
                    color: 'var(--ls-color-muted)',
                    margin: '0 0 24px 0',
                    textAlign: 'center',
                    lineHeight: '1.5',
                  }}
                >
                  We sent a verification link to your email.
                  <br />
                  Click the link to continue setting up your account.
                </p>

                {/* Error message */}
                {errorMessage && (
                  <div
                    style={{
                      width: '100%',
                      marginBottom: '16px',
                      padding: '12px 16px',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fca5a5',
                      borderRadius: '8px',
                      color: '#b91c1c',
                      fontSize: '14px',
                    }}
                  >
                    {errorMessage}
                  </div>
                )}

                {/* Success message (resend confirmation) */}
                {successMessage && (
                  <div
                    style={{
                      width: '100%',
                      marginBottom: '16px',
                      padding: '12px 16px',
                      backgroundColor: '#f0fdf4',
                      border: '1px solid #86efac',
                      borderRadius: '8px',
                      color: '#166534',
                      fontSize: '14px',
                    }}
                  >
                    {successMessage}
                  </div>
                )}

                {/* Disabled email field */}
                <div style={{ width: '100%', marginBottom: '16px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: 'var(--ls-color-muted)',
                      marginBottom: '6px',
                    }}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: '16px',
                      border: '1px solid var(--ls-color-muted-border)',
                      borderRadius: '8px',
                      backgroundColor: 'var(--ls-color-muted-soft)',
                      color: 'var(--ls-color-muted)',
                      fontFamily: '"Satoshi", system-ui, -apple-system, sans-serif',
                      outline: 'none',
                      boxSizing: 'border-box',
                      height: '48px',
                      cursor: 'not-allowed',
                    }}
                  />
                </div>

                {/* Resend email button */}
                <button
                  type="button"
                  onClick={handleResendEmail}
                  disabled={resendLoading || resendCooldown > 0}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '15px',
                    fontWeight: '600',
                    backgroundColor: 'transparent',
                    color: resendCooldown > 0 ? 'var(--ls-color-muted)' : 'var(--ls-color-brand)',
                    border: `1px solid ${resendCooldown > 0 ? 'var(--ls-color-muted-border)' : 'var(--ls-color-brand)'}`,
                    borderRadius: '8px',
                    cursor: (resendLoading || resendCooldown > 0) ? 'not-allowed' : 'pointer',
                    fontFamily: '"Satoshi", system-ui, -apple-system, sans-serif',
                    opacity: resendLoading ? 0.7 : 1,
                    transition: 'all 0.2s ease',
                  }}
                >
                  {resendLoading
                    ? 'Sending...'
                    : resendCooldown > 0
                    ? `Resend email (${resendCooldown}s)`
                    : 'Resend verification email'}
                </button>

                {/* Back to signup link */}
                <p
                  style={{
                    marginTop: '24px',
                    fontSize: '14px',
                    color: 'var(--ls-color-muted)',
                    textAlign: 'center',
                  }}
                >
                  Wrong email?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setEmailSent(false);
                      setSuccessMessage(null);
                      setErrorMessage(null);
                      setPassword('');
                      setConfirmPassword('');
                    }}
                    style={{
                      color: 'var(--ls-color-brand)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: '500',
                      fontSize: '14px',
                      fontFamily: '"Satoshi", system-ui, -apple-system, sans-serif',
                      padding: 0,
                      textDecoration: 'none',
                    }}
                  >
                    Start over
                  </button>
                </p>
              </>
            ) : (
              <>
                {/* Heading */}
                <h2
                  style={{
                    fontSize: '28px',
                    fontWeight: '700',
                    color: 'var(--ls-color-neutral-soft-foreground)',
                    margin: '0 0 8px 0',
                    textAlign: 'center',
                    fontFamily: '"Mont", system-ui, -apple-system, sans-serif',
                  }}
                >
                  {inviteData ? `Join ${inviteData.orgName}` : 'Start your free trial'}
                </h2>

                <p
                  style={{
                    fontSize: '16px',
                    color: 'var(--ls-color-muted)',
                    margin: '0 0 32px 0',
                    textAlign: 'center',
                  }}
                >
                  {inviteData
                    ? `You've been invited as a ${inviteData.role}. Create an account to get started.`
                    : 'Create an account to get started with Levelset.'}
                </p>

                {/* Error message */}
                {errorMessage && (
                  <div
                    style={{
                      width: '100%',
                      marginBottom: '16px',
                      padding: '12px 16px',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fca5a5',
                      borderRadius: '8px',
                      color: '#b91c1c',
                      fontSize: '14px',
                    }}
                  >
                    {errorMessage}
                  </div>
                )}

                {/* Google Sign Up Button (primary option) */}
                <button
                  type="button"
                  onClick={handleGoogleSignUp}
                  disabled={googleLoading}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '16px',
                    fontWeight: '500',
                    backgroundColor: 'var(--ls-color-bg-container)',
                    color: 'var(--ls-color-neutral-soft-foreground)',
                    border: '1px solid var(--ls-color-muted-border)',
                    borderRadius: '8px',
                    cursor: googleLoading ? 'not-allowed' : 'pointer',
                    fontFamily: '"Satoshi", system-ui, -apple-system, sans-serif',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    opacity: googleLoading ? 0.7 : 1,
                    transition: 'all 0.2s ease',
                    marginBottom: '16px',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  {googleLoading ? 'Signing up...' : 'Sign up with Google'}
                </button>

                {/* Divider */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    marginBottom: '16px',
                    gap: '12px',
                  }}
                >
                  <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--ls-color-muted-border)' }} />
                  <span style={{ fontSize: '13px', color: 'var(--ls-color-muted)' }}>or</span>
                  <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--ls-color-muted-border)' }} />
                </div>

                {/* Email/Password Form */}
                <form onSubmit={handleEmailSignUp} style={{ width: '100%' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address"
                      required
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        fontSize: '16px',
                        border: '1px solid var(--ls-color-muted-border)',
                        borderRadius: '8px',
                        backgroundColor: 'var(--ls-color-bg-container)',
                        color: 'var(--ls-color-neutral-soft-foreground)',
                        fontFamily: '"Satoshi", system-ui, -apple-system, sans-serif',
                        outline: 'none',
                        boxSizing: 'border-box',
                        height: '48px',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'var(--ls-color-brand)';
                        e.target.style.boxShadow = '0 0 0 3px rgba(49, 102, 74, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'var(--ls-color-muted-border)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password (min 8 characters)"
                      required
                      minLength={8}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        fontSize: '16px',
                        border: '1px solid var(--ls-color-muted-border)',
                        borderRadius: '8px',
                        backgroundColor: 'var(--ls-color-bg-container)',
                        color: 'var(--ls-color-neutral-soft-foreground)',
                        fontFamily: '"Satoshi", system-ui, -apple-system, sans-serif',
                        outline: 'none',
                        boxSizing: 'border-box',
                        height: '48px',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'var(--ls-color-brand)';
                        e.target.style.boxShadow = '0 0 0 3px rgba(49, 102, 74, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'var(--ls-color-muted-border)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      required
                      minLength={8}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        fontSize: '16px',
                        border: '1px solid var(--ls-color-muted-border)',
                        borderRadius: '8px',
                        backgroundColor: 'var(--ls-color-bg-container)',
                        color: 'var(--ls-color-neutral-soft-foreground)',
                        fontFamily: '"Satoshi", system-ui, -apple-system, sans-serif',
                        outline: 'none',
                        boxSizing: 'border-box',
                        height: '48px',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'var(--ls-color-brand)';
                        e.target.style.boxShadow = '0 0 0 3px rgba(49, 102, 74, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'var(--ls-color-muted-border)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: '16px',
                      fontWeight: '600',
                      backgroundColor: 'var(--ls-color-brand)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      fontFamily: '"Satoshi", system-ui, -apple-system, sans-serif',
                      opacity: isLoading ? 0.7 : 1,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {isLoading ? 'Creating account...' : 'Create account'}
                  </button>
                </form>

                {/* Login link */}
                <p
                  style={{
                    marginTop: '24px',
                    fontSize: '14px',
                    color: 'var(--ls-color-muted)',
                    textAlign: 'center',
                  }}
                >
                  Already have an account?{' '}
                  <a
                    href="/auth/login"
                    style={{ color: 'var(--ls-color-brand)', textDecoration: 'none', fontWeight: '500' }}
                  >
                    Log in
                  </a>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
