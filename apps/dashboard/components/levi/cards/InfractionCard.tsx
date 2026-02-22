/**
 * InfractionCard — inline chat card for a single infraction.
 * Shows infraction type, date, points, and leader name.
 */

import * as React from 'react';
import styles from './InfractionCard.module.css';

interface InfractionCardProps {
  payload: {
    id: string;
    employee_name?: string;
    infraction: string;
    date: string;
    points: number;
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

export function InfractionCard({ payload }: InfractionCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.row}>
        <div className={styles.iconWrap}>
          <span className={styles.iconText}>!</span>
        </div>

        <div className={styles.info}>
          <span className={styles.infractionType}>{payload.infraction}</span>
          <div className={styles.metaRow}>
            <span className={styles.meta}>{formatDate(payload.date)}</span>
            {payload.leader_name && (
              <span className={styles.metaSecondary}>
                by {payload.leader_name}
              </span>
            )}
          </div>
        </div>

        <div className={styles.pointsBadge}>
          <span className={styles.pointsText}>
            {payload.points}pt{payload.points !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
