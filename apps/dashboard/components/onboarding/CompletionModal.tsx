import * as React from 'react';
import { useRouter } from 'next/router';
import styles from './CompletionModal.module.css';

interface CompletionModalProps {
  accessToken: string;
  orgId: string;
}

/* ── SVG icons for next-steps cards ─────────────────────────────── */
const PayIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 1V23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CalendarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3 10H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="7" y="14" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const StarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ShieldIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const FileIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const NEXT_STEPS = [
  {
    title: 'Pay Configuration',
    description: 'Set up pay rates, raises, and tier structures',
    href: '/settings/pay',
    icon: <PayIcon />,
  },
  {
    title: 'Scheduling Setup',
    description: 'Configure break rules and shift templates',
    href: '/settings/scheduling',
    icon: <CalendarIcon />,
  },
  {
    title: 'Rating Thresholds',
    description: 'Customize positional excellence score thresholds',
    href: '/settings/ratings',
    icon: <StarIcon />,
  },
  {
    title: 'Permissions',
    description: 'Manage who can access what in your account',
    href: '/settings/permissions',
    icon: <ShieldIcon />,
  },
  {
    title: 'Documents',
    description: 'Upload additional documents for Levi to learn from',
    href: '/documents',
    icon: <FileIcon />,
  },
];

export function CompletionModal({ accessToken, orgId }: CompletionModalProps) {
  const router = useRouter();
  const [isCompleting, setIsCompleting] = React.useState(false);

  const handleGoToDashboard = async () => {
    setIsCompleting(true);

    try {
      // Mark onboarding as complete
      await fetch('/api/onboarding/step', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ step: 'complete', data: {} }),
      });
    } catch {
      // Non-fatal — we still redirect
    }

    router.push('/');
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Success icon */}
        <div className={styles.successIcon}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="24" cy="24" r="24" fill="var(--ls-color-success-soft)" />
            <path
              d="M16 24L22 30L32 18"
              stroke="var(--ls-color-success)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h2 className={styles.title}>You're All Set!</h2>
        <p className={styles.subtitle}>
          Your account is ready to go. Here are some other things you can configure:
        </p>

        <div className={styles.nextStepsList}>
          {NEXT_STEPS.map(item => (
            <button
              key={item.href}
              type="button"
              className={styles.nextStepItem}
              onClick={() => router.push(item.href)}
            >
              <span className={styles.nextStepIcon}>{item.icon}</span>
              <div className={styles.nextStepContent}>
                <span className={styles.nextStepTitle}>{item.title}</span>
                <span className={styles.nextStepDescription}>{item.description}</span>
              </div>
              <span className={styles.nextStepArrow}>&#8250;</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          className={styles.primaryBtn}
          onClick={handleGoToDashboard}
          disabled={isCompleting}
        >
          {isCompleting ? 'Finishing up...' : 'Go to Dashboard'}
        </button>
      </div>
    </div>
  );
}
