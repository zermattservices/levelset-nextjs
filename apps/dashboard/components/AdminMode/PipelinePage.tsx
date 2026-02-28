/**
 * PipelinePage
 * Pipeline analytics dashboard for the CRM admin mode.
 * Shows lead funnel, conversion rates, value metrics, and recent activity.
 */

import * as React from 'react';
import { CircularProgress } from '@mui/material';
import { createSupabaseClient } from '@/util/supabase/component';
import styles from './PipelinePage.module.css';

// ─── Constants ──────────────────────────────────────────────────────────────

const STAGES = ['new', 'contacted', 'trial', 'onboarded', 'converted', 'lost'] as const;
type Stage = (typeof STAGES)[number];

const FUNNEL_STAGES: Stage[] = ['new', 'contacted', 'trial', 'onboarded', 'converted'];

const STAGE_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  trial: 'Trial',
  onboarded: 'Onboarded',
  converted: 'Converted',
  lost: 'Lost',
};

const STAGE_COLORS: Record<string, string> = {
  new: '#2196F3',
  contacted: '#FF9800',
  trial: '#9C27B0',
  onboarded: '#00897B',
  converted: '#4CAF50',
  lost: '#F44336',
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface Lead {
  id: string;
  pipeline_stage: string;
  engagement_score: number | null;
  estimated_value_cents: number | null;
  lost_reason: string | null;
  created_at: string;
}

interface LeadEvent {
  id: string;
  event_type: string;
  created_at: string;
  leads: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | {
    first_name: string | null;
    last_name: string | null;
    email: string;
  }[] | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatUSD(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatEventType(type: string): string {
  return type
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatTimestamp(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function getLeadName(event: LeadEvent): string {
  if (!event.leads) return 'Unknown';
  // Supabase returns joined rows as an array or single object depending on the relationship
  const lead = Array.isArray(event.leads) ? event.leads[0] : event.leads;
  if (!lead) return 'Unknown';
  const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ');
  return name || lead.email || 'Unknown';
}

// ─── Component ──────────────────────────────────────────────────────────────

export function PipelinePage() {
  const [leads, setLeads] = React.useState<Lead[]>([]);
  const [events, setEvents] = React.useState<LeadEvent[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const supabase = createSupabaseClient();

        const [leadsRes, eventsRes] = await Promise.all([
          supabase
            .from('leads')
            .select('id, pipeline_stage, engagement_score, estimated_value_cents, lost_reason, created_at'),
          supabase
            .from('lead_events')
            .select('id, event_type, created_at, leads(first_name, last_name, email)')
            .order('created_at', { ascending: false })
            .limit(10),
        ]);

        if (leadsRes.data) setLeads(leadsRes.data as Lead[]);
        if (eventsRes.data) setEvents(eventsRes.data as LeadEvent[]);
      } catch (err) {
        console.error('Error loading pipeline data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // ─── Computed values ────────────────────────────────────────────────────

  const stageCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    STAGES.forEach((s) => (counts[s] = 0));
    leads.forEach((lead) => {
      if (counts[lead.pipeline_stage] !== undefined) {
        counts[lead.pipeline_stage]++;
      }
    });
    return counts;
  }, [leads]);

  const nonLostLeads = React.useMemo(
    () => leads.filter((l) => l.pipeline_stage !== 'lost'),
    [leads]
  );

  const totalLeads = nonLostLeads.length;

  const pipelineValue = React.useMemo(
    () => nonLostLeads.reduce((sum, l) => sum + (l.estimated_value_cents || 0), 0),
    [nonLostLeads]
  );

  const conversionRate = React.useMemo(() => {
    if (leads.length === 0) return 0;
    const converted = leads.filter((l) => l.pipeline_stage === 'converted').length;
    return Math.round((converted / leads.length) * 100);
  }, [leads]);

  const avgEngagement = React.useMemo(() => {
    const withScore = leads.filter((l) => l.engagement_score != null);
    if (withScore.length === 0) return 0;
    const total = withScore.reduce((sum, l) => sum + (l.engagement_score || 0), 0);
    return Math.round(total / withScore.length);
  }, [leads]);

  const maxStageCount = React.useMemo(
    () => Math.max(...STAGES.map((s) => stageCounts[s]), 1),
    [stageCounts]
  );

  // Stage-to-stage conversion rates
  const stageConversions = React.useMemo(() => {
    const pairs: { from: Stage; to: Stage; rate: number }[] = [];
    for (let i = 0; i < FUNNEL_STAGES.length - 1; i++) {
      const fromStage = FUNNEL_STAGES[i];
      const toStage = FUNNEL_STAGES[i + 1];
      const fromCount = stageCounts[fromStage];
      // "reached this stage or beyond" = sum of this stage + all later stages
      const reachedTo = FUNNEL_STAGES.slice(i + 1).reduce((sum, s) => sum + stageCounts[s], 0);
      const rate = fromCount + reachedTo > 0
        ? Math.round((reachedTo / (fromCount + reachedTo)) * 100)
        : 0;
      pairs.push({ from: fromStage, to: toStage, rate });
    }
    return pairs;
  }, [stageCounts]);

  // Value by stage
  const stageValues = React.useMemo(() => {
    const values: Record<string, { count: number; total: number }> = {};
    STAGES.forEach((s) => (values[s] = { count: 0, total: 0 }));
    leads.forEach((lead) => {
      const s = lead.pipeline_stage;
      if (values[s]) {
        values[s].count++;
        values[s].total += lead.estimated_value_cents || 0;
      }
    });
    return values;
  }, [leads]);

  const grandTotalValue = React.useMemo(
    () => leads.reduce((sum, l) => sum + (l.estimated_value_cents || 0), 0),
    [leads]
  );

  // Lost reasons
  const lostReasons = React.useMemo(() => {
    const reasons: Record<string, number> = {};
    leads
      .filter((l) => l.pipeline_stage === 'lost' && l.lost_reason)
      .forEach((l) => {
        const reason = l.lost_reason as string;
        reasons[reason] = (reasons[reason] || 0) + 1;
      });
    return Object.entries(reasons).sort((a, b) => b[1] - a[1]);
  }, [leads]);

  // ─── Render ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <CircularProgress size={32} sx={{ color: 'var(--ls-color-brand)' }} />
        <span>Loading pipeline data...</span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Pipeline</h1>
          <p className={styles.subtitle}>
            Lead funnel analytics, conversion rates, and pipeline value
          </p>
        </div>
      </div>

      {/* ── Summary Cards ──────────────────────────────────────────────────── */}
      <div className={styles.summaryCards}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Total Leads</span>
          <span className={styles.summaryValue}>{totalLeads}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Pipeline Value</span>
          <span className={styles.summaryValue}>{formatUSD(pipelineValue)}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Conversion Rate</span>
          <span className={styles.summaryValue}>{conversionRate}%</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Avg Engagement</span>
          <span className={styles.summaryValue}>{avgEngagement}</span>
        </div>
      </div>

      {/* ── Pipeline Funnel ────────────────────────────────────────────────── */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Pipeline Funnel</h2>
        <div className={styles.funnel}>
          {STAGES.map((stage) => {
            const count = stageCounts[stage];
            const pct = maxStageCount > 0 ? Math.max((count / maxStageCount) * 100, 2) : 2;
            const totalAll = leads.length || 1;
            const sharePct = Math.round((count / totalAll) * 100);
            return (
              <div key={stage} className={styles.funnelRow}>
                <span className={styles.funnelLabel}>{STAGE_LABELS[stage]}</span>
                <div className={styles.funnelBarTrack}>
                  <div
                    className={styles.funnelBar}
                    style={{
                      width: `${pct}%`,
                      backgroundColor: STAGE_COLORS[stage],
                    }}
                  />
                </div>
                <span className={styles.funnelCount}>
                  {count} <span className={styles.funnelPct}>({sharePct}%)</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Stage-to-Stage Conversion ──────────────────────────────────────── */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Stage-to-Stage Conversion</h2>
        <div className={styles.conversions}>
          {stageConversions.map(({ from, to, rate }) => (
            <div key={`${from}-${to}`} className={styles.conversionRow}>
              <div className={styles.conversionStages}>
                <span
                  className={styles.conversionStageBadge}
                  style={{ backgroundColor: STAGE_COLORS[from] }}
                >
                  {STAGE_LABELS[from]}
                </span>
                <span className={styles.conversionArrow}>&#8594;</span>
                <span
                  className={styles.conversionStageBadge}
                  style={{ backgroundColor: STAGE_COLORS[to] }}
                >
                  {STAGE_LABELS[to]}
                </span>
              </div>
              <div className={styles.conversionRateContainer}>
                <div className={styles.conversionRateTrack}>
                  <div
                    className={styles.conversionRateFill}
                    style={{ width: `${rate}%` }}
                  />
                </div>
                <span className={styles.conversionRateValue}>{rate}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Two-column: Value by Stage + Lost Reasons / Recent Activity ──── */}
      <div className={styles.twoCol}>
        {/* Value by Stage */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Pipeline Value by Stage</h2>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Stage</th>
                  <th>Leads</th>
                  <th>Total Value</th>
                  <th>Avg / Lead</th>
                </tr>
              </thead>
              <tbody>
                {STAGES.map((stage) => {
                  const { count, total } = stageValues[stage];
                  const avg = count > 0 ? Math.round(total / count) : 0;
                  return (
                    <tr key={stage}>
                      <td>
                        <span
                          className={styles.stageDot}
                          style={{ backgroundColor: STAGE_COLORS[stage] }}
                        />
                        {STAGE_LABELS[stage]}
                      </td>
                      <td>{count}</td>
                      <td>{formatUSD(total)}</td>
                      <td>{count > 0 ? formatUSD(avg) : '--'}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className={styles.totalRow}>
                  <td>Total</td>
                  <td>{leads.length}</td>
                  <td>{formatUSD(grandTotalValue)}</td>
                  <td>
                    {leads.length > 0
                      ? formatUSD(Math.round(grandTotalValue / leads.length))
                      : '--'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Right column: Lost Reasons + Recent Activity */}
        <div className={styles.rightCol}>
          {/* Lost Reasons */}
          {lostReasons.length > 0 && (
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Lost Reasons</h2>
              <ul className={styles.lostList}>
                {lostReasons.map(([reason, count]) => (
                  <li key={reason} className={styles.lostItem}>
                    <span className={styles.lostReason}>{reason}</span>
                    <span className={styles.lostCount}>{count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recent Activity */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Recent Activity</h2>
            {events.length === 0 ? (
              <p className={styles.emptyState}>No recent activity</p>
            ) : (
              <ul className={styles.activityList}>
                {events.map((event) => (
                  <li key={event.id} className={styles.activityItem}>
                    <div className={styles.activityDot} />
                    <div className={styles.activityContent}>
                      <span className={styles.activityType}>
                        {formatEventType(event.event_type)}
                      </span>
                      <span className={styles.activityLead}>{getLeadName(event)}</span>
                    </div>
                    <span className={styles.activityTime}>
                      {formatTimestamp(event.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default PipelinePage;
