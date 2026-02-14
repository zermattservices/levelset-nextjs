import * as React from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Drawer, IconButton, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface MobileFormDrawerProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

interface MobileFormContextValue {
  setDirty: (dirty: boolean) => void;
}

const MobileFormContext = React.createContext<MobileFormContextValue | undefined>(undefined);

export function useMobileFormContext() {
  const context = React.useContext(MobileFormContext);
  if (!context) {
    throw new Error('useMobileFormContext must be used within a MobileFormDrawer');
  }
  return context;
}

export function MobileFormDrawer({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
}: MobileFormDrawerProps) {
  const [isDirty, setIsDirty] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  const handleRequestClose = React.useCallback(() => {
    if (isDirty) {
      setShowConfirm(true);
      return;
    }
    onClose();
  }, [isDirty, onClose]);

  const handleConfirmDiscard = React.useCallback(() => {
    setShowConfirm(false);
    setIsDirty(false);
    onClose();
  }, [onClose]);

  const handleCancelDiscard = React.useCallback(() => {
    setShowConfirm(false);
  }, []);

  React.useEffect(() => {
    if (!open) {
      setIsDirty(false);
      setShowConfirm(false);
    }
  }, [open]);

  const contextValue = React.useMemo<MobileFormContextValue>(
    () => ({
      setDirty: setIsDirty,
    }),
    []
  );

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={handleRequestClose}
        transitionDuration={250}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: '480px' },
            maxWidth: '100%',
            backgroundColor: 'var(--ls-color-neutral-foreground)',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
        ModalProps={{
          keepMounted: true,
        }}
      >
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              padding: '16px 20px',
              borderBottom: '1px solid var(--ls-color-muted-border)',
              backgroundColor: 'var(--ls-color-bg-container)',
            }}
          >
            <IconButton
              onClick={handleRequestClose}
              aria-label="Go back"
              sx={{
                backgroundColor: '#f5f6f7',
                color: 'var(--ls-color-neutral-soft-foreground)',
                '&:hover': {
                  backgroundColor: 'var(--ls-color-muted-border)',
                },
              }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography sx={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 600, fontSize: 18, color: 'var(--ls-color-neutral-soft-foreground)' }}>
                {title}
              </Typography>
              {subtitle ? (
                <Typography sx={{ fontFamily: 'Satoshi, sans-serif', fontSize: 13, color: 'var(--ls-color-muted)', marginTop: '2px' }}>
                  {subtitle}
                </Typography>
              ) : null}
            </Box>
          </Box>

          <Box sx={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
            <MobileFormContext.Provider value={contextValue}>{children}</MobileFormContext.Provider>
          </Box>

          <Box
            sx={{
              padding: '16px 20px 24px',
              borderTop: '1px solid var(--ls-color-muted-border)',
              backgroundColor: 'var(--ls-color-bg-container)',
            }}
          >
            {footer}
          </Box>
        </Box>
      </Drawer>

      <Dialog open={showConfirm} onClose={handleCancelDiscard}>
        <DialogTitle sx={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 600 }}>Discard this form?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontFamily: 'Satoshi, sans-serif' }}>
            You have unsaved progress. If you leave now, your entries for this form will be lost.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDiscard} sx={{ fontFamily: 'Satoshi, sans-serif', borderRadius: '8px' }}>
            Keep editing
          </Button>
          <Button
            onClick={handleConfirmDiscard}
            color="error"
            variant="contained"
            sx={{ fontFamily: 'Satoshi, sans-serif', textTransform: 'none', borderRadius: '8px' }}
          >
            Discard form
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

