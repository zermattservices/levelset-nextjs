/**
 * OrgSubscriptionTab
 * Admin-only subscription management tab for the OrganizationModal.
 * Allows creating subscriptions, toggling custom pricing, and managing billing.
 */

import * as React from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Switch,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Alert,
} from '@mui/material';
import { createSupabaseClient } from '@/util/supabase/component';
import { PLAN_TIERS, TIER_ORDER, PlanTier, formatPrice } from '@/lib/billing/constants';

interface OrgSubscriptionTabProps {
  orgId: string;
}

const fontFamily = '"Satoshi", sans-serif';

interface SubscriptionData {
  id: string;
  stripe_subscription_id: string;
  plan_tier: PlanTier;
  status: string;
  quantity: number;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_start: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
}

interface OrgData {
  custom_pricing: boolean;
  custom_price_cents: number | null;
  stripe_customer_id: string | null;
}

export function OrgSubscriptionTab({ orgId }: OrgSubscriptionTabProps) {
  const [subscription, setSubscription] = React.useState<SubscriptionData | null>(null);
  const [orgData, setOrgData] = React.useState<OrgData | null>(null);
  const [locationCount, setLocationCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Create subscription form state
  const [newTier, setNewTier] = React.useState<PlanTier>('pro');
  const [newPeriod, setNewPeriod] = React.useState<'monthly' | 'annual'>('monthly');
  const [newQuantity, setNewQuantity] = React.useState(1);
  const [customPriceDollars, setCustomPriceDollars] = React.useState('');

  const supabase = React.useMemo(() => createSupabaseClient(), []);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      // Fetch subscription
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('org_id', orgId)
        .single();

      setSubscription(sub);

      // Fetch org data
      const { data: org } = await supabase
        .from('orgs')
        .select('custom_pricing, custom_price_cents, stripe_customer_id')
        .eq('id', orgId)
        .single();

      setOrgData(org);
      if (org?.custom_price_cents) {
        setCustomPriceDollars(String(org.custom_price_cents / 100));
      }

      // Fetch location count
      const { count } = await supabase
        .from('locations')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId);

      setLocationCount(count || 0);
      setNewQuantity(count || 1);
    } catch (err) {
      console.error('Error fetching subscription data:', err);
    } finally {
      setLoading(false);
    }
  }, [orgId, supabase]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleCreateSubscription = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'create-subscription',
          org_id: orgId,
          plan_tier: newTier,
          billing_period: newPeriod,
          quantity: newQuantity,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showMessage('success', `Subscription created (${data.status})`);
      fetchData();
    } catch (err: any) {
      showMessage('error', err.message || 'Failed to create subscription');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleCustomPricing = async (enabled: boolean) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'update-custom-pricing',
          org_id: orgId,
          custom_pricing: enabled,
          custom_price_cents: enabled && customPriceDollars
            ? Math.round(parseFloat(customPriceDollars) * 100)
            : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showMessage('success', `Custom pricing ${enabled ? 'enabled' : 'disabled'}`);
      fetchData();
    } catch (err: any) {
      showMessage('error', err.message || 'Failed to update custom pricing');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveCustomPrice = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'update-custom-pricing',
          org_id: orgId,
          custom_pricing: true,
          custom_price_cents: customPriceDollars
            ? Math.round(parseFloat(customPriceDollars) * 100)
            : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showMessage('success', 'Custom price updated');
      fetchData();
    } catch (err: any) {
      showMessage('error', err.message || 'Failed to update price');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSyncFeatures = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'sync-features',
          org_id: orgId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showMessage('success', 'Features synced from subscription tier');
    } catch (err: any) {
      showMessage('error', err.message || 'Failed to sync features');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Cancel this subscription at end of billing period?')) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'cancel-subscription',
          org_id: orgId,
          cancel_immediately: false,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showMessage('success', 'Subscription will cancel at end of period');
      fetchData();
    } catch (err: any) {
      showMessage('error', err.message || 'Failed to cancel subscription');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return { bg: 'var(--ls-color-success-foreground)', text: 'var(--ls-color-success-soft-foreground)' };
      case 'trialing': return { bg: '#dbeafe', text: '#1e40af' };
      case 'past_due': return { bg: '#fef3c7', text: '#92400e' };
      case 'canceled': return { bg: 'var(--ls-color-destructive-lighter)', text: '#991b1b' };
      default: return { bg: '#f3f4f6', text: '#374151' };
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} sx={{ color: 'var(--ls-color-brand)' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {message && (
        <Alert severity={message.type} onClose={() => setMessage(null)} sx={{ fontFamily }}>
          {message.text}
        </Alert>
      )}

      {/* Current Subscription */}
      {subscription && subscription.status !== 'canceled' ? (
        <Box sx={{ border: '1px solid var(--ls-color-muted-border)', borderRadius: '12px', p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography sx={{ fontFamily, fontSize: '16px', fontWeight: 600 }}>
              Current Subscription
            </Typography>
            <Chip
              label={subscription.status.replace('_', ' ').toUpperCase()}
              size="small"
              sx={{
                fontFamily,
                fontSize: 11,
                fontWeight: 600,
                ...getStatusColor(subscription.status),
              }}
            />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Box>
              <Typography sx={{ fontFamily, fontSize: '12px', color: 'var(--ls-color-text-tertiary)', textTransform: 'uppercase', mb: 0.5 }}>
                Plan
              </Typography>
              <Typography sx={{ fontFamily, fontSize: '16px', fontWeight: 600 }}>
                {PLAN_TIERS[subscription.plan_tier]?.name || subscription.plan_tier}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontFamily, fontSize: '12px', color: 'var(--ls-color-text-tertiary)', textTransform: 'uppercase', mb: 0.5 }}>
                Locations
              </Typography>
              <Typography sx={{ fontFamily, fontSize: '16px', fontWeight: 600 }}>
                {subscription.quantity}
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontFamily, fontSize: '12px', color: 'var(--ls-color-text-tertiary)', textTransform: 'uppercase', mb: 0.5 }}>
                Price per location
              </Typography>
              <Typography sx={{ fontFamily, fontSize: '16px', fontWeight: 600 }}>
                {orgData?.custom_pricing && orgData.custom_price_cents
                  ? formatPrice(orgData.custom_price_cents)
                  : formatPrice(PLAN_TIERS[subscription.plan_tier]?.monthlyPriceCents || 0)}
                /mo
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontFamily, fontSize: '12px', color: 'var(--ls-color-text-tertiary)', textTransform: 'uppercase', mb: 0.5 }}>
                Next billing
              </Typography>
              <Typography sx={{ fontFamily, fontSize: '16px', fontWeight: 600 }}>
                {subscription.current_period_end
                  ? new Date(subscription.current_period_end).toLocaleDateString()
                  : '—'}
              </Typography>
            </Box>
          </Box>

          {subscription.trial_end && subscription.status === 'trialing' && (
            <Box sx={{ mt: 2, p: 1.5, backgroundColor: '#eff6ff', borderRadius: '8px' }}>
              <Typography sx={{ fontFamily, fontSize: '13px', color: '#1e40af' }}>
                Trial ends: {new Date(subscription.trial_end).toLocaleDateString()}
              </Typography>
            </Box>
          )}

          {subscription.cancel_at_period_end && (
            <Box sx={{ mt: 2, p: 1.5, backgroundColor: 'var(--ls-color-destructive-light)', borderRadius: '8px' }}>
              <Typography sx={{ fontFamily, fontSize: '13px', color: 'var(--ls-color-destructive-dark)' }}>
                Cancels at end of current period
              </Typography>
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 1, mt: 3 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={handleSyncFeatures}
              disabled={actionLoading}
              sx={{ fontFamily, textTransform: 'none', fontSize: '13px' }}
            >
              Sync Features
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={handleCancelSubscription}
              disabled={actionLoading || subscription.cancel_at_period_end}
              sx={{ fontFamily, textTransform: 'none', fontSize: '13px' }}
            >
              Cancel Subscription
            </Button>
          </Box>
        </Box>
      ) : (
        /* Create Subscription */
        <Box sx={{ border: '1px solid var(--ls-color-muted-border)', borderRadius: '12px', p: 3 }}>
          <Typography sx={{ fontFamily, fontSize: '16px', fontWeight: 600, mb: 2 }}>
            Create Subscription
          </Typography>
          <Typography sx={{ fontFamily, fontSize: '13px', color: 'var(--ls-color-text-tertiary)', mb: 3 }}>
            No active subscription. Create one to grant feature access.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl size="small" fullWidth>
              <InputLabel sx={{ fontFamily }}>Plan Tier</InputLabel>
              <Select
                value={newTier}
                label="Plan Tier"
                onChange={(e) => setNewTier(e.target.value as PlanTier)}
                sx={{ fontFamily }}
              >
                {TIER_ORDER.map(tier => (
                  <MenuItem key={tier} value={tier} sx={{ fontFamily }}>
                    {PLAN_TIERS[tier].name} — {formatPrice(PLAN_TIERS[tier].monthlyPriceCents)}/loc/mo
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth>
              <InputLabel sx={{ fontFamily }}>Billing Period</InputLabel>
              <Select
                value={newPeriod}
                label="Billing Period"
                onChange={(e) => setNewPeriod(e.target.value as 'monthly' | 'annual')}
                sx={{ fontFamily }}
              >
                <MenuItem value="monthly" sx={{ fontFamily }}>Monthly</MenuItem>
                <MenuItem value="annual" sx={{ fontFamily }}>Annual (save ~10%)</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Number of Locations"
              type="number"
              size="small"
              value={newQuantity}
              onChange={(e) => setNewQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              inputProps={{ min: 1 }}
              sx={{ '& .MuiInputBase-input': { fontFamily } }}
              helperText={`${locationCount} location(s) found in system`}
              FormHelperTextProps={{ sx: { fontFamily, fontSize: '11px' } }}
            />

            <Button
              variant="contained"
              onClick={handleCreateSubscription}
              disabled={actionLoading}
              sx={{
                fontFamily,
                textTransform: 'none',
                backgroundColor: 'var(--ls-color-brand)',
                '&:hover': { backgroundColor: 'var(--ls-color-brand-hover)' },
              }}
            >
              {actionLoading ? <CircularProgress size={20} color="inherit" /> : 'Create Subscription (30-day trial)'}
            </Button>
          </Box>
        </Box>
      )}

      {/* Custom Pricing */}
      <Box sx={{ border: '1px solid var(--ls-color-muted-border)', borderRadius: '12px', p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography sx={{ fontFamily, fontSize: '16px', fontWeight: 600 }}>
            Custom Pricing
          </Typography>
          <Switch
            checked={orgData?.custom_pricing || false}
            onChange={(e) => handleToggleCustomPricing(e.target.checked)}
            disabled={actionLoading}
            sx={{
              '& .MuiSwitch-switchBase.Mui-checked': {
                color: 'var(--ls-color-brand)',
              },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                backgroundColor: 'var(--ls-color-brand)',
              },
            }}
          />
        </Box>

        <Typography sx={{ fontFamily, fontSize: '13px', color: 'var(--ls-color-text-tertiary)', mb: 2 }}>
          {orgData?.custom_pricing
            ? 'Custom pricing is enabled. Feature flags are managed manually in the Features tab, and this org has a custom price.'
            : 'Enable to set a custom price and manage feature flags independently from the subscription tier.'}
        </Typography>

        {orgData?.custom_pricing && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            <TextField
              label="Custom Price ($/loc/mo)"
              type="number"
              size="small"
              value={customPriceDollars}
              onChange={(e) => setCustomPriceDollars(e.target.value)}
              inputProps={{ min: 0, step: 1 }}
              sx={{ width: 200, '& .MuiInputBase-input': { fontFamily } }}
            />
            <Button
              variant="outlined"
              size="small"
              onClick={handleSaveCustomPrice}
              disabled={actionLoading}
              sx={{ fontFamily, textTransform: 'none', height: 40 }}
            >
              Save
            </Button>
          </Box>
        )}
      </Box>

      {/* Stripe Customer Info */}
      <Box sx={{ border: '1px solid var(--ls-color-muted-border)', borderRadius: '12px', p: 3 }}>
        <Typography sx={{ fontFamily, fontSize: '16px', fontWeight: 600, mb: 1 }}>
          Stripe Details
        </Typography>
        <Typography sx={{ fontFamily, fontSize: '13px', color: 'var(--ls-color-text-tertiary)' }}>
          Customer ID: {orgData?.stripe_customer_id || 'Not linked'}
        </Typography>
        {subscription?.stripe_subscription_id && (
          <Typography sx={{ fontFamily, fontSize: '13px', color: 'var(--ls-color-text-tertiary)' }}>
            Subscription ID: {subscription.stripe_subscription_id}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
