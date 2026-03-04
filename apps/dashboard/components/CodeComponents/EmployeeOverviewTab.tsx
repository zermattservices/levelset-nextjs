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
        <Box className={styles.noData}>Loading...</Box>
      </Box>

      {/* Section 3: Discipline */}
      <Box className={styles.section}>
        <Typography className={styles.sectionTitle}>Discipline</Typography>
        <Box className={styles.noData}>Loading...</Box>
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
