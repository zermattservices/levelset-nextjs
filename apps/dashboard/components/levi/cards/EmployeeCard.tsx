/**
 * EmployeeCard — inline chat card for a single employee.
 * Shows avatar initial, name, role, optional badges, and rating/points.
 * Clickable to open EmployeeModal.
 */

import * as React from 'react';
import styles from './EmployeeCard.module.css';

interface EmployeeCardProps {
  payload: {
    employee_id: string;
    name: string;
    role: string;
    hire_date?: string;
    certified_status?: string;
    rating_avg?: number;
    rating_position?: string;
    current_points?: number;
    is_leader?: boolean;
    is_trainer?: boolean;
  };
  onClick?: (employeeId: string) => void;
}

function getRatingClass(avg: number): string {
  if (avg >= 2.5) return styles.ratingGreen;
  if (avg >= 2.0) return styles.ratingYellow;
  return styles.ratingRed;
}

export function EmployeeCard({ payload, onClick }: EmployeeCardProps) {
  const initial = payload.name.charAt(0).toUpperCase();
  const hasRating =
    payload.rating_avg !== undefined && payload.rating_avg !== null;
  const hasPoints =
    payload.current_points !== undefined && payload.current_points > 0;

  return (
    <div
      className={`${styles.card} ${onClick ? styles.clickable : ''}`}
      onClick={() => onClick?.(payload.employee_id)}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick(payload.employee_id);
        }
      }}
    >
      <div className={styles.row}>
        <div className={styles.avatar}>
          <span className={styles.avatarText}>{initial}</span>
        </div>

        <div className={styles.info}>
          <span className={styles.name}>{payload.name}</span>
          <div className={styles.metaRow}>
            <span className={styles.role}>{payload.role}</span>
            {payload.is_leader && (
              <span className={styles.badgeLeader}>Leader</span>
            )}
            {payload.is_trainer && (
              <span className={styles.badgeTrainer}>Trainer</span>
            )}
          </div>
        </div>

        {hasRating && (
          <div className={`${styles.ratingBadge} ${getRatingClass(payload.rating_avg!)}`}>
            <span className={styles.ratingValue}>
              {payload.rating_avg!.toFixed(2)}
            </span>
            {payload.rating_position && (
              <span className={styles.ratingLabel}>
                {payload.rating_position}
              </span>
            )}
          </div>
        )}

        {hasPoints && !hasRating && (
          <div className={styles.pointsBadge}>
            <span className={styles.pointsText}>
              {payload.current_points} pts
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
