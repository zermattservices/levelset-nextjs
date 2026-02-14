import * as React from "react";
import { useRouter } from 'next/router';
import { createSupabaseClient } from '@/util/supabase/component';

export interface ClientLoginFormProps {
  className?: string;
  next?: string;
}

export function ClientLoginForm({
  className = "",
  next = "/"
}: ClientLoginFormProps) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const router = useRouter();

  const supabase = createSupabaseClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else if (data.user) {
        // Redirect to the next page after successful login
        router.push(next);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        setError(error.message);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during Google sign in');
    }
  };

  return (
    <div className={`client-login-form ${className}`}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#ffffff',
        fontFamily: '"Satoshi", system-ui, -apple-system, sans-serif',
        padding: '20px'
      }}>
        <div style={{
          maxWidth: '400px',
          width: '100%',
          backgroundColor: '#ffffff',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <img
            src="/logos/levelset-horizontal-lockup.png"
            alt="Levelset"
            style={{ height: '40px', marginBottom: '2rem', display: 'block', margin: '0 auto 2rem auto' }}
          />

          <h1 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#1e293b',
            marginBottom: '8px',
            textAlign: 'center',
            fontFamily: '"Mont", system-ui, -apple-system, sans-serif'
          }}>
            Log in to your account
          </h1>

          <p style={{
            fontSize: '14px',
            color: '#64748b',
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            Enter your email and password to sign in
          </p>

          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '12px',
              borderRadius: '6px',
              marginBottom: '1rem',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '6px'
              }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontFamily: '"Satoshi", system-ui, -apple-system, sans-serif'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '6px'
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontFamily: '"Satoshi", system-ui, -apple-system, sans-serif'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#31664A',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                fontSize: '16px',
                cursor: 'pointer',
                opacity: isLoading ? 0.7 : 1,
                transition: 'opacity 0.2s'
              }}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div style={{
            marginTop: '1.5rem',
            textAlign: 'center'
          }}>
            <p style={{
              fontSize: '14px',
              color: '#64748b',
              margin: '0 0 1rem 0'
            }}>
              Or sign in with
            </p>

            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 24px',
                backgroundColor: '#ffffff',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontWeight: '500',
                fontSize: '14px',
                transition: 'background-color 0.2s',
                minWidth: '200px',
                cursor: 'pointer',
                opacity: isLoading ? 0.7 : 1
              }}
              onMouseOver={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                }
              }}
              onMouseOut={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.backgroundColor = '#ffffff';
                }
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
