"use client";

import * as React from "react";
import { Box, Skeleton, Typography } from "@mui/material";
import { createSupabaseClient } from "@/util/supabase/component";
import type { Employee } from "@/lib/supabase.types";
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
// Helpers
// ------------------------------------------------------------------
function getScoreColor(score: number): string {
  if (score < 40) return 'var(--ls-color-destructive-base)';
  if (score < 60) return 'var(--ls-color-warning-base)';
  if (score < 80) return 'var(--ls-color-success-base)';
  return 'var(--ls-color-brand-base)';
}

function renderChange(change: number | null) {
  if (change === null || change === undefined) return null;
  const rounded = Math.round(change * 10) / 10;
  const isPositive = rounded > 0;
  const isNegative = rounded < 0;
  const className = isPositive
    ? styles.changePositive
    : isNegative
      ? styles.changeNegative
      : styles.changeNeutral;
  const prefix = isPositive ? '+' : '';
  return (
    <span className={`${styles.changeIndicator} ${className}`}>
      {prefix}{rounded}
    </span>
  );
}

// ------------------------------------------------------------------
// Types for positional ratings
// ------------------------------------------------------------------
interface PositionAverage {
  position: string;
  average: number;
  count: number;
}

function getRatingColor(avg: number): string {
  if (avg >= 2.75) return 'var(--ls-color-success-base)';
  if (avg >= 2.0) return 'var(--ls-color-warning-base)';
  return 'var(--ls-color-destructive-base)';
}

// ------------------------------------------------------------------
// Types for discipline data
// ------------------------------------------------------------------
interface DisciplineData {
  totalPoints: number;
  maxThreshold: number;
  infractionCount: number;
  discActionCount: number;
  recentInfraction: { infraction: string; infraction_date: string } | null;
}

// ------------------------------------------------------------------
// Component
// ------------------------------------------------------------------
export interface EmployeeOverviewTabProps {
  employee: Employee;
  locationId: string;
}

export function EmployeeOverviewTab({ employee, locationId }: EmployeeOverviewTabProps) {
  const [loading, setLoading] = React.useState(true);
  const [oeData, setOeData] = React.useState<OEData | null>(null);
  const [oeLoading, setOeLoading] = React.useState(true);
  const [positionAverages, setPositionAverages] = React.useState<PositionAverage[]>([]);
  const [positionsLoading, setPositionsLoading] = React.useState(true);
  const [disciplineData, setDisciplineData] = React.useState<DisciplineData | null>(null);
  const [disciplineLoading, setDisciplineLoading] = React.useState(true);

  // Fetch OE data
  React.useEffect(() => {
    let cancelled = false;

    async function fetchOEData() {
      setOeLoading(true);
      try {
        const now = new Date();
        const start = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const startISO = start.toISOString();
        const endISO = now.toISOString();

        const res = await fetch(
          `/api/operational-excellence?location_id=${locationId}&start=${startISO}&end=${endISO}`
        );
        if (!res.ok) throw new Error('Failed to fetch OE data');

        const json = await res.json();
        if (cancelled) return;

        const empMatch = (json.employees || []).find(
          (e: OEEmployeeScore) => e.employeeId === employee.id
        );

        if (empMatch) {
          setOeData({ employee: empMatch, pillars: json.pillars || [] });
        } else {
          setOeData(null);
        }
      } catch (err) {
        console.error('[EmployeeOverviewTab] OE fetch error:', err);
        if (!cancelled) setOeData(null);
      } finally {
        if (!cancelled) {
          setOeLoading(false);
          setLoading(false);
        }
      }
    }

    fetchOEData();
    return () => { cancelled = true; };
  }, [employee.id, locationId]);

  // Fetch positional ratings
  React.useEffect(() => {
    let cancelled = false;

    async function fetchPositionAverages() {
      setPositionsLoading(true);
      try {
        const supabase = createSupabaseClient();
        const { data, error } = await supabase
          .from('ratings')
          .select('position, position_id, rating_avg, created_at')
          .eq('employee_id', employee.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (cancelled) return;

        // Group by position, take last 4 per position, average their rating_avg
        const grouped: Record<string, number[]> = {};
        for (const row of data || []) {
          const pos = row.position || 'Unknown';
          if (!grouped[pos]) grouped[pos] = [];
          // Data is already ordered by created_at desc, so just push
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

        // Sort alphabetically by position name
        averages.sort((a, b) => a.position.localeCompare(b.position));

        if (!cancelled) setPositionAverages(averages);
      } catch (err) {
        console.error('[EmployeeOverviewTab] Position averages fetch error:', err);
        if (!cancelled) setPositionAverages([]);
      } finally {
        if (!cancelled) setPositionsLoading(false);
      }
    }

    fetchPositionAverages();
    return () => { cancelled = true; };
  }, [employee.id]);

  // Fetch discipline data
  React.useEffect(() => {
    let cancelled = false;

    async function fetchDisciplineData() {
      setDisciplineLoading(true);
      try {
        const supabase = createSupabaseClient();
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
        if (cancelled) return;

        const orgId = locationData.org_id;

        // Fetch infractions, disc_actions, and rubric in parallel
        const [infractionsRes, discActionsRes, orgRubricRes] = await Promise.all([
          supabase
            .from('infractions')
            .select('id, points, infraction_date, infraction')
            .eq('employee_id', employee.id)
            .eq('location_id', locationId)
            .gte('infraction_date', ninetyDaysAgo)
            .order('infraction_date', { ascending: false }),
          supabase
            .from('disc_actions')
            .select('id')
            .eq('employee_id', employee.id)
            .eq('location_id', locationId)
            .gte('action_date', ninetyDaysAgo),
          supabase
            .from('disc_actions_rubric')
            .select('*')
            .eq('org_id', orgId)
            .is('location_id', null)
            .order('points_threshold', { ascending: true }),
        ]);

        if (cancelled) return;

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
          if (cancelled) return;
          rubric = locRubric || [];
        }

        const infractions = infractionsRes.data || [];
        const totalPoints = infractions.reduce(
          (sum, inf) => sum + (inf.points || 0),
          0
        );
        const maxThreshold =
          rubric.length > 0
            ? rubric[rubric.length - 1]?.points_threshold || 100
            : 100;

        const recentInfraction =
          infractions.length > 0
            ? {
                infraction: infractions[0].infraction,
                infraction_date: infractions[0].infraction_date,
              }
            : null;

        if (!cancelled) {
          setDisciplineData({
            totalPoints,
            maxThreshold,
            infractionCount: infractions.length,
            discActionCount: (discActionsRes.data || []).length,
            recentInfraction,
          });
        }
      } catch (err) {
        console.error('[EmployeeOverviewTab] Discipline fetch error:', err);
        if (!cancelled) setDisciplineData(null);
      } finally {
        if (!cancelled) setDisciplineLoading(false);
      }
    }

    fetchDisciplineData();
    return () => { cancelled = true; };
  }, [employee.id, locationId]);

  if (loading) {
    return (
      <Box className={styles.container}>
        <Skeleton variant="rounded" height={120} />
        <Skeleton variant="rounded" height={100} />
        <Skeleton variant="rounded" height={100} />
      </Box>
    );
  }

  // Build pillar color map by pillar id (from displayOrder)
  const pillarColorMap: Record<string, string> = {};
  if (oeData) {
    for (const p of oeData.pillars) {
      pillarColorMap[p.id] = PILLAR_COLORS[p.displayOrder] || '#6b7280';
    }
  }

  return (
    <Box className={styles.container}>
      {/* Section 1: Operational Excellence */}
      <Box className={styles.section}>
        <Typography className={styles.sectionTitle}>Operational Excellence</Typography>
        {oeLoading ? (
          <Skeleton variant="rounded" height={120} />
        ) : oeData ? (
          <>
            {/* Overall score + change */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box
                className={styles.scoreCircle}
                sx={{
                  color: '#fff',
                  backgroundColor: getScoreColor(oeData.employee.overallScore),
                }}
              >
                {Math.round(oeData.employee.overallScore)}
              </Box>
              <Box>
                <Typography sx={{ fontFamily: '"Satoshi", sans-serif', fontWeight: 700, fontSize: 16 }}>
                  Overall Score
                </Typography>
                {renderChange(oeData.employee.change)}
                <Typography
                  sx={{ fontFamily: '"Satoshi", sans-serif', fontSize: 12, color: 'var(--ls-color-text-caption)', mt: 0.5 }}
                >
                  {oeData.employee.ratingCount} rating{oeData.employee.ratingCount !== 1 ? 's' : ''} &middot; Last 90 days
                </Typography>
              </Box>
            </Box>

            {/* Pillar cards grid */}
            <Box className={styles.pillarsGrid}>
              {oeData.pillars.map((pillar) => {
                const empScore = oeData.employee.pillarScores[pillar.id] ?? 0;
                const priorScore = oeData.employee.priorPillarScores[pillar.id];
                const pillarChange = priorScore !== undefined ? Math.round((empScore - priorScore) * 10) / 10 : null;
                const borderColor = pillarColorMap[pillar.id] || '#6b7280';

                return (
                  <Box
                    key={pillar.id}
                    className={styles.pillarCard}
                    sx={{ borderLeft: `4px solid ${borderColor}` }}
                  >
                    <span className={styles.pillarName}>{pillar.name}</span>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                      <span className={styles.pillarScore} style={{ color: borderColor }}>
                        {Math.round(empScore)}
                      </span>
                      {renderChange(pillarChange)}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </>
        ) : (
          <Box className={styles.noData}>No ratings in this period</Box>
        )}
      </Box>

      {/* Section 2: Positional Ratings */}
      <Box className={styles.section}>
        <Typography className={styles.sectionTitle}>Positional Ratings</Typography>
        {positionsLoading ? (
          <Skeleton variant="rounded" height={100} />
        ) : positionAverages.length > 0 ? (
          <Box className={styles.card}>
            {positionAverages.map((pos) => (
              <Box key={pos.position} className={styles.positionRow}>
                <span className={styles.positionName}>{pos.position}</span>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <span
                    className={styles.positionAvg}
                    style={{ color: getRatingColor(pos.average) }}
                  >
                    {pos.average.toFixed(2)}
                  </span>
                  {pos.count < 4 && (
                    <span className={styles.ratingCount}>
                      ({pos.count} of 4 ratings)
                    </span>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        ) : (
          <Box className={styles.noData}>No ratings found</Box>
        )}
      </Box>

      {/* Section 3: Discipline */}
      <Box className={styles.section}>
        <Typography className={styles.sectionTitle}>Discipline</Typography>
        {disciplineLoading ? (
          <Skeleton variant="rounded" height={100} />
        ) : disciplineData && disciplineData.infractionCount > 0 ? (
          <Box className={styles.card}>
            <Box className={styles.twoColumn}>
              <Box>
                <span
                  className={styles.statValue}
                  style={{
                    color:
                      disciplineData.totalPoints / disciplineData.maxThreshold > 0.66
                        ? 'var(--ls-color-destructive-base)'
                        : disciplineData.totalPoints / disciplineData.maxThreshold > 0.33
                          ? 'var(--ls-color-warning-base)'
                          : 'var(--ls-color-success-base)',
                  }}
                >
                  {disciplineData.totalPoints}
                </span>
                <div className={styles.statLabel}>
                  / {disciplineData.maxThreshold} pts
                </div>
              </Box>
              <Box>
                <span className={styles.statValue}>
                  {disciplineData.infractionCount}
                </span>
                <div className={styles.statLabel}>
                  infraction{disciplineData.infractionCount !== 1 ? 's' : ''}
                </div>
                <span className={styles.statValue} style={{ fontSize: 20, marginTop: 4, display: 'block' }}>
                  {disciplineData.discActionCount}
                </span>
                <div className={styles.statLabel}>
                  disciplinary action{disciplineData.discActionCount !== 1 ? 's' : ''}
                </div>
              </Box>
            </Box>

            {/* Progress bar */}
            <Box className={styles.progressBar} sx={{ mt: 2 }}>
              <div
                className={styles.progressFill}
                style={{
                  width: `${Math.min((disciplineData.totalPoints / disciplineData.maxThreshold) * 100, 100)}%`,
                  backgroundColor:
                    disciplineData.totalPoints / disciplineData.maxThreshold > 0.66
                      ? 'var(--ls-color-destructive-base)'
                      : disciplineData.totalPoints / disciplineData.maxThreshold > 0.33
                        ? 'var(--ls-color-warning-base)'
                        : 'var(--ls-color-success-base)',
                }}
              />
            </Box>

            {/* Most recent infraction */}
            {disciplineData.recentInfraction && (
              <Box sx={{ mt: 2 }}>
                <div className={styles.recentItem}>
                  {disciplineData.recentInfraction.infraction}
                </div>
                <div className={styles.recentDate}>
                  {new Date(disciplineData.recentInfraction.infraction_date + 'T00:00:00').toLocaleDateString(
                    'en-US',
                    { month: 'short', day: 'numeric', year: 'numeric' }
                  )}
                </div>
              </Box>
            )}
          </Box>
        ) : (
          <Box className={styles.noData}>No infractions in the last 90 days</Box>
        )}
      </Box>

      {/* Section 4: Evaluations (stub) */}
      <Box className={styles.section}>
        <Typography className={styles.sectionTitle}>Evaluations</Typography>
        <Box className={styles.stubMessage}>Coming soon!</Box>
      </Box>

      {/* Section 5: Pathway (stub) */}
      <Box className={styles.section}>
        <Typography className={styles.sectionTitle}>Pathway</Typography>
        <Box className={styles.stubMessage}>Coming soon!</Box>
      </Box>
    </Box>
  );
}
