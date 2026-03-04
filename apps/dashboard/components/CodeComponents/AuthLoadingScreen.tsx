import * as React from 'react';
import Image from 'next/image';
import { Box, CircularProgress } from '@mui/material';
import { useTheme } from '@/lib/providers/ThemeProvider';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export function AuthLoadingScreen() {
  const { resolvedTheme } = useTheme();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100%',
        backgroundColor: 'var(--ls-color-neutral-foreground)',
        fontFamily,
      }}
    >
      <Image
        src={resolvedTheme === 'dark' ? '/logos/Levelset White no margin.png' : '/logos/Levelset no margin.png'}
        alt="Levelset"
        width={180}
        height={50}
        priority
        style={{ marginBottom: 24 }}
      />
      <CircularProgress
        size={28}
        thickness={4}
        sx={{
          color: 'var(--ls-color-brand)',
        }}
      />
    </Box>
  );
}

export default AuthLoadingScreen;
