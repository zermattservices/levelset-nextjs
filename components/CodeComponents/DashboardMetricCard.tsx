import React from 'react';
import { useRouter } from 'next/router';
import { Skeleton } from '@mui/material';

import { createSupabaseClient } from '@/util/supabase/component';
import styles from './DashboardMetricCard.module.css';

// Inline ArrowUp icon to avoid Plasmic dependency
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

type MetricVariant = 
  | 'positional-excellence' 
  | 'discipline-points'
  | 'pathway-completion'
  | 'coaching-evaluations'
  | 'caring-interactions'
  | 'great-food'
  | 'quick-accurate'
  | 'creating-moments'
  | 'inviting-atmosphere';

interface DashboardMetricCardProps {
  variant: MetricVariant;
  locationId?: string;
  locationIds?: string[]; // For organization-level aggregation
  linkHref?: string;
  onClick?: () => void;
  className?: string;
  isPlaceholder?: boolean; // For blurred/coming soon cards
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
  'pathway-completion': {
    title: 'Pathway Completion',
    totalLabel: 'Total:',
    deltaLabel: 'over prior 90 days',
    table: '',
    dateColumn: '',
    invertTrend: false,
  },
  'coaching-evaluations': {
    title: 'Coaching Evaluations',
    totalLabel: 'Total:',
    deltaLabel: 'over prior 90 days',
    table: '',
    dateColumn: '',
    invertTrend: false,
  },
  'caring-interactions': {
    title: 'Caring Interactions',
    totalLabel: 'Total:',
    deltaLabel: 'over prior 90 days',
    table: '',
    dateColumn: '',
    invertTrend: false,
  },
  'great-food': {
    title: 'Great Food',
    totalLabel: 'Total:',
    deltaLabel: 'over prior 90 days',
    table: '',
    dateColumn: '',
    invertTrend: false,
  },
  'quick-accurate': {
    title: 'Quick & Accurate',
    totalLabel: 'Total:',
    deltaLabel: 'over prior 90 days',
    table: '',
    dateColumn: '',
    invertTrend: false,
  },
  'creating-moments': {
    title: 'Creating Moments',
    totalLabel: 'Total:',
    deltaLabel: 'over prior 90 days',
    table: '',
    dateColumn: '',
    invertTrend: false,
  },
  'inviting-atmosphere': {
    title: 'Inviting Atmosphere',
    totalLabel: 'Total:',
    deltaLabel: 'over prior 90 days',
    table: '',
    dateColumn: '',
    invertTrend: false,
  },
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function DashboardMetricCard({
  variant,
  locationId,
  locationIds,
  linkHref,
  onClick,
  className,
  isPlaceholder = false,
}: DashboardMetricCardProps) {
  const router = useRouter();
  const supabase = React.useMemo(() => createSupabaseClient(), []);
  
  // Debug: Log every render
  const renderCount = React.useRef(0);
  renderCount.current += 1;
  console.log(`[DashboardMetricCard] RENDER #${renderCount.current} for variant:`, variant);

  // Support both single locationId and multiple locationIds for aggregation
  const effectiveLocationId = locationId || undefined;
  
  // Memoize locationIds to prevent infinite loops from array reference changes
  // Create a stable string key WITHOUT mutating the original array (spread before sort)
  const locationIdsKey = React.useMemo(
    () => locationIds && locationIds.length > 0 
      ? [...locationIds].sort().join(',') 
      : (locationId || 'none'),
    [locationIds, locationId]
  );
  
  // Store the actual array, only update when the key changes
  const effectiveLocationIds = React.useMemo(
    () => {
      if (locationIds && locationIds.length > 0) {
        return locationIds;
      }
      if (locationId) {
        return [locationId];
      }
      return undefined;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locationIdsKey] // Use the stable key instead of the array directly
  );
  
  // Check if this is a placeholder variant (no table configured)
  const isPlaceholderVariant = !VARIANT_CONFIG[variant]?.table;

  const [metricState, setMetricState] = React.useState<MetricState | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  console.log(`[DashboardMetricCard] State for ${variant}:`, { loading, metricState: metricState?.total, error });

  const config = VARIANT_CONFIG[variant];

  const fetchMetrics = React.useCallback(async () => {
    console.log('[DashboardMetricCard] fetchMetrics called for variant:', variant);
    console.log('[DashboardMetricCard] effectiveLocationId:', effectiveLocationId);
    console.log('[DashboardMetricCard] effectiveLocationIds:', effectiveLocationIds);
    console.log('[DashboardMetricCard] locationIdsKey:', locationIdsKey);
    
    // For placeholder variants, show static zero data
    if (isPlaceholder || isPlaceholderVariant) {
      setMetricState({
        total: 0,
        change: 0,
        percent: 0,
        timestamp: new Date(),
      });
      setLoading(false);
      return;
    }
    
    if (!effectiveLocationId && !effectiveLocationIds) {
      console.log('[DashboardMetricCard] No location IDs, returning early');
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

    const applyBaseFilters = (query: any) => {
      if (effectiveLocationIds && effectiveLocationIds.length > 0) {
        return query.in('location_id', effectiveLocationIds);
      }
      return effectiveLocationId ? query.eq('location_id', effectiveLocationId) : query;
    };

    try {
      console.log('[DashboardMetricCard] Building queries for table:', config.table);
      console.log('[DashboardMetricCard] Date range:', currentStartIso, 'to', nowIso);
      
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

      console.log('[DashboardMetricCard] Executing queries...');
      const results = await Promise.all([currentQuery, previousQuery]);
      console.log('[DashboardMetricCard] Query results:', results);
      
      const [{ count: currentCount, error: currentError }, { count: previousCount, error: previousError }] = results;

      if (currentError || previousError) {
        console.error('[DashboardMetricCard] Query error:', currentError || previousError);
        throw currentError || previousError;
      }
      
      console.log('[DashboardMetricCard] Counts - current:', currentCount, 'previous:', previousCount);

      const safeCurrent = currentCount ?? 0;
      const safePrevious = previousCount ?? 0;
      const change = safeCurrent - safePrevious;

      let percentChange = 0;
      if (safePrevious === 0) {
        percentChange = safeCurrent > 0 ? 100 : 0;
      } else {
        percentChange = (change / safePrevious) * 100;
      }

      const newState = {
        total: safeCurrent,
        change,
        percent: percentChange,
        timestamp: now,
      };
      console.log('[DashboardMetricCard] Setting metric state:', newState, 'for variant:', variant);
      setMetricState(newState);
    } catch (err) {
      console.error('[DashboardMetricCard] Failed to load metrics:', err);
      setMetricState(null);
      setError('Unable to load metrics right now.');
    } finally {
      console.log('[DashboardMetricCard] Setting loading to false for variant:', variant);
      setLoading(false);
    }
  }, [
    config.dateColumn,
    config.table,
    effectiveLocationId,
    effectiveLocationIds,
    isPlaceholder,
    isPlaceholderVariant,
    locationIdsKey,
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
              <ArrowUpIcon className={arrowClasses} />
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

