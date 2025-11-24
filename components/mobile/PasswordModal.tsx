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
          backgroundColor: '#ffffff',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          padding: '20px 24px 16px',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <IconButton
          aria-label="Go back"
          onClick={handleClose}
          sx={{
            backgroundColor: '#f3f4f6',
            color: '#111827',
            '&:hover': { backgroundColor: '#e5e7eb' },
          }}
        >
          <ArrowBackIcon />
        </IconButton>
        <DialogTitle
          sx={{
            fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            fontSize: 20,
            fontWeight: 700,
            color: '#111827',
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
            color: '#4b5563',
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
              borderColor: error ? '#dc2626' : '#e5e7eb',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: error ? '#dc2626' : '#d1d5db',
            },
            '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: error ? '#dc2626' : '#31664a',
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
            backgroundColor: '#31664a',
            borderRadius: '8px',
            '&:hover': {
              backgroundColor: '#264d38',
            },
            '&.Mui-disabled': {
              backgroundColor: '#d1d5db',
              color: '#9ca3af',
            },
          }}
        >
          {t('proceed', 'Proceed')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

