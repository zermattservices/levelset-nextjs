'use client';

import * as React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import { theme, colors } from '@/lib/theme';

const montFont = "'Mont', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: colors.backgroundGrey,
          p: 2,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            maxWidth: 440,
            p: 4,
            borderRadius: 4,
            boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.08)',
            bgcolor: colors.backgroundDefault,
          }}
        >
          {/* Logo */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              mb: 4,
            }}
          >
            <Box
              component="img"
              src="/levelset-logo.svg"
              alt="Levelset"
              sx={{
                height: 40,
                width: 'auto',
              }}
            />
          </Box>

          {/* Title */}
          {title && (
            <Typography
              variant="h1"
              sx={{
                fontFamily: montFont,
                fontSize: 24,
                fontWeight: 700,
                color: colors.textPrimary,
                textAlign: 'center',
                mb: 1,
              }}
            >
              {title}
            </Typography>
          )}

          {/* Subtitle */}
          {subtitle && (
            <Typography
              sx={{
                fontFamily: "'Satoshi', system-ui, sans-serif",
                fontSize: 14,
                color: colors.textSecondary,
                textAlign: 'center',
                mb: 4,
              }}
            >
              {subtitle}
            </Typography>
          )}

          {/* Content */}
          {children}
        </Paper>
      </Box>
    </ThemeProvider>
  );
}

export default AuthLayout;
