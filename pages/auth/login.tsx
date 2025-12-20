import * as React from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  TextField,
  Button,
  Alert,
  Divider,
  Typography,
  CircularProgress,
} from '@mui/material';
import { AuthLayout } from '@/components/layouts/AuthLayout';
import { createSupabaseClient } from '@/util/supabase/component';
import { colors } from '@/lib/theme';

const satoshiFont = "'Satoshi', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

function LoginPage() {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const router = useRouter();

  const supabase = createSupabaseClient();

  // Check if user is already logged in
  React.useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/');
      }
    };
    checkSession();
  }, [supabase, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message || 'Incorrect email or password');
      } else {
        router.push('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      });

      if (oauthError) {
        setError(oauthError.message || 'Google sign-in failed');
        setGoogleLoading(false);
      }
      // Don't set loading to false on success - redirect will happen
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
      setGoogleLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Log in to your account"
      subtitle="Welcome back! Please enter your details."
    >
      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 3,
            fontFamily: satoshiFont,
            fontSize: 14,
          }}
        >
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit}>
        <TextField
          fullWidth
          type="email"
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
          sx={{
            mb: 2,
            '& .MuiInputBase-root': {
              fontFamily: satoshiFont,
            },
            '& .MuiInputLabel-root': {
              fontFamily: satoshiFont,
            },
          }}
        />

        <TextField
          fullWidth
          type="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
          sx={{
            mb: 3,
            '& .MuiInputBase-root': {
              fontFamily: satoshiFont,
            },
            '& .MuiInputLabel-root': {
              fontFamily: satoshiFont,
            },
          }}
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          disabled={isLoading}
          sx={{
            py: 1.5,
            fontFamily: satoshiFont,
            fontSize: 16,
            fontWeight: 600,
            bgcolor: colors.primary,
            '&:hover': {
              bgcolor: colors.primaryDark,
            },
            '&:disabled': {
              bgcolor: colors.primary,
              opacity: 0.7,
            },
          }}
        >
          {isLoading ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            'Sign in'
          )}
        </Button>
      </Box>

      <Divider sx={{ my: 3 }}>
        <Typography
          sx={{
            fontFamily: satoshiFont,
            fontSize: 14,
            color: colors.textSecondary,
          }}
        >
          Or
        </Typography>
      </Divider>

      <Button
        fullWidth
        variant="outlined"
        onClick={handleGoogleSignIn}
        disabled={googleLoading || isLoading}
        startIcon={
          googleLoading ? (
            <CircularProgress size={20} />
          ) : (
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
          )
        }
        sx={{
          py: 1.5,
          fontFamily: satoshiFont,
          fontSize: 16,
          fontWeight: 500,
          color: colors.textPrimary,
          borderColor: colors.divider,
          '&:hover': {
            borderColor: colors.border,
            bgcolor: colors.backgroundGrey,
          },
        }}
      >
        Sign in with Google
      </Button>
    </AuthLayout>
  );
}

export default LoginPage;
