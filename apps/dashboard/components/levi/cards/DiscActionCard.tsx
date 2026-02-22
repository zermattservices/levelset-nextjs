/**
 * DiscActionCard — inline chat card for a discipline action.
 * Shows action type, date, employee/leader names.
 * Uses warning/orange accent to distinguish from infraction cards (red).
 */

import * as React from 'react';
import styles from './DiscActionCard.module.css';

interface DiscActionCardProps {
  payload: {
    id: string;
    action: string;
    date: string;
    employee_name?: string;
    leader_name?: string;
  };
}

function formatDate(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return isoDate;
  }
}

export function DiscActionCard({ payload }: DiscActionCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.row}>
        <div className={styles.iconWrap}>
          <span className={styles.iconText}>&#9888;</span>
        </div>

        <div className={styles.info}>
          <span className={styles.actionType}>{payload.action}</span>
          <div className={styles.metaRow}>
            <span className={styles.meta}>{formatDate(payload.date)}</span>
            {payload.employee_name && (
              <span className={styles.metaSecondary}>
                {payload.employee_name}
              </span>
            )}
            {payload.leader_name && (
              <span className={styles.metaSecondary}>
                by {payload.leader_name}
              </span>
            )}
          </div>
        </div>

        <div className={styles.actionBadge}>
          <span className={styles.actionBadgeText}>Action</span>
        </div>
      </div>
    </div>
  );
}
