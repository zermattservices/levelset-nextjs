import React from 'react';
import { Skeleton } from '@mui/material';
import styles from './OEScoreCard.module.css';

function ArrowUpIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 20 20"
      height="1em"
      className={className}
    >
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
        d="M10 15.833V4.167m0 0L4.167 10M10 4.167 15.833 10"
      />
    </svg>
  );
}

interface OEScoreCardProps {
  title: string;
  score: number;
  change: number;
  percentChange: number;
  size?: 'default' | 'large';
  selected?: boolean;
  onClick?: () => void;
  loading?: boolean;
  weight?: number; // pillar weight percentage
  className?: string;
}

export function OEScoreCard({
  title,
  score,
  change,
  percentChange,
  size = 'default',
  selected = false,
  onClick,
  loading = false,
  weight,
  className,
}: OEScoreCardProps) {
  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!onClick) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onClick();
      }
    },
    [onClick]
  );

  const isClickable = Boolean(onClick);
  const isNegative = change < 0;
  const isNeutral = change === 0;

  const percentRounded = Number.isFinite(percentChange) ? Number(percentChange.toFixed(1)) : 0;
  const percentText = `${percentRounded > 0 ? '+' : ''}${percentRounded.toFixed(1)}%`;
  const changeText = `${change > 0 ? '+' : ''}${change.toFixed(1)} pts`;

  const cardClasses = [
    styles.card,
    size === 'large' && styles.large,
    isClickable && styles.clickable,
    selected && styles.selected,
  ].filter(Boolean).join(' ');

  const trendClasses = [
    styles.trendBadge,
    isNegative && styles.negative,
    isNeutral && styles.neutral,
  ].filter(Boolean).join(' ');

  const arrowClasses = [
    styles.trendIcon,
    isNegative && styles.down,
  ].filter(Boolean).join(' ');

  const changeClasses = [
    styles.changeValue,
    isNegative && styles.negative,
    isNeutral && styles.neutral,
  ].filter(Boolean).join(' ');

  return (
    <div className={[styles.root, className].filter(Boolean).join(' ')}>
      <div
        className={cardClasses}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onClick={isClickable ? onClick : undefined}
        onKeyDown={isClickable ? handleKeyDown : undefined}
        aria-label={`${title}: ${score.toFixed(1)} out of 100`}
      >
        <div className={styles.titleAndTrend}>
          <div className={styles.title}>
            {title}
            {weight != null && size !== 'large' && (
              <span className={styles.weightBadge} style={{ marginLeft: 8 }}>{weight}%</span>
            )}
          </div>
          {loading ? (
            <Skeleton
              variant="rounded"
              animation="wave"
              sx={{ width: 90, height: 28, borderRadius: '6px' }}
            />
          ) : !isNeutral ? (
            <div className={trendClasses}>
              <ArrowUpIcon className={arrowClasses} />
              <span>{percentText}</span>
            </div>
          ) : null}
        </div>

        <div className={styles.scoreSection}>
          <div className={styles.scoreRow}>
            {loading ? (
              <Skeleton variant="text" animation="wave" sx={{ width: size === 'large' ? 120 : 80, height: size === 'large' ? 52 : 40 }} />
            ) : (
              <>
                <span className={styles.scoreValue}>{score.toFixed(1)}</span>
                <span className={styles.scoreSuffix}>/100</span>
              </>
            )}
          </div>
          <div className={styles.changeRow}>
            {loading ? (
              <Skeleton variant="text" animation="wave" sx={{ width: 120, height: 20 }} />
            ) : (
              <>
                <span className={changeClasses}>{changeText}</span>
                <span className={styles.changeLabel}>vs prior period</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default OEScoreCard;
