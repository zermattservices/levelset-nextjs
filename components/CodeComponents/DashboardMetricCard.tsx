import React from 'react';
import { useRouter } from 'next/router';
import { usePlasmicCanvasContext } from '@plasmicapp/loader-nextjs';
import { useDataEnv } from '@plasmicapp/react-web/lib/host';

import { createSupabaseClient } from '@/util/supabase/component';

import ArrowUpIcon from '@/components/plasmic/levelset_v_2/icons/PlasmicIcon__ArrowUp';
import styles from './DashboardMetricCard.module.css';

type MetricVariant = 'positional-excellence' | 'discipline-points';

interface DashboardMetricCardProps {
  variant: MetricVariant;
  orgId?: string;
  locationId?: string;
  linkHref?: string;
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

function formatMonthLabel(date: Date): string {
  return date.toLocaleString('en-US', { month: 'long' });
}

export function DashboardMetricCard({
  variant,
  orgId,
  locationId,
  linkHref,
  className,
}: DashboardMetricCardProps) {
  const router = useRouter();
  const inEditor = usePlasmicCanvasContext();
  const dataEnv = useDataEnv?.();
  const supabase = React.useMemo(() => createSupabaseClient(), []);

  const effectiveOrgId = orgId || dataEnv?.auth?.org_id || undefined;
  const effectiveLocationId = locationId || dataEnv?.auth?.location_id || undefined;

  const [metricState, setMetricState] = React.useState<MetricState | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const config = VARIANT_CONFIG[variant];

  const fetchMetrics = React.useCallback(async () => {
    // Provide representative sample data in Plasmic Studio when IDs are absent
    if (inEditor && (!effectiveOrgId || !effectiveLocationId)) {
      const sample: MetricState =
        variant === 'positional-excellence'
          ? { total: 863, change: 27, percent: 11.1, timestamp: new Date() }
          : { total: 55, change: 3, percent: 5.8, timestamp: new Date() };
      setMetricState(sample);
      setError(null);
      setLoading(false);
      return;
    }

    if (!effectiveOrgId || !effectiveLocationId) {
      setMetricState(null);
      setError('Location or organization missing.');
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
      let filtered = query.eq('org_id', effectiveOrgId as string);
      if (effectiveLocationId) {
        filtered = filtered.eq('location_id', effectiveLocationId);
      }
      return filtered;
    };

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
    effectiveOrgId,
    inEditor,
    supabase,
    variant,
  ]);

  React.useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const handleNavigate = React.useCallback(() => {
    if (!linkHref) {
      return;
    }
    router.push(linkHref).catch((err) => {
      console.error('[DashboardMetricCard] Navigation error:', err);
    });
  }, [linkHref, router]);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!linkHref) {
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleNavigate();
      }
    },
    [handleNavigate, linkHref]
  );

  const isClickable = Boolean(linkHref);
  const containerClasses = [styles.root, className].filter(Boolean).join(' ');
  const cardClasses = [styles.metricItem, isClickable ? styles.clickable : '']
    .filter(Boolean)
    .join(' ');

  if (loading) {
    return (
      <div className={containerClasses}>
        <div className={styles.metricItem}>
          <div className={styles.loadingState}>Loading metrics…</div>
        </div>
      </div>
    );
  }

  if (error || !metricState) {
    return (
      <div className={containerClasses}>
        <div className={styles.metricItem}>
          <div className={styles.errorState}>{error || 'Metrics unavailable.'}</div>
        </div>
      </div>
    );
  }

  const { total, change, percent, timestamp } = metricState;

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
          <div className={percentTrendClasses} aria-live="polite">
            <ArrowUpIcon className={arrowClasses} />
            <span>{percentText}</span>
          </div>
        </div>

        <div className={styles.supportingMetrics}>
          <div className={styles.primaryRow}>
            <span className={styles.primaryLabel}>{config.totalLabel}</span>
            <span className={styles.primaryValue}>{formatNumber(total)}</span>
            <span className={styles.primaryMeta}>
              <span className={deltaClasses}>{deltaText}</span>
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

