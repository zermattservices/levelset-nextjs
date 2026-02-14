import * as React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTranslation } from 'react-i18next';

interface PasswordModalProps {
  open: boolean;
  onClose: () => void;
  onProceed: () => void;
  correctPassword: string;
  title?: string;
  description?: string;
}

export function PasswordModal({
  open,
  onClose,
  onProceed,
  correctPassword,
  title,
  description,
}: PasswordModalProps) {
  const { t } = useTranslation('common');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  
  const modalTitle = title ?? t('password.title');
  const modalDescription = description ?? t('password.description');

  const handlePasswordChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setPassword(value);
    setError(null);
  }, []);

  const handleProceed = React.useCallback(() => {
    if (!password || password.trim().length === 0) {
      setError(t('password.empty'));
      return;
    }

    if (password !== correctPassword) {
      setError(t('password.error'));
      return;
    }

    setError(null);
    onProceed();
  }, [password, correctPassword, onProceed, t]);

  const handleClose = React.useCallback(() => {
    setPassword('');
    setError(null);
    onClose();
  }, [onClose]);

  const handleKeyPress = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter') {
        handleProceed();
      }
    },
    [handleProceed]
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          backgroundColor: 'var(--ls-color-bg-container)',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--ls-color-muted-border)',
        }}
      >
        <IconButton
          aria-label="Go back"
          onClick={handleClose}
          sx={{
            backgroundColor: 'var(--ls-color-muted-soft)',
            color: 'var(--ls-color-neutral-soft-foreground)',
            '&:hover': { backgroundColor: 'var(--ls-color-muted-border)' },
          }}
        >
          <ArrowBackIcon />
        </IconButton>
        <DialogTitle
          sx={{
            fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--ls-color-neutral-soft-foreground)',
            padding: 0,
            flex: 1,
          }}
        >
          {modalTitle}
        </DialogTitle>
      </Box>

      <DialogContent sx={{ padding: '24px' }}>
        <Typography
          sx={{
            fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            fontSize: 14,
            color: 'var(--ls-color-text-secondary)',
            marginBottom: 3,
          }}
        >
          {modalDescription}
        </Typography>

        <TextField
          autoFocus
          fullWidth
          label={t('password.label')}
          type="password"
          value={password}
          onChange={handlePasswordChange}
          onKeyPress={handleKeyPress}
          error={Boolean(error)}
          helperText={error || ''}
          sx={{
            '& .MuiInputBase-root': {
              fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              fontSize: 16,
            },
            '& .MuiInputLabel-root': {
              fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: error ? '#dc2626' : 'var(--ls-color-muted-border)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: error ? '#dc2626' : 'var(--ls-color-border)',
            },
            '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: error ? '#dc2626' : 'var(--ls-color-brand)',
              borderWidth: '2px',
            },
          }}
        />
      </DialogContent>

      <DialogActions sx={{ padding: '0 24px 24px', gap: 1.5 }}>
        <Button
          variant="contained"
          onClick={handleProceed}
          disabled={!password || password.trim().length === 0}
          sx={{
            textTransform: 'none',
            fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            fontWeight: 600,
            backgroundColor: 'var(--ls-color-brand)',
            borderRadius: '8px',
            '&:hover': {
              backgroundColor: 'var(--ls-color-brand-hover)',
            },
            '&.Mui-disabled': {
              backgroundColor: 'var(--ls-color-border)',
              color: 'var(--ls-color-disabled-text)',
            },
          }}
        >
          {t('proceed', 'Proceed')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

