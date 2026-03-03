/**
 * BillingTab
 * Customer-facing billing dashboard for organization settings.
 * Shows current plan, features, AI usage (Ultimate), and invoice history.
 */

import * as React from 'react';
import { Button, CircularProgress } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { createSupabaseClient } from '@/util/supabase/component';
import {
  PLAN_TIERS,
  AI_USAGE,
  formatPrice,
  type PlanTier,
  type PlanTierConfig,
} from '@/lib/billing/constants';
import { PlanComparisonModal } from './PlanComparisonModal';
import { CancelSubscriptionModal } from './CancelSubscriptionModal';
import styles from './BillingTab.module.css';

interface BillingTabProps {
  orgId: string;
}

interface SubscriptionData {
  subscription: {
    id: string;
    stripe_subscription_id: string;
    plan_tier: PlanTier;
    status: string;
    quantity: number;
    current_period_start: string;
    current_period_end: string;
    trial_start: string | null;
    trial_end: string | null;
    cancel_at_period_end: boolean;
    canceled_at: string | null;
  } | null;
  plan: {
    tier: PlanTier;
    name: string;
    monthlyPriceCents: number;
    features: { key: string; label: string; description: string }[];
  } | null;
  locationCount: number;
  customPricing: boolean;
}

interface InvoiceData {
  id: string;
  stripe_invoice_id: string;
  amount_due: number;
  amount_paid: number;
  currency: string;
  status: string;
  invoice_pdf: string | null;
  hosted_invoice_url: string | null;
  period_start: string;
  period_end: string;
  created_at: string;
}

interface UsageData {
  currentMonth: {
    totalQueries: number;
    includedAllowance: number;
    overageQueries: number;
    overageCostCents: number;
  };
  periodEnd: string;
}

const fontFamily = '"Satoshi", sans-serif';

export function BillingTab({ orgId }: BillingTabProps) {
  const [subscriptionData, setSubscriptionData] = React.useState<SubscriptionData | null>(null);
  const [invoices, setInvoices] = React.useState<InvoiceData[]>([]);
  const [usage, setUsage] = React.useState<UsageData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [portalLoading, setPortalLoading] = React.useState(false);
  const [showPlanModal, setShowPlanModal] = React.useState(false);
  const [showCancelModal, setShowCancelModal] = React.useState(false);

  const supabase = React.useMemo(() => createSupabaseClient(), []);

  // Fetch subscription data
  React.useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [subRes, invRes, usageRes] = await Promise.all([
          fetch(`/api/billing/subscription?org_id=${orgId}`),
          fetch(`/api/billing/invoices?org_id=${orgId}`),
          fetch(`/api/billing/usage?org_id=${orgId}`),
        ]);

        if (subRes.ok) {
          const subData = await subRes.json();
          setSubscriptionData(subData);
        }

        if (invRes.ok) {
          const invData = await invRes.json();
          setInvoices(invData.invoices || []);
        }

        if (usageRes.ok) {
          const usageData = await usageRes.json();
          setUsage(usageData);
        }
      } catch (err) {
        console.error('Error fetching billing data:', err);
      } finally {
        setLoading(false);
      }
    }

    if (orgId) {
      fetchData();
    }
  }, [orgId]);

  const openStripePortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId }),
      });

      if (res.ok) {
        const { url } = await res.json();
        window.open(url, '_blank');
      }
    } catch (err) {
      console.error('Error opening portal:', err);
    } finally {
      setPortalLoading(false);
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'active':
        return { label: 'Active', className: styles.active };
      case 'trialing':
        return { label: 'Trial', className: styles.trialing };
      case 'past_due':
        return { label: 'Past Due', className: styles.pastDue };
      case 'canceled':
        return { label: 'Canceled', className: styles.canceled };
      default:
        return { label: status, className: '' };
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <CircularProgress size={32} sx={{ color: 'var(--ls-color-brand)' }} />
      </div>
    );
  }

  const sub = subscriptionData?.subscription;
  const plan = subscriptionData?.plan;
  const locationCount = subscriptionData?.locationCount || 0;

  // No subscription state
  if (!sub || !plan) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Billing</h2>
          <p className={styles.description}>Manage your subscription and payment details.</p>
        </div>
        <div className={styles.noPlanContainer}>
          <CreditCardIcon sx={{ fontSize: 48, color: 'var(--ls-color-neutral-border)' }} />
          <h3 className={styles.noPlanTitle}>No Active Subscription</h3>
          <p className={styles.noPlanDescription}>
            Contact your Levelset representative to get started with a subscription plan.
          </p>
        </div>
      </div>
    );
  }

  const statusDisplay = getStatusDisplay(sub.status);
  const monthlyTotal = (plan.monthlyPriceCents * locationCount) / 100;
  const tierConfig = PLAN_TIERS[plan.tier];
  const hasPro = plan.tier === 'pro';
  const isTrialing = sub.status === 'trialing';
  const isCancelPending = sub.cancel_at_period_end;

  // Calculate days remaining in trial
  const trialDaysRemaining = React.useMemo(() => {
    if (!isTrialing || !sub.trial_end) return 0;
    const now = new Date();
    const end = new Date(sub.trial_end);
    return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }, [isTrialing, sub.trial_end]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Billing</h2>
        <p className={styles.description}>Manage your subscription and payment details.</p>
      </div>

      {/* Trial Banner */}
      {isTrialing && !isCancelPending && (
        <div className={styles.trialBanner}>
          <div className={styles.trialBannerHeader}>
            <div className={styles.trialBannerInfo}>
              <h3 className={styles.trialBannerTitle}>
                You&apos;re on a free trial
              </h3>
              <p className={styles.trialBannerText}>
                <span className={styles.trialBannerDays}>{trialDaysRemaining}</span>{' '}
                days remaining &mdash; your trial ends on{' '}
                <strong>{sub.trial_end ? formatDate(sub.trial_end) : 'N/A'}</strong>.
                You&apos;ll be automatically charged {formatPrice(plan.monthlyPriceCents)}/location/mo
                on the {plan.name} plan unless you cancel or switch plans.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Pending Banner */}
      {isCancelPending && (
        <div className={styles.cancelBanner}>
          <p className={styles.cancelBannerText}>
            Your subscription is set to cancel on{' '}
            <strong>
              {isTrialing && sub.trial_end
                ? formatDate(sub.trial_end)
                : formatDate(sub.current_period_end)}
            </strong>.
            You&apos;ll retain access until then.
          </p>
          <Button
            variant="outlined"
            size="small"
            onClick={openStripePortal}
            disabled={portalLoading}
            sx={{
              fontFamily,
              textTransform: 'none',
              borderColor: '#fde68a',
              color: '#92400e',
              whiteSpace: 'nowrap',
              '&:hover': { borderColor: '#f59e0b', backgroundColor: '#fffbeb' },
            }}
          >
            Reactivate
          </Button>
        </div>
      )}

      {/* Current Plan Card */}
      <div className={styles.planCard}>
        <div className={styles.planCardHeader}>
          <div className={styles.planInfo}>
            <h3 className={styles.planName}>
              {plan.name} Plan
            </h3>
            <p className={styles.planPrice}>
              {formatPrice(plan.monthlyPriceCents)}/location/month
              {subscriptionData?.customPricing && ' (custom)'}
            </p>
          </div>
          <div className={`${styles.statusBadge} ${statusDisplay.className}`}>
            <span className={styles.statusDot} />
            {statusDisplay.label}
          </div>
        </div>

        <div className={styles.planDetails}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Locations</span>
            <span className={styles.detailValue}>{locationCount}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Monthly Total</span>
            <span className={styles.detailValue}>${monthlyTotal.toLocaleString()}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>
              {sub.status === 'trialing' ? 'Trial Ends' : 'Next Billing'}
            </span>
            <span className={styles.detailValue}>
              {sub.status === 'trialing' && sub.trial_end
                ? formatDate(sub.trial_end)
                : formatDate(sub.current_period_end)}
            </span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Status</span>
            <span className={styles.detailValue}>
              {sub.cancel_at_period_end ? 'Cancels at period end' : statusDisplay.label}
            </span>
          </div>
        </div>

        <div className={styles.planActions}>
          <Button
            variant="outlined"
            size="small"
            onClick={openStripePortal}
            disabled={portalLoading}
            startIcon={portalLoading ? <CircularProgress size={14} /> : <CreditCardIcon />}
            sx={{
              fontFamily,
              textTransform: 'none',
              borderColor: 'var(--ls-color-muted-border)',
              color: 'var(--ls-color-text-primary)',
              '&:hover': { borderColor: 'var(--ls-color-text-tertiary)' },
            }}
          >
            Manage Payment Method
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={() => setShowPlanModal(true)}
            sx={{
              fontFamily,
              textTransform: 'none',
              backgroundColor: 'var(--ls-color-brand)',
              '&:hover': { backgroundColor: 'var(--ls-color-brand-hover)' },
            }}
          >
            Change Plan
          </Button>
          {!isCancelPending && (
            <Button
              variant="text"
              size="small"
              onClick={() => setShowCancelModal(true)}
              sx={{
                fontFamily,
                textTransform: 'none',
                color: 'var(--ls-color-text-tertiary)',
                '&:hover': { color: 'var(--ls-color-destructive)', backgroundColor: 'var(--ls-color-destructive-soft)' },
              }}
            >
              Cancel Subscription
            </Button>
          )}
        </div>
      </div>

      {/* Included Features */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Included Features</h3>
        <div className={styles.featuresGrid}>
          {plan.features.map((feature) => (
            <div key={feature.key} className={styles.featureItem}>
              <CheckCircleOutlineIcon className={styles.featureCheck} sx={{ fontSize: 18 }} />
              {feature.label}
            </div>
          ))}
        </div>
      </div>

      {/* AI Usage (Pro only) */}
      {hasPro && usage && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>AI Usage This Period</h3>
          <div className={styles.usageCard}>
            <div className={styles.usageHeader}>
              <div className={styles.usageStats}>
                <div className={styles.usageStat}>
                  <span className={styles.detailLabel}>Queries Used</span>
                  <span className={styles.usageStatValue}>
                    {usage.currentMonth.totalQueries.toLocaleString()} / {usage.currentMonth.includedAllowance.toLocaleString()}
                  </span>
                </div>
                <div className={styles.usageStat}>
                  <span className={styles.detailLabel}>Overage</span>
                  <span className={styles.usageStatValue}>
                    ${(usage.currentMonth.overageCostCents / 100).toFixed(2)}
                  </span>
                </div>
                <div className={styles.usageStat}>
                  <span className={styles.detailLabel}>Resets</span>
                  <span className={styles.usageStatValue}>{formatDate(usage.periodEnd)}</span>
                </div>
              </div>
            </div>
            {(() => {
              const pct = Math.min(
                (usage.currentMonth.totalQueries / usage.currentMonth.includedAllowance) * 100,
                100
              );
              const fillClass = pct > 90 ? styles.critical : pct > 70 ? styles.high : '';
              return (
                <div className={styles.usageBar}>
                  <div
                    className={`${styles.usageBarFill} ${fillClass}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Recent Invoices */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Recent Invoices</h3>
        {invoices.length > 0 ? (
          <table className={styles.invoiceTable}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>{formatDate(invoice.created_at)}</td>
                  <td>${(invoice.amount_paid / 100).toFixed(2)}</td>
                  <td>
                    <span className={`${styles.invoiceStatus} ${invoice.status === 'paid' ? styles.paid : invoice.status === 'open' ? styles.open : styles.failed}`}>
                      <span className={styles.statusDot} />
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </span>
                  </td>
                  <td>
                    {invoice.invoice_pdf && (
                      <a
                        href={invoice.invoice_pdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.invoiceLink}
                      >
                        Download PDF
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className={styles.emptyState}>No invoices yet.</div>
        )}
      </div>

      {/* Plan Comparison Modal */}
      <PlanComparisonModal
        open={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        currentTier={plan.tier}
        orgId={orgId}
        locationCount={locationCount}
      />

      {/* Cancel Subscription Modal */}
      <CancelSubscriptionModal
        open={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        orgId={orgId}
        isTrialing={isTrialing}
        trialEndDate={sub.trial_end}
        periodEndDate={sub.current_period_end}
      />
    </div>
  );
}

export default BillingTab;
