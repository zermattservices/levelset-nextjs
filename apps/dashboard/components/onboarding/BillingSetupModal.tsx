/**
 * BillingSetupModal
 *
 * Blocking modal shown before Step 1 of onboarding.
 * Collects payment info via Stripe Checkout (setup mode).
 * Cannot be dismissed — user must complete billing setup to proceed.
 */

import * as React from 'react';
import { TRIAL_DAYS } from '@/lib/billing/constants';
import styles from './BillingSetupModal.module.css';

interface BillingSetupModalProps {
  accessToken: string;
}

export function BillingSetupModal({ accessToken }: BillingSetupModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const trialEndDate = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const formattedDate = trialEndDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const handleStartTrial = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/onboarding/billing-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to start billing setup');
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <img
            src="/logos/levelset-horizontal-lockup.png"
            alt="Levelset"
            className={styles.logo}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const fallback = e.currentTarget.parentElement?.querySelector(`.${styles.logoFallback}`) as HTMLElement;
              if (fallback) fallback.style.display = 'block';
            }}
          />
          <h1 className={styles.logoFallback}>Levelset</h1>
        </div>

        {/* Content */}
        <div className={styles.content}>
          <div className={styles.card}>
            {/* Badge */}
            <div className={styles.badge}>
              <svg className={styles.badgeIcon} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
              {TRIAL_DAYS}-Day Free Trial
            </div>

            <h2 className={styles.title}>
              Start your free trial
            </h2>

            <p className={styles.subtitle}>
              Get full access to Levelset Pro for {TRIAL_DAYS} days. Add a payment method to get started — you won&apos;t be charged until your trial ends.
            </p>

            {/* What's included */}
            <div className={styles.features}>
              <h3 className={styles.featuresTitle}>Included in your trial</h3>
              <ul className={styles.featureList}>
                <li className={styles.featureItem}>
                  <CheckIcon />
                  Positional Excellence ratings & analytics
                </li>
                <li className={styles.featureItem}>
                  <CheckIcon />
                  Discipline tracking & management
                </li>
                <li className={styles.featureItem}>
                  <CheckIcon />
                  Team roster & scheduling
                </li>
                <li className={styles.featureItem}>
                  <CheckIcon />
                  Levi AI assistant
                </li>
                <li className={styles.featureItem}>
                  <CheckIcon />
                  Certifications & evaluations
                </li>
                <li className={styles.featureItem}>
                  <CheckIcon />
                  Mobile app access
                </li>
              </ul>
            </div>

            {/* Billing info */}
            <div className={styles.billingInfo}>
              <div className={styles.billingRow}>
                <span className={styles.billingLabel}>Today</span>
                <span className={styles.billingValue}>$0.00</span>
              </div>
              <div className={styles.billingDivider} />
              <div className={styles.billingRow}>
                <span className={styles.billingLabel}>After trial ({formattedDate})</span>
                <span className={styles.billingValue}>$249/location/mo</span>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className={styles.error}>
                {error}
              </div>
            )}

            {/* CTA */}
            <button
              type="button"
              onClick={handleStartTrial}
              disabled={loading}
              className={styles.ctaButton}
            >
              {loading ? (
                <>
                  <span className={styles.spinner} />
                  Setting up...
                </>
              ) : (
                'Start Free Trial'
              )}
            </button>

            {/* Fine print */}
            <p className={styles.finePrint}>
              Cancel anytime in Settings before your trial ends. No charge until {formattedDate}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg className={styles.checkIcon} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
    </svg>
  );
}
