/**
 * PlanComparisonModal
 * Side-by-side plan tier comparison for upgrade/downgrade.
 */

import * as React from 'react';
import {
  Dialog,
  DialogTitle,
  IconButton,
  Box,
  Button,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import StarIcon from '@mui/icons-material/Star';
import {
  PLAN_TIERS,
  TIER_ORDER,
  formatPrice,
  type PlanTier,
} from '@/lib/billing/constants';

interface PlanComparisonModalProps {
  open: boolean;
  onClose: () => void;
  currentTier: PlanTier;
  orgId: string;
  locationCount: number;
}

const fontFamily = '"Satoshi", sans-serif';

export function PlanComparisonModal({
  open,
  onClose,
  currentTier,
  orgId,
  locationCount,
}: PlanComparisonModalProps) {
  const [billingPeriod, setBillingPeriod] = React.useState<'monthly' | 'annual'>('monthly');
  const [changingTo, setChangingTo] = React.useState<PlanTier | null>(null);

  const handleChangePlan = async (tier: PlanTier) => {
    if (tier === currentTier) return;

    setChangingTo(tier);
    try {
      const res = await fetch('/api/billing/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: orgId,
          plan_tier: tier,
          billing_period: billingPeriod,
        }),
      });

      if (res.ok) {
        // Reload page to reflect changes
        window.location.reload();
      } else {
        const data = await res.json();
        console.error('Error changing plan:', data.error);
      }
    } catch (err) {
      console.error('Error changing plan:', err);
    } finally {
      setChangingTo(null);
    }
  };

  const tierColors: Record<PlanTier, { border: string; bg: string; text: string }> = {
    core: { border: '#bbf7d0', bg: '#f0fdf4', text: '#166534' },
    pro: { border: '#fcd34d', bg: '#fef3c7', text: '#92400e' },
    ultimate: { border: '#d8b4fe', bg: '#f3e8ff', text: '#6b21a8' },
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px',
          borderBottom: '1px solid #e5e5e5',
        }}
      >
        <Typography
          sx={{
            fontFamily: '"Mont", sans-serif',
            fontSize: '22px',
            fontWeight: 600,
            color: '#0d1b14',
          }}
        >
          Choose Your Plan
        </Typography>
        <IconButton onClick={onClose} sx={{ marginRight: '-8px' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Box sx={{ padding: '24px', overflowY: 'auto' }}>
        {/* Billing Period Toggle */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
          <ToggleButtonGroup
            value={billingPeriod}
            exclusive
            onChange={(_, val) => val && setBillingPeriod(val)}
            sx={{
              '& .MuiToggleButton-root': {
                fontFamily,
                fontSize: '14px',
                textTransform: 'none',
                padding: '8px 20px',
                border: '1px solid var(--ls-color-muted-border)',
                '&.Mui-selected': {
                  backgroundColor: 'var(--ls-color-brand)',
                  color: '#fff',
                  '&:hover': { backgroundColor: 'var(--ls-color-brand-hover)' },
                },
              },
            }}
          >
            <ToggleButton value="monthly">Monthly</ToggleButton>
            <ToggleButton value="annual">Annual (save ~10%)</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Plan Cards */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
            gap: 3,
          }}
        >
          {TIER_ORDER.map((tier) => {
            const config = PLAN_TIERS[tier];
            const isCurrent = tier === currentTier;
            const isChanging = changingTo === tier;
            const colors = tierColors[tier];
            const price =
              billingPeriod === 'monthly'
                ? config.monthlyPriceCents
                : config.annualPriceCents;
            const totalMonthly = (price * locationCount) / 100;

            return (
              <Box
                key={tier}
                sx={{
                  border: isCurrent
                    ? `2px solid var(--ls-color-brand)`
                    : `1px solid ${colors.border}`,
                  borderRadius: '12px',
                  padding: '24px',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Recommended badge */}
                {config.recommended && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      backgroundColor: colors.bg,
                      color: colors.text,
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      fontFamily,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    <StarIcon sx={{ fontSize: 12 }} />
                    RECOMMENDED
                  </Box>
                )}

                {/* Current badge */}
                {isCurrent && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -12,
                      right: 16,
                      backgroundColor: 'var(--ls-color-brand)',
                      color: '#fff',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      fontFamily,
                    }}
                  >
                    CURRENT
                  </Box>
                )}

                {/* Tier header */}
                <Typography
                  sx={{
                    fontFamily: '"Mont", sans-serif',
                    fontSize: '20px',
                    fontWeight: 600,
                    color: '#0d1b14',
                    mb: 0.5,
                    mt: config.recommended ? 1 : 0,
                  }}
                >
                  {config.name}
                </Typography>

                <Typography
                  sx={{
                    fontFamily,
                    fontSize: '13px',
                    color: '#666',
                    mb: 2,
                  }}
                >
                  {config.description}
                </Typography>

                {/* Price */}
                <Box sx={{ mb: 2 }}>
                  <Typography
                    component="span"
                    sx={{
                      fontFamily: '"Mont", sans-serif',
                      fontSize: '32px',
                      fontWeight: 700,
                      color: '#0d1b14',
                    }}
                  >
                    {formatPrice(price)}
                  </Typography>
                  <Typography
                    component="span"
                    sx={{
                      fontFamily,
                      fontSize: '14px',
                      color: '#999',
                    }}
                  >
                    /loc/mo
                  </Typography>
                  {tier === 'ultimate' && (
                    <Typography
                      sx={{
                        fontFamily,
                        fontSize: '12px',
                        color: '#999',
                        mt: 0.5,
                      }}
                    >
                      + AI usage (500 queries/loc included)
                    </Typography>
                  )}
                </Box>

                {/* Location total */}
                <Typography
                  sx={{
                    fontFamily,
                    fontSize: '13px',
                    color: '#666',
                    mb: 2,
                    padding: '8px 12px',
                    backgroundColor: 'var(--ls-color-muted-soft)',
                    borderRadius: '8px',
                  }}
                >
                  {locationCount} {locationCount === 1 ? 'location' : 'locations'} = <strong>${totalMonthly.toLocaleString()}/mo</strong>
                </Typography>

                {/* Feature list */}
                <Box sx={{ flex: 1, mb: 3 }}>
                  {config.features.map((feature) => (
                    <Box
                      key={feature.key}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        padding: '4px 0',
                      }}
                    >
                      <CheckIcon
                        sx={{
                          fontSize: 16,
                          color: 'var(--ls-color-brand)',
                          flexShrink: 0,
                        }}
                      />
                      <Typography
                        sx={{
                          fontFamily,
                          fontSize: '13px',
                          color: '#333',
                        }}
                      >
                        {feature.label}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                {/* Action button */}
                <Button
                  variant={isCurrent ? 'outlined' : 'contained'}
                  fullWidth
                  disabled={isCurrent || isChanging}
                  onClick={() => handleChangePlan(tier)}
                  startIcon={isChanging ? <CircularProgress size={14} /> : undefined}
                  sx={{
                    fontFamily,
                    textTransform: 'none',
                    borderRadius: '8px',
                    padding: '10px',
                    ...(isCurrent
                      ? {
                          borderColor: 'var(--ls-color-muted-border)',
                          color: '#999',
                        }
                      : {
                          backgroundColor: 'var(--ls-color-brand)',
                          '&:hover': { backgroundColor: 'var(--ls-color-brand-hover)' },
                        }),
                  }}
                >
                  {isCurrent ? 'Current Plan' : isChanging ? 'Changing...' : 'Select Plan'}
                </Button>
              </Box>
            );
          })}
        </Box>

        {/* Proration note */}
        <Typography
          sx={{
            fontFamily,
            fontSize: '13px',
            color: '#999',
            textAlign: 'center',
            mt: 3,
          }}
        >
          Plan changes take effect immediately. Prorated charges or credits will be applied to your next invoice.
        </Typography>
      </Box>
    </Dialog>
  );
}

export default PlanComparisonModal;
