import React from 'react';
import { useRouter } from 'next/router';
import { Skeleton } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

import { createSupabaseClient } from '@/util/supabase/component';
import { useLocationContext } from './LocationContext';
import styles from './DashboardMetricCard.module.css';

type MetricVariant = 'positional-excellence' | 'discipline-points';

interface DashboardMetricCardProps {
  variant: MetricVariant;
  locationId?: string;
  linkHref?: string;
  onClick?: () => void;
  className?: string;
}

interface MetricConfig {
  title: string;
  totalLabel: string;
  deltaLabel: string;
  table: string;
  dateColumn: string;
  invertTrend: boolean;
}

interface MetricState {
  total: number;
  change: number;
  percent: number;
  timestamp: Date;
}

const VARIANT_CONFIG: Record<MetricVariant, MetricConfig> = {
  'positional-excellence': {
    title: 'Positional Excellence',
    totalLabel: 'Total:',
    deltaLabel: 'over prior 90 days',
    table: 'ratings',
    dateColumn: 'created_at',
    invertTrend: false,
  },
  'discipline-points': {
    title: 'Discipline Points',
    totalLabel: 'Infractions:',
    deltaLabel: 'over prior 90 days',
    table: 'infractions',
    dateColumn: 'infraction_date',
    invertTrend: true,
  },
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function DashboardMetricCard({
  variant,
  locationId,
  linkHref,
  onClick,
  className,
}: DashboardMetricCardProps) {
  const router = useRouter();
  const { selectedLocationId } = useLocationContext();
  const supabase = React.useMemo(() => createSupabaseClient(), []);

  const effectiveLocationId = locationId || selectedLocationId || undefined;

  const [metricState, setMetricState] = React.useState<MetricState | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const config = VARIANT_CONFIG[variant];

  const fetchMetrics = React.useCallback(async () => {
    if (!effectiveLocationId) {
      setMetricState(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const now = new Date();
    const currentPeriodStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const previousPeriodStart = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

    const currentStartIso = currentPeriodStart.toISOString();
    const previousStartIso = previousPeriodStart.toISOString();
    const nowIso = now.toISOString();

    const applyBaseFilters = (query: any) =>
      effectiveLocationId ? query.eq('location_id', effectiveLocationId) : query;

    try {
      const currentQuery = applyBaseFilters(
        supabase
          .from(config.table)
          .select('id', { count: 'exact', head: true })
      ).gte(config.dateColumn, currentStartIso)
        .lte(config.dateColumn, nowIso);

      const previousQuery = applyBaseFilters(
        supabase
          .from(config.table)
          .select('id', { count: 'exact', head: true })
      )
        .gte(config.dateColumn, previousStartIso)
        .lt(config.dateColumn, currentStartIso);

      const [{ count: currentCount, error: currentError }, { count: previousCount, error: previousError }]
        = await Promise.all([currentQuery, previousQuery]);

      if (currentError || previousError) {
        throw currentError || previousError;
      }

      const safeCurrent = currentCount ?? 0;
      const safePrevious = previousCount ?? 0;
      const change = safeCurrent - safePrevious;

      let percentChange = 0;
      if (safePrevious === 0) {
        percentChange = safeCurrent > 0 ? 100 : 0;
      } else {
        percentChange = (change / safePrevious) * 100;
      }

      setMetricState({
        total: safeCurrent,
        change,
        percent: percentChange,
        timestamp: now,
      });
    } catch (err) {
      console.error('[DashboardMetricCard] Failed to load metrics:', err);
      setMetricState(null);
      setError('Unable to load metrics right now.');
    } finally {
      setLoading(false);
    }
  }, [
    config.dateColumn,
    config.table,
    effectiveLocationId,
    supabase,
    variant,
  ]);

  React.useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const handleNavigate = React.useCallback(() => {
    if (onClick) {
      try {
        onClick();
      } catch (err) {
        console.error('[DashboardMetricCard] onClick handler threw an error:', err);
      }
      return;
    }
    if (!linkHref) {
      return;
    }
    router.push(linkHref).catch((err) => {
      console.error('[DashboardMetricCard] Navigation error:', err);
    });
  }, [linkHref, onClick, router]);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!onClick && !linkHref) {
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleNavigate();
      }
    },
    [handleNavigate, linkHref, onClick]
  );

  const isClickable = Boolean(onClick || linkHref);
  const containerClasses = [styles.root, className].filter(Boolean).join(' ');
  const cardClasses = [styles.metricItem, isClickable ? styles.clickable : '']
    .filter(Boolean)
    .join(' ');

  const missingContext = !effectiveLocationId;
  const shouldShowSkeleton = loading || missingContext || (!metricState && !error);

  if (error && !shouldShowSkeleton) {
    return (
      <div className={containerClasses}>
        <div className={styles.metricItem}>
          <div className={styles.errorState}>{error}</div>
        </div>
      </div>
    );
  }

  const total = metricState?.total ?? 0;
  const change = metricState?.change ?? 0;
  const percent = metricState?.percent ?? 0;

  const percentRounded = Number.isFinite(percent) ? Number(percent.toFixed(1)) : 0;
  const percentText = `${percentRounded > 0 ? '+' : percentRounded < 0 ? '' : ''}${percentRounded.toFixed(1)}%`;
  const deltaText = `${change > 0 ? '+' : ''}${formatNumber(change)}`;

  const isNegativeTrend = config.invertTrend ? change > 0 : change < 0;
  const percentTrendClasses = [styles.trendBadge, isNegativeTrend ? styles.negative : '']
    .filter(Boolean)
    .join(' ');
  const deltaClasses = [styles.deltaValue, isNegativeTrend ? styles.negative : '']
    .filter(Boolean)
    .join(' ');
  const arrowClasses = [styles.trendIcon, change < 0 ? styles.down : '']
    .filter(Boolean)
    .join(' ');
  const secondaryLabel = 'Past 90 days';

  return (
    <div className={containerClasses}>
      <div
        className={cardClasses}
        role={isClickable ? 'link' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onClick={isClickable ? handleNavigate : undefined}
        onKeyDown={isClickable ? handleKeyDown : undefined}
        aria-label={`${config.title} summary`}
      >
        <div className={styles.titleAndTrend}>
          <div className={styles.title}>{config.title}</div>
          {shouldShowSkeleton ? (
            <Skeleton
              variant="rounded"
              animation="wave"
              sx={{ width: 110, height: 36, borderRadius: 18 }}
            />
          ) : (
            <div className={percentTrendClasses} aria-live="polite">
              {change >= 0 ? (
                <TrendingUpIcon className={arrowClasses} sx={{ fontSize: 18 }} />
              ) : (
                <TrendingDownIcon className={arrowClasses} sx={{ fontSize: 18 }} />
              )}
              <span>{percentText}</span>
            </div>
          )}
        </div>

        <div className={styles.supportingMetrics}>
          <div className={styles.primaryRow}>
            <span className={styles.primaryLabel}>{config.totalLabel}</span>
            <span className={styles.primaryValue}>
              {shouldShowSkeleton ? (
                <Skeleton variant="text" animation="wave" sx={{ width: 64, height: 28 }} />
              ) : (
                formatNumber(total)
              )}
            </span>
            <span className={styles.primaryMeta}>
              {shouldShowSkeleton ? (
                <Skeleton variant="text" animation="wave" sx={{ width: 56, height: 20 }} />
              ) : (
                <span className={deltaClasses}>{deltaText}</span>
              )}
              <span className={styles.periodLabel}>{config.deltaLabel}</span>
            </span>
          </div>
          <div className={styles.secondaryRow}>
            <span className={styles.secondaryLabel}>{secondaryLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardMetricCard;

