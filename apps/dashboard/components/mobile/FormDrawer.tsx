import * as React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTranslation } from 'react-i18next';

interface FormDrawerProps {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel: string;
  disabled?: boolean;
  submitting?: boolean;
  dirty?: boolean;
}

export function FormDrawer({
  open,
  title,
  children,
  onClose,
  onSubmit,
  submitLabel,
  disabled = false,
  submitting = false,
  dirty = false,
}: FormDrawerProps) {
  const { t } = useTranslation('common');
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const attemptClose = React.useCallback(() => {
    if (dirty) {
      setConfirmOpen(true);
      return;
    }
    onClose();
  }, [dirty, onClose]);

  const handleDrawerClose = React.useCallback(
    (_event: React.SyntheticEvent, reason: 'backdropClick' | 'escapeKeyDown') => {
      if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
        attemptClose();
      }
    },
    [attemptClose]
  );

  const handlePrimaryClick = React.useCallback(() => {
    onSubmit();
  }, [onSubmit]);

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={handleDrawerClose}
        ModalProps={{ keepMounted: true }}
        PaperProps={{
          sx: {
            width: '100%',
            maxWidth: '100%',
            height: '100%',
            borderRadius: 0,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'var(--ls-color-neutral-foreground)',
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            padding: '24px 20px 16px',
            backgroundColor: 'var(--ls-color-bg-container)',
            borderBottom: '1px solid var(--ls-color-muted-border)',
          }}
        >
          <IconButton
            aria-label="Go back"
            onClick={attemptClose}
            sx={{
              backgroundColor: 'var(--ls-color-muted-soft)',
              color: 'var(--ls-color-neutral-soft-foreground)',
              '&:hover': { backgroundColor: 'var(--ls-color-muted-border)' },
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography
            component="h2"
            sx={{
              fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--ls-color-neutral-soft-foreground)',
            }}
          >
            {title}
          </Typography>
        </Box>

        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 20px 120px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {children}
        </Box>

        <Box
          sx={{
            position: 'sticky',
            bottom: 0,
            backgroundColor: 'var(--ls-color-bg-container)',
            borderTop: '1px solid var(--ls-color-muted-border)',
            padding: '16px 20px 24px',
          }}
        >
          <Button
            variant="contained"
            onClick={handlePrimaryClick}
            disabled={disabled || submitting}
            sx={{
              width: '100%',
              backgroundColor: 'var(--ls-color-brand)',
              textTransform: 'none',
              fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              fontSize: 16,
              fontWeight: 600,
              padding: '12px 16px',
              borderRadius: '8px',
              '&:hover': {
                backgroundColor: 'var(--ls-color-brand-hover)',
              },
            }}
          >
            {submitting ? t('submitting', 'Submitting…') : submitLabel}
          </Button>
        </Box>
      </Drawer>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle
          sx={{
            fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            fontWeight: 700,
            fontSize: 18,
          }}
        >
          {t('drawer.discardTitle')}
        </DialogTitle>
        <DialogContent>
          <Typography
            sx={{
              fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              fontSize: 14,
              color: 'var(--ls-color-text-secondary)',
            }}
          >
            {t('drawer.discardMessage')}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ padding: '0 20px 16px', gap: 1.5 }}>
          <Button
            onClick={() => setConfirmOpen(false)}
            sx={{
              textTransform: 'none',
              fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              color: 'var(--ls-color-brand)',
              fontWeight: 600,
              borderRadius: '8px',
            }}
          >
            {t('drawer.keepEditing')}
          </Button>
          <Button
            variant="contained"
            sx={{
              textTransform: 'none',
              fontFamily: '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              fontWeight: 600,
              backgroundColor: '#b91c1c',
              color: '#ffffff',
              borderRadius: '8px',
              '&:hover': { backgroundColor: '#991b1b' },
            }}
            onClick={() => {
              setConfirmOpen(false);
              onClose();
            }}
          >
            {t('drawer.discardForm')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

