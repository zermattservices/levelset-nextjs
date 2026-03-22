"use client";

import * as React from "react";
import { Box, Skeleton } from "@mui/material";
import { format, parseISO } from "date-fns";
import { createSupabaseClient } from "@/util/supabase/component";
import { DashboardMetricCard } from "@/components/CodeComponents/DashboardMetricCard";
import type { Employee } from "@/lib/supabase.types";
import { useLocationContext } from "@/components/CodeComponents/LocationContext";
import styles from "./EmployeeOverviewTab.module.css";

// ------------------------------------------------------------------
// Pillar colors by displayOrder (matches OperationalExcellencePage)
// ------------------------------------------------------------------
const PILLAR_COLORS: Record<number, string> = {
  1: '#12b76a', // green
  2: '#f59e0b', // amber
  3: '#8b5cf6', // purple
  4: '#3b82f6', // blue
  5: '#ec4899', // pink
};

// ------------------------------------------------------------------
// Types for OE API response
// ------------------------------------------------------------------
interface OEPillar {
  id: string;
  name: string;
  weight: number;
  displayOrder: number;
  score: number;
  priorScore: number;
  change: number;
  percentChange: number;
}

interface OEEmployeeScore {
  employeeId: string;
  name: string;
  overallScore: number;
  priorOverallScore: number | null;
  change: number | null;
  pillarScores: Record<string, number>;
  priorPillarScores: Record<string, number>;
  ratingCount: number;
}

interface OEData {
  employee: OEEmployeeScore;
  pillars: OEPillar[];
}

// ------------------------------------------------------------------
// Types for positional ratings
// ------------------------------------------------------------------
interface PositionAverage {
  position: string;
  average: number;
  count: number;
}

// ------------------------------------------------------------------
// Types for discipline data
// ------------------------------------------------------------------
interface TimelineItem {
  id: string;
  date: string;
  type: 'infraction' | 'action';
  label: string;
  points: number;
  leaderName: string;
}

interface DisciplineData {
  totalPoints: number;
  maxThreshold: number;
  infractionCount: number;
  discActionCount: number;
  timeline: TimelineItem[];
}

// ------------------------------------------------------------------
// Helpers — matches OE page buildCustomMetric pattern
// ------------------------------------------------------------------
function buildCustomMetric(
  title: string,
  score: number,
  change: number,
  percentChange: number,
  valueSuffix = ' /100',
) {
  return {
    title,
    percentChange,
    isNegativeChange: change < 0,
    primaryValue: score.toFixed(1),
    valueSuffix,
    changeText: `${change >= 0 ? '+' : ''}${change.toFixed(1)} pts`,
    periodLabel: 'vs prior period',
  };
}

function getRatingColor(avg: number): string {
  if (avg >= 2.75) return 'var(--ls-color-success-vivid)';
  if (avg >= 2.0) return 'var(--ls-color-warning-base)';
  return 'var(--ls-color-destructive-medium)';
}

// ------------------------------------------------------------------
// Loading skeleton (mirrors OE page skeleton pattern)
// ------------------------------------------------------------------
function OverviewSkeleton() {
  return (
    <div className={styles.container}>
      {/* Score cards skeleton */}
      <div className={styles.scoreCardsSection}>
        <div className={styles.oeCardCell}>
          <Skeleton variant="rounded" animation="wave" sx={{ height: '100%', minHeight: 160, borderRadius: '16px' }} />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" animation="wave" sx={{ height: 100, borderRadius: '16px' }} />
        ))}
      </div>

      {/* Bottom section skeleton */}
      {/* Four-card grid skeleton */}
      <div className={styles.fourCardGrid}>
        <div className={styles.card}>
          <Skeleton variant="text" width={140} height={24} sx={{ mb: 1 }} />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="text" width="100%" height={32} sx={{ mb: 0.5 }} />
          ))}
        </div>
        <div className={styles.card}>
          <Skeleton variant="text" width={100} height={24} sx={{ mb: 1 }} />
          <Skeleton variant="text" width={60} height={40} />
          <Skeleton variant="rounded" width="100%" height={8} sx={{ mt: 2, borderRadius: '4px' }} />
        </div>
        <div className={styles.card}>
          <Skeleton variant="text" width={120} height={24} sx={{ mb: 1 }} />
          <Skeleton variant="text" width="60%" height={16} />
          <Skeleton variant="rounded" width="100%" height={6} sx={{ mt: 1, borderRadius: '3px' }} />
          <Skeleton variant="rounded" width="100%" height={6} sx={{ mt: 1, borderRadius: '3px' }} />
          <Skeleton variant="rounded" width="100%" height={6} sx={{ mt: 1, borderRadius: '3px' }} />
        </div>
        <div className={styles.card}>
          <Skeleton variant="text" width={80} height={24} />
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Evaluation Overview Card
// ------------------------------------------------------------------

function getScoreColor(pct: number): string {
  if (pct >= 80) return '#16A34A';
  if (pct >= 60) return '#FACC15';
  return '#D23230';
}

function EvaluationOverviewCard({ employeeId, onViewMore }: { employeeId: string; onViewMore: () => void }) {
  const { selectedLocationOrgId } = useLocationContext();
  const [loading, setLoading] = React.useState(true);
  const [hasTemplates, setHasTemplates] = React.useState<boolean | null>(null);
  const [lastEval, setLastEval] = React.useState<{
    template_name: string;
    score: number | null;
    submitted_by_name: string | null;
    created_at: string;
    sections: Array<{ name: string; percentage: number }>;
  } | null>(null);

  React.useEffect(() => {
    if (!employeeId || !selectedLocationOrgId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const supabase = createSupabaseClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        // Check if org has evaluation templates
        const tmplRes = await fetch(
          `/api/forms?org_id=${encodeURIComponent(selectedLocationOrgId)}&form_type=evaluation`,
          { headers }
        );
        if (tmplRes.ok) {
          const tmplData = await tmplRes.json();
          const templates = Array.isArray(tmplData) ? tmplData : (tmplData.templates ?? []);
          if (!cancelled) setHasTemplates(templates.length > 0);
        }

        const res = await fetch(
          `/api/forms/submissions?org_id=${encodeURIComponent(selectedLocationOrgId)}&form_type=evaluation&employee_id=${encodeURIComponent(employeeId)}&limit=1`,
          { headers }
        );
        if (!res.ok) return;
        const data = await res.json();
        const subs = Array.isArray(data) ? data : (data.submissions ?? []);
        if (subs.length > 0 && !cancelled) {
          const s = subs[0];
          const rawSections = s.metadata?.section_scores ?? s.metadata?.sections ?? [];
          setLastEval({
            template_name: s.template?.name ?? 'Evaluation',
            score: s.score,
            submitted_by_name: s.submitted_by_name ?? null,
            created_at: s.created_at,
            sections: rawSections.map((sec: any) => ({
              name: sec.sectionName ?? sec.name ?? '',
              percentage: Math.round(sec.percentage ?? 0),
            })),
          });
        }
      } catch { /* silently fail */ }
      finally { if (!cancelled) setLoading(false); }
    }

    load();
    return () => { cancelled = true; };
  }, [employeeId, selectedLocationOrgId]);

  if (loading) {
    return (
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>Evaluations</span>
        </div>
        <Skeleton variant="text" width="60%" height={16} />
        <Skeleton variant="rounded" width="100%" height={6} sx={{ borderRadius: '3px' }} />
        <Skeleton variant="rounded" width="100%" height={6} sx={{ borderRadius: '3px' }} />
        <Skeleton variant="rounded" width="100%" height={6} sx={{ borderRadius: '3px' }} />
      </div>
    );
  }

  if (hasTemplates === false) {
    return (
      <div className={styles.card} style={{ alignItems: 'center', justifyContent: 'center', gap: 8, textAlign: 'center' }}>
        <span className={styles.cardTitle}>Evaluations</span>
        <span style={{ fontFamily: '"Satoshi", sans-serif', fontSize: 13, color: 'var(--ls-color-muted)' }}>
          No evaluation forms configured
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); window.location.href = '/evaluations'; }}
          style={{
            fontFamily: '"Satoshi", sans-serif', fontSize: 12, fontWeight: 600,
            color: '#fff', backgroundColor: 'var(--ls-color-brand)',
            border: 'none', borderRadius: 8, padding: '6px 16px', cursor: 'pointer',
            marginTop: 4,
          }}
        >
          Set Up Evaluations
        </button>
      </div>
    );
  }

  if (!lastEval) {
    return (
      <div className={styles.card} style={{ cursor: 'pointer' }} onClick={onViewMore}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>Evaluations</span>
        </div>
        <span style={{ fontFamily: '"Satoshi", sans-serif', fontSize: 13, color: 'var(--ls-color-muted)' }}>
          No evaluations yet
        </span>
      </div>
    );
  }

  const score = lastEval.score != null ? Math.round(lastEval.score) : null;
  const scoreColor = score != null ? getScoreColor(score) : 'var(--ls-color-muted)';

  return (
    <div className={styles.card} style={{ gap: 8 }}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitleGroup}>
          <span className={styles.cardTitle}>Evaluations</span>
          <button className={styles.goButton} onClick={(e) => { e.stopPropagation(); onViewMore(); }} type="button">Go Now</button>
        </span>
        {score != null && (
          <span style={{ fontFamily: '"Satoshi", sans-serif', fontSize: 20, fontWeight: 700, color: scoreColor, lineHeight: 1 }}>
            {score}%
          </span>
        )}
      </div>
      <div style={{ fontFamily: '"Satoshi", sans-serif', fontSize: 13, color: 'var(--ls-color-muted)' }}>
        {lastEval.template_name} · {format(new Date(lastEval.created_at), 'MMM d, yyyy')}
      </div>

      {lastEval.sections.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
          {lastEval.sections.map((sec, i) => {
            const c = getScoreColor(sec.percentage);
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: '"Satoshi", sans-serif', fontSize: 13, fontWeight: 500, color: 'var(--ls-color-text-primary)' }}>
                    {sec.name}
                  </span>
                  <span style={{ fontFamily: '"Satoshi", sans-serif', fontSize: 13, fontWeight: 700, color: c }}>
                    {sec.percentage}%
                  </span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: 'var(--ls-color-neutral-foreground)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, sec.percentage)}%`, backgroundColor: c, borderRadius: 2 }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {lastEval.submitted_by_name && (
        <div style={{ fontFamily: '"Satoshi", sans-serif', fontSize: 13, color: 'var(--ls-color-muted)' }}>
          Rated by {lastEval.submitted_by_name}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// Component
// ------------------------------------------------------------------
export interface EmployeeOverviewTabProps {
  employee: Employee;
  locationId: string;
  onTabChange?: (tab: string) => void;
}

export function EmployeeOverviewTab({ employee, locationId, onTabChange }: EmployeeOverviewTabProps) {
  const [loading, setLoading] = React.useState(true);
  const [oeData, setOeData] = React.useState<OEData | null>(null);
  const [positionAverages, setPositionAverages] = React.useState<PositionAverage[]>([]);
  const [disciplineData, setDisciplineData] = React.useState<DisciplineData | null>(null);

  const supabase = createSupabaseClient();

  // Consolidated data fetch — all three sections load in parallel
  React.useEffect(() => {
    let cancelled = false;

    async function fetchOEData(): Promise<OEData | null> {
      const now = new Date();
      const start = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const startISO = start.toISOString();
      const endISO = now.toISOString();

      const params = new URLSearchParams({
        location_id: locationId,
        start: startISO,
        end: endISO,
      });
      const res = await fetch(`/api/operational-excellence?${params}`);
      if (!res.ok) throw new Error('Failed to fetch OE data');

      const json = await res.json();
      const empMatch = (json.employees || []).find(
        (e: OEEmployeeScore) => e.employeeId === employee.id
      );

      return empMatch ? { employee: empMatch, pillars: json.pillars || [] } : null;
    }

    async function fetchPositionAverages(): Promise<PositionAverage[]> {
      // Fetch ratings across all locations (intentional — matches certification system behavior
      // in fetch-position-averages.ts). Position averages reflect overall employee performance,
      // not location-specific performance.
      const { data, error } = await supabase
        .from('ratings')
        .select('position, rating_avg, created_at')
        .eq('employee_id', employee.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by position, take last 4 per position, average their rating_avg
      const grouped: Record<string, number[]> = {};
      for (const row of data || []) {
        const pos = row.position || 'Unknown';
        if (!grouped[pos]) grouped[pos] = [];
        if (grouped[pos].length < 4 && row.rating_avg != null) {
          grouped[pos].push(row.rating_avg);
        }
      }

      // Also count total ratings per position (not just last 4)
      const totalCounts: Record<string, number> = {};
      for (const row of data || []) {
        const pos = row.position || 'Unknown';
        totalCounts[pos] = (totalCounts[pos] || 0) + 1;
      }

      const averages: PositionAverage[] = Object.entries(grouped).map(
        ([position, scores]) => ({
          position,
          average: scores.reduce((sum, s) => sum + s, 0) / scores.length,
          count: Math.min(totalCounts[position] || 0, 4),
        })
      );

      averages.sort((a, b) => a.position.localeCompare(b.position));
      return averages;
    }

    async function fetchDisciplineData(): Promise<DisciplineData | null> {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      // Get org_id from locations table
      const { data: locationData, error: locationError } = await supabase
        .from('locations')
        .select('org_id')
        .eq('id', locationId)
        .single();

      if (locationError) throw locationError;

      const orgId = locationData.org_id;

      // Fetch infractions, disc_actions, and rubric in parallel
      const [infractionsRes, discActionsRes, orgRubricRes] = await Promise.all([
        supabase
          .from('infractions')
          .select('id, points, infraction_date, infraction, leader_id')
          .eq('employee_id', employee.id)
          .eq('location_id', locationId)
          .gte('infraction_date', ninetyDaysAgo)
          .order('infraction_date', { ascending: false }),
        supabase
          .from('disc_actions')
          .select('id, action_date, action_type, leader_id')
          .eq('employee_id', employee.id)
          .eq('location_id', locationId)
          .gte('action_date', ninetyDaysAgo)
          .order('action_date', { ascending: false }),
        supabase
          .from('disc_actions_rubric')
          .select('*')
          .eq('org_id', orgId)
          .is('location_id', null)
          .order('points_threshold', { ascending: true }),
      ]);

      if (infractionsRes.error) throw infractionsRes.error;
      if (discActionsRes.error) throw discActionsRes.error;
      if (orgRubricRes.error) throw orgRubricRes.error;

      // If org-level rubric is empty, fallback to location-level
      let rubric = orgRubricRes.data || [];
      if (rubric.length === 0) {
        const { data: locRubric, error: locRubricError } = await supabase
          .from('disc_actions_rubric')
          .select('*')
          .eq('location_id', locationId)
          .order('points_threshold', { ascending: true });

        if (locRubricError) throw locRubricError;
        rubric = locRubric || [];
      }

      const infractions = infractionsRes.data || [];
      const discActions = discActionsRes.data || [];
      const totalPoints = infractions.reduce(
        (sum, inf) => sum + (inf.points || 0),
        0
      );
      const maxThreshold =
        rubric.length > 0
          ? rubric[rubric.length - 1]?.points_threshold || 100
          : 100;

      // Resolve leader names for timeline
      const leaderIds = new Set<string>();
      for (const inf of infractions) {
        if (inf.leader_id) leaderIds.add(inf.leader_id);
      }
      for (const act of discActions) {
        if (act.leader_id) leaderIds.add(act.leader_id);
      }

      const leaderMap = new Map<string, string>();
      if (leaderIds.size > 0) {
        const { data: leaders } = await supabase
          .from('employees')
          .select('id, first_name, last_name')
          .in('id', Array.from(leaderIds));

        for (const l of leaders || []) {
          leaderMap.set(l.id, `${l.first_name} ${l.last_name}`);
        }
      }

      // Build unified timeline
      const timeline: TimelineItem[] = [];

      for (const inf of infractions) {
        timeline.push({
          id: inf.id,
          date: inf.infraction_date,
          type: 'infraction',
          label: inf.infraction || 'Infraction',
          points: inf.points || 0,
          leaderName: inf.leader_id ? (leaderMap.get(inf.leader_id) || '') : '',
        });
      }

      for (const act of discActions) {
        timeline.push({
          id: act.id,
          date: act.action_date,
          type: 'action',
          label: act.action_type || 'Disciplinary Action',
          points: 0,
          leaderName: act.leader_id ? (leaderMap.get(act.leader_id) || '') : '',
        });
      }

      // Sort by date descending
      timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return {
        totalPoints,
        maxThreshold,
        infractionCount: infractions.length,
        discActionCount: discActions.length,
        timeline,
      };
    }

    async function fetchAll() {
      setLoading(true);

      const [oeResult, positionsResult, disciplineResult] = await Promise.allSettled([
        fetchOEData(),
        fetchPositionAverages(),
        fetchDisciplineData(),
      ]);

      if (cancelled) return;

      if (oeResult.status === 'rejected') console.error('[EmployeeOverviewTab] OE fetch failed:', oeResult.reason);
      if (positionsResult.status === 'rejected') console.error('[EmployeeOverviewTab] Positions fetch failed:', positionsResult.reason);
      if (disciplineResult.status === 'rejected') console.error('[EmployeeOverviewTab] Discipline fetch failed:', disciplineResult.reason);

      // OE data — null on failure
      setOeData(oeResult.status === 'fulfilled' ? oeResult.value : null);

      // Position averages — empty array on failure
      setPositionAverages(
        positionsResult.status === 'fulfilled' ? positionsResult.value : []
      );

      // Discipline data — null on failure
      setDisciplineData(
        disciplineResult.status === 'fulfilled' ? disciplineResult.value : null
      );

      setLoading(false);
    }

    fetchAll();
    return () => { cancelled = true; };
  }, [employee.id, locationId]);

  if (loading) {
    return <OverviewSkeleton />;
  }

  // ----------------------------------------------------------------
  // Discipline derived values
  // ----------------------------------------------------------------
  const discRatio = disciplineData && disciplineData.maxThreshold > 0
    ? disciplineData.totalPoints / disciplineData.maxThreshold
    : 0;
  const discRatioColor = discRatio > 0.66
    ? 'var(--ls-color-destructive-base)'
    : discRatio > 0.33
      ? 'var(--ls-color-warning-base)'
      : 'var(--ls-color-success-base)';

  return (
    <div className={styles.container}>
      {/* ============================================================
          Score Cards — identical grid to OE page
          OE overall (large, 2-row span) + pillar cards
          ============================================================ */}
      <div className={styles.scoreCardsSection}>
        {oeData ? (
          <>
            <div className={styles.oeCardCell}>
              <DashboardMetricCard
                variant="positional-excellence"
                size="large"
                layout="compact"
                customMetric={buildCustomMetric(
                  'Operational Excellence',
                  oeData.employee.overallScore,
                  oeData.employee.change ?? 0,
                  oeData.employee.change != null && oeData.employee.priorOverallScore
                    ? ((oeData.employee.change) / oeData.employee.priorOverallScore) * 100
                    : 0,
                )}
              />
            </div>
            {oeData.pillars.map((p) => {
              const empScore = oeData.employee.pillarScores[p.id] ?? 0;
              const priorScore = oeData.employee.priorPillarScores[p.id];
              const pillarChange = priorScore !== undefined ? empScore - priorScore : 0;
              const pillarPctChange = priorScore && priorScore > 0
                ? (pillarChange / priorScore) * 100
                : 0;
              return (
                <DashboardMetricCard
                  key={p.id}
                  variant="positional-excellence"
                  layout="compact"
                  customMetric={buildCustomMetric(p.name, empScore, pillarChange, pillarPctChange)}
                />
              );
            })}
          </>
        ) : (
          <>
            <div className={styles.oeCardCell}>
              <DashboardMetricCard
                variant="positional-excellence"
                size="large"
                layout="compact"
                customMetric={buildCustomMetric('Operational Excellence', 0, 0, 0)}
              />
            </div>
            <div className={styles.noData}>No OE ratings in the last 90 days</div>
          </>
        )}
      </div>

      {/* ============================================================
          Four-card grid: PE Ratings, Discipline, Evaluations, Pathway
          ============================================================ */}
      <div className={styles.fourCardGrid}>
        {/* Positional Ratings */}
        <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitleGroup}>
                <span className={styles.cardTitle}>Positional Ratings</span>
                <button className={styles.goButton} onClick={() => onTabChange?.('pe')} type="button">Go Now</button>
              </span>
              <span className={styles.cardSubtitle}>Last 4 avg</span>
            </div>
            {positionAverages.length > 0 ? (
              <div className={styles.positionsScrollArea}>
                <table className={styles.positionsTable}>
                  <thead>
                    <tr>
                      <th>Position</th>
                      <th style={{ textAlign: 'right' }}>Average</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positionAverages.map((pos) => (
                      <tr key={pos.position}>
                        <td>{pos.position}</td>
                        <td className={styles.positionAvg} style={{ color: getRatingColor(pos.average) }}>
                          {pos.average.toFixed(2)}
                          {pos.count < 4 && (
                            <span className={styles.ratingCount}>({pos.count}/4)</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.noData}>No ratings found</div>
            )}
        </div>

        {/* Discipline */}
        <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitleGroup}>
                <span className={styles.cardTitle}>Discipline</span>
                <button className={styles.goButton} onClick={() => onTabChange?.('discipline')} type="button">Go Now</button>
              </span>
              <span className={styles.cardSubtitle}>Last 90 days</span>
            </div>
            {disciplineData && (disciplineData.infractionCount > 0 || disciplineData.discActionCount > 0) ? (
              <>
                {/* Progress bar — at top, below card header */}
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{
                      width: `${Math.min(discRatio * 100, 100)}%`,
                      backgroundColor: discRatio >= 0.8
                        ? 'var(--ls-color-destructive-base)'
                        : 'var(--ls-color-brand-base)',
                    }}
                  />
                </div>

                {/* Inline stats row */}
                <div className={styles.disciplineStatsRow}>
                  <span className={styles.statInline}>
                    <strong>{disciplineData.totalPoints}</strong>/{disciplineData.maxThreshold} points
                  </span>
                  <span className={styles.statInline}>
                    <strong>{disciplineData.infractionCount}</strong> infraction{disciplineData.infractionCount !== 1 ? 's' : ''}
                  </span>
                  <span className={styles.statInline}>
                    <strong>{disciplineData.discActionCount}</strong> action{disciplineData.discActionCount !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Timeline list */}
                <div className={styles.timelineList}>
                  {disciplineData.timeline.map((item) => (
                    <div
                      key={`${item.type}-${item.id}`}
                      className={styles.timelineRow}
                      onClick={() => onTabChange?.('discipline')}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') onTabChange?.('discipline'); }}
                    >
                      <span className={styles.timelineDate}>
                        {format(parseISO(item.date), 'MMM d')}
                      </span>
                      <span className={item.type === 'infraction' ? styles.timelineBadgeInfraction : styles.timelineBadgeAction}>
                        {item.type === 'infraction' ? 'Infraction' : 'Action'}
                      </span>
                      <span className={styles.timelineLabel}>{item.label}</span>
                      <span className={styles.timelinePoints}>
                        {item.type === 'infraction' && item.points > 0 ? `${item.points} pts` : ''}
                      </span>
                      <span className={styles.timelineLeader}>{item.leaderName}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className={styles.noData}>No infractions in the last 90 days</div>
            )}
        </div>

        {/* Evaluations */}
        <EvaluationOverviewCard
          employeeId={employee.id}
          onViewMore={() => onTabChange?.('evaluations')}
        />

        {/* Pathway */}
        <div className={styles.card} style={{ alignItems: 'flex-start' }}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Pathway</span>
            <span className={styles.stubBadge}>Coming Soon</span>
          </div>
        </div>
      </div>
    </div>
  );
}
