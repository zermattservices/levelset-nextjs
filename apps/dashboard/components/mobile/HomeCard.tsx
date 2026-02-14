import * as React from 'react';
import { Box, Typography } from '@mui/material';

interface HomeCardProps {
  title: string;
  description: string;
  onClick?: () => void;
  children?: React.ReactNode;
}

export function HomeCard({ title, description, onClick, children }: HomeCardProps) {
  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick?.();
        }
      }}
      sx={{
        backgroundColor: 'var(--ls-color-bg-container)',
        borderRadius: '16px',
        border: '1px solid var(--ls-color-muted-border)',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        boxShadow: '0 10px 30px rgba(49, 102, 74, 0.08)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        cursor: 'pointer',
        outline: 'none',
        '&:hover, &:focus-visible': {
          transform: 'translateY(-2px)',
          boxShadow: '0 16px 36px rgba(49, 102, 74, 0.12)',
        },
      }}
    >
      <Typography
        sx={{
          fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontSize: 20,
          fontWeight: 700,
          color: 'var(--ls-color-neutral-soft-foreground)',
        }}
      >
        {title}
      </Typography>
      <Typography
        sx={{
          fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontSize: 15,
          fontWeight: 500,
          color: 'var(--ls-color-text-secondary)',
        }}
      >
        {description}
      </Typography>
      {children}
    </Box>
  );
}

