/**
 * CancelSubscriptionModal
 * Confirmation dialog for canceling a subscription.
 */

import * as React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

interface CancelSubscriptionModalProps {
  open: boolean;
  onClose: () => void;
  orgId: string;
  isTrialing: boolean;
  trialEndDate: string | null;
  periodEndDate: string;
}

const fontFamily = '"Satoshi", sans-serif';

export function CancelSubscriptionModal({
  open,
  onClose,
  orgId,
  isTrialing,
  trialEndDate,
  periodEndDate,
}: CancelSubscriptionModalProps) {
  const [canceling, setCanceling] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const endDate = isTrialing && trialEndDate ? trialEndDate : periodEndDate;

  const handleCancel = async () => {
    setCanceling(true);
    setError(null);

    try {
      const res = await fetch('/api/billing/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      // Reload to reflect changes
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
      setCanceling(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: '12px' },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          fontFamily: '"Mont", sans-serif',
          fontSize: '18px',
          fontWeight: 600,
          color: 'var(--ls-color-text-primary)',
          paddingBottom: 1,
        }}
      >
        <WarningAmberIcon sx={{ color: 'var(--ls-color-warning)', fontSize: 24 }} />
        Cancel subscription
      </DialogTitle>

      <DialogContent>
        {isTrialing ? (
          <Typography sx={{ fontFamily, fontSize: '14px', color: 'var(--ls-color-text-secondary)', lineHeight: 1.6 }}>
            Your free trial will continue until <strong>{formatDate(endDate)}</strong>.
            After that, your subscription will end and you will not be charged.
            You&apos;ll lose access to all Pro features when the trial expires.
          </Typography>
        ) : (
          <Typography sx={{ fontFamily, fontSize: '14px', color: 'var(--ls-color-text-secondary)', lineHeight: 1.6 }}>
            Your subscription will remain active until <strong>{formatDate(endDate)}</strong>.
            After that, you&apos;ll lose access to your current plan features including scheduling,
            certifications, Levi AI, and other Pro tools.
          </Typography>
        )}

        {error && (
          <Typography
            sx={{
              fontFamily,
              fontSize: '13px',
              color: 'var(--ls-color-destructive)',
              mt: 2,
              padding: '8px 12px',
              backgroundColor: 'var(--ls-color-destructive-soft)',
              borderRadius: '6px',
            }}
          >
            {error}
          </Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ padding: '12px 24px 20px' }}>
        <Button
          onClick={onClose}
          variant="outlined"
          disabled={canceling}
          sx={{
            fontFamily,
            textTransform: 'none',
            borderColor: 'var(--ls-color-muted-border)',
            color: 'var(--ls-color-text-primary)',
            '&:hover': { borderColor: 'var(--ls-color-text-tertiary)' },
          }}
        >
          Keep My Plan
        </Button>
        <Button
          onClick={handleCancel}
          variant="contained"
          disabled={canceling}
          startIcon={canceling ? <CircularProgress size={14} /> : undefined}
          sx={{
            fontFamily,
            textTransform: 'none',
            backgroundColor: 'var(--ls-color-destructive)',
            '&:hover': { backgroundColor: 'var(--ls-color-destructive-hover, #c53030)' },
          }}
        >
          {canceling ? 'Canceling...' : 'Cancel Subscription'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default CancelSubscriptionModal;
