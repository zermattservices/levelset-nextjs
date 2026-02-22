/**
 * RatingSummaryCard — shows a rating average for a position with color coding and trend.
 */

import * as React from 'react';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import styles from './RatingSummaryCard.module.css';

interface RatingSummaryCardProps {
  payload: {
    employee_id?: string;
    employee_name?: string;
    position: string;
    rating_avg: number;
    rating_count: number;
    trend?: 'improving' | 'declining' | 'stable';
  };
}

function getRatingClass(avg: number): string {
  if (avg >= 2.5) return styles.ratingGreen;
  if (avg >= 2.0) return styles.ratingYellow;
  return styles.ratingRed;
}

export function RatingSummaryCard({ payload }: RatingSummaryCardProps) {
  const TrendIcon =
    payload.trend === 'improving'
      ? TrendingUpIcon
      : payload.trend === 'declining'
        ? TrendingDownIcon
        : payload.trend === 'stable'
          ? TrendingFlatIcon
          : null;

  const trendClass =
    payload.trend === 'improving'
      ? styles.trendUp
      : payload.trend === 'declining'
        ? styles.trendDown
        : styles.trendFlat;

  return (
    <div className={styles.card}>
      <div className={styles.row}>
        <div className={styles.positionWrap}>
          <span className={styles.position}>{payload.position}</span>
          <span className={styles.count}>
            {payload.rating_count} rating{payload.rating_count !== 1 ? 's' : ''}
          </span>
        </div>

        <div className={styles.ratingWrap}>
          <div className={`${styles.ratingBadge} ${getRatingClass(payload.rating_avg)}`}>
            <span className={styles.ratingValue}>
              {payload.rating_avg.toFixed(2)}
            </span>
          </div>
          {TrendIcon && (
            <TrendIcon className={trendClass} style={{ fontSize: 16 }} />
          )}
        </div>
      </div>
    </div>
  );
}
