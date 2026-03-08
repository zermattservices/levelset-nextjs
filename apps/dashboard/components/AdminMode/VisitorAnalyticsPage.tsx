/**
 * VisitorAnalyticsPage
 * Visitor analytics dashboard for the CRM admin mode.
 * Shows unique visitors, sessions, bounce rate, dwell time, top pages, and traffic sources.
 */

import * as React from 'react';
import { CircularProgress } from '@mui/material';
import styles from './VisitorAnalyticsPage.module.css';

// ─── Types ──────────────────────────────────────────────────────────────────

type RangeKey = '1d' | '7d' | '30d';

interface AnalyticsData {
  summary: {
    uniqueVisitors: number;
    totalSessions: number;
    avgSessionDuration: number;
    bounceRate: number;
    pagesPerSession: number;
  };
  dailyTrend: Array<{ date: string; visitors: number; sessions: number }>;
  topPages: Array<{ url: string; views: number; avgTimeOnPage: number }>;
  trafficSources: Array<{ source: string; sessions: number; percentage: number }>;
  utmCampaigns: Array<{ campaign: string; source: string; medium: string; sessions: number }>;
  comparison: {
    visitorsChange: number;
    sessionsChange: number;
    bounceRateChange: number;
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  return `${seconds}s`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

const RANGE_LABELS: Record<RangeKey, string> = {
  '1d': 'Today',
  '7d': '7 Days',
  '30d': '30 Days',
};

// ─── Component ──────────────────────────────────────────────────────────────

export function VisitorAnalyticsPage() {
  const [data, setData] = React.useState<AnalyticsData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [range, setRange] = React.useState<RangeKey>('7d');

  React.useEffect(() => {
    let cancelled = false;

    async function loadAnalytics() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/visitor-analytics?range=${range}`);
        if (!res.ok) throw new Error('Failed to load');
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (err) {
        console.error('Error loading visitor analytics:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAnalytics();
    return () => { cancelled = true; };
  }, [range]);

  // ─── Render ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <CircularProgress size={32} sx={{ color: 'var(--ls-color-brand)' }} />
        <span>Loading visitor analytics...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.loadingContainer}>
        <span>Failed to load analytics data.</span>
      </div>
    );
  }

  const { summary, dailyTrend, topPages, trafficSources, utmCampaigns, comparison } = data;
  const maxDailyVisitors = Math.max(...dailyTrend.map((d) => d.visitors), 1);

  return (
    <div className={styles.container}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Visitor Analytics</h1>
          <p className={styles.subtitle}>
            Marketing site traffic, engagement, and visitor behavior
          </p>
        </div>
        <div className={styles.rangeSelector}>
          {(['1d', '7d', '30d'] as RangeKey[]).map((r) => (
            <button
              key={r}
              className={`${styles.rangeButton} ${range === r ? styles.rangeButtonActive : ''}`}
              onClick={() => setRange(r)}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Summary Cards ──────────────────────────────────────────── */}
      <div className={styles.summaryCards}>
        <SummaryCard
          label="Unique Visitors"
          value={String(summary.uniqueVisitors)}
          delta={comparison.visitorsChange}
        />
        <SummaryCard
          label="Sessions"
          value={String(summary.totalSessions)}
          delta={comparison.sessionsChange}
        />
        <SummaryCard
          label="Avg Duration"
          value={formatDuration(summary.avgSessionDuration)}
        />
        <SummaryCard
          label="Bounce Rate"
          value={`${summary.bounceRate}%`}
          delta={comparison.bounceRateChange}
          invertDelta
        />
        <SummaryCard
          label="Pages / Session"
          value={String(summary.pagesPerSession)}
        />
      </div>

      {/* ── Daily Trend ────────────────────────────────────────────── */}
      {dailyTrend.length > 0 && (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Daily Visitors</h2>
          <div className={styles.barChart}>
            {dailyTrend.map((day) => {
              const heightPct = Math.max((day.visitors / maxDailyVisitors) * 100, 2);
              return (
                <div key={day.date} className={styles.barColumn}>
                  <span className={styles.barCount}>
                    {day.visitors > 0 ? day.visitors : ''}
                  </span>
                  <div
                    className={styles.bar}
                    style={{ height: `${heightPct}%` }}
                  />
                  <span className={styles.barLabel}>
                    {range === '1d'
                      ? formatDate(day.date)
                      : range === '30d'
                        ? formatDate(day.date)
                        : formatDayLabel(day.date)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Top Pages ──────────────────────────────────────────────── */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Top Pages</h2>
        {topPages.length === 0 ? (
          <p className={styles.emptyState}>No page view data yet</p>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Page</th>
                  <th>Views</th>
                  <th>Avg Time</th>
                </tr>
              </thead>
              <tbody>
                {topPages.map((page) => (
                  <tr key={page.url}>
                    <td className={styles.urlCell}>{page.url}</td>
                    <td>{page.views}</td>
                    <td>{page.avgTimeOnPage > 0 ? formatDuration(page.avgTimeOnPage) : '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Two Column: Traffic Sources + UTM Campaigns ────────────── */}
      <div className={styles.twoCol}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Traffic Sources</h2>
          {trafficSources.length === 0 ? (
            <p className={styles.emptyState}>No traffic source data</p>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Sessions</th>
                    <th>%</th>
                  </tr>
                </thead>
                <tbody>
                  {trafficSources.map((src) => (
                    <tr key={src.source}>
                      <td>{src.source}</td>
                      <td>{src.sessions}</td>
                      <td>{src.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>UTM Campaigns</h2>
          {utmCampaigns.length === 0 ? (
            <p className={styles.emptyState}>No campaign data</p>
          ) : (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Source</th>
                    <th>Sessions</th>
                  </tr>
                </thead>
                <tbody>
                  {utmCampaigns.map((c, i) => (
                    <tr key={`${c.campaign}-${i}`}>
                      <td>{c.campaign}</td>
                      <td>{c.source}</td>
                      <td>{c.sessions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Summary Card Sub-component ─────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  delta,
  invertDelta,
}: {
  label: string;
  value: string;
  delta?: number;
  invertDelta?: boolean;
}) {
  let deltaEl = null;
  if (delta !== undefined && delta !== 0) {
    const isPositive = delta > 0;
    const isGood = invertDelta ? !isPositive : isPositive;
    const arrow = isPositive ? '\u2191' : '\u2193';
    const sign = isPositive ? '+' : '';
    deltaEl = (
      <span
        className={`${styles.summaryDelta} ${isGood ? styles.summaryDeltaUp : styles.summaryDeltaDown}`}
      >
        {arrow} {sign}{delta}%
      </span>
    );
  }

  return (
    <div className={styles.summaryCard}>
      <span className={styles.summaryLabel}>{label}</span>
      <span className={styles.summaryValue}>{value}</span>
      {deltaEl}
    </div>
  );
}

export default VisitorAnalyticsPage;
