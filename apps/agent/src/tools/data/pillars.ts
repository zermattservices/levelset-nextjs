/**
 * Pillar Scores tool — Operational Excellence pillar score queries.
 *
 * Computes OE pillar scores (Great Food, Quick & Accurate, Creating Moments,
 * Caring Interactions, Inviting Atmosphere) from raw ratings + criteria mappings.
 *
 * Supports:
 *   - Location-level: overall pillar scores + top/bottom performers
 *   - Employee-level: per-pillar scores with position breakdown
 *   - Pillar-filtered: scoped to a single pillar
 *   - Configurable date range (defaults to last 30 days)
 */

import { getServiceClient } from '@levelset/supabase-client';
import { tenantCache, CacheTTL } from '../../lib/tenant-cache.js';

// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------

interface PillarDef {
  id: string;
  name: string;
  display_order: number;
  weight: number;
}

interface CriteriaMapping {
  position_id: string;
  criteria_order: number;
  pillar_1_id: string | null;
  pillar_2_id: string | null;
  name: string;
}

interface RatingRow {
  id: string;
  employee_id: string;
  position: string;
  position_id: string | null;
  rating_1: number | null;
  rating_2: number | null;
  rating_3: number | null;
  rating_4: number | null;
  rating_5: number | null;
  created_at: string;
}

interface PillarAccumulator {
  weightedSum: number;
  totalWeight: number;
}

// ------------------------------------------------------------------
// Helpers (ported from pages/api/operational-excellence.ts)
// ------------------------------------------------------------------

/** Normalize a 1-3 scale average to 0-100 */
function normalizeTo100(avg: number): number {
  return ((avg - 1) / 2) * 100;
}

/** Distribute a rating's criterion scores to pillar contributions using 60/40 split */
function distributeRatingToPillars(
  rating: RatingRow,
  criteriaByPosition: Map<string, CriteriaMapping[]>,
  positionNameToId: Map<string, string>,
  contributions: Record<string, PillarAccumulator>
): void {
  const positionId = rating.position_id || positionNameToId.get(rating.position);
  if (!positionId) return;

  const criteria = criteriaByPosition.get(positionId);
  if (!criteria) return;

  const ratingValues = [rating.rating_1, rating.rating_2, rating.rating_3, rating.rating_4, rating.rating_5];

  for (const criterion of criteria) {
    const value = ratingValues[criterion.criteria_order - 1];
    if (value == null) continue;

    if (criterion.pillar_1_id && criterion.pillar_2_id) {
      // 60/40 split for dual-pillar criteria
      if (!contributions[criterion.pillar_1_id]) contributions[criterion.pillar_1_id] = { weightedSum: 0, totalWeight: 0 };
      if (!contributions[criterion.pillar_2_id]) contributions[criterion.pillar_2_id] = { weightedSum: 0, totalWeight: 0 };
      contributions[criterion.pillar_1_id].weightedSum += value * 0.6;
      contributions[criterion.pillar_1_id].totalWeight += 0.6;
      contributions[criterion.pillar_2_id].weightedSum += value * 0.4;
      contributions[criterion.pillar_2_id].totalWeight += 0.4;
    } else if (criterion.pillar_1_id) {
      // 100% to single pillar
      if (!contributions[criterion.pillar_1_id]) contributions[criterion.pillar_1_id] = { weightedSum: 0, totalWeight: 0 };
      contributions[criterion.pillar_1_id].weightedSum += value;
      contributions[criterion.pillar_1_id].totalWeight += 1;
    }
  }
}

/** Compute pillar scores from weighted contributions */
function computePillarScores(
  contributions: Record<string, PillarAccumulator>,
  pillarDefs: PillarDef[]
): { pillarScores: Record<string, number>; overallScore: number } {
  const pillarScores: Record<string, number> = {};
  let overallScore = 0;
  let totalPillarWeight = 0;

  for (const pillar of pillarDefs) {
    const acc = contributions[pillar.id];
    if (acc && acc.totalWeight > 0) {
      const avg = acc.weightedSum / acc.totalWeight;
      pillarScores[pillar.id] = normalizeTo100(avg);
    } else {
      pillarScores[pillar.id] = 0;
    }
    overallScore += pillarScores[pillar.id] * (pillar.weight ?? 0);
    totalPillarWeight += pillar.weight ?? 0;
  }

  return {
    pillarScores,
    overallScore: totalPillarWeight > 0 ? overallScore / totalPillarWeight : 0,
  };
}

/** Round to 1 decimal place */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ------------------------------------------------------------------
// Main tool function
// ------------------------------------------------------------------

/**
 * Get OE pillar scores for a location or specific employee.
 */
export async function getPillarScores(
  args: Record<string, unknown>,
  orgId: string,
  locationId?: string
): Promise<string> {
  const employeeId = args.employee_id as string | undefined;
  const pillarFilter = args.pillar as string | undefined;
  const days = args.days as number | undefined;
  const startDateArg = args.start_date as string | undefined;
  const endDateArg = args.end_date as string | undefined;

  // Compute date range
  const endDate = endDateArg || new Date().toISOString().split('T')[0];
  let startDate: string;
  if (startDateArg) {
    startDate = startDateArg;
  } else {
    const lookbackDays = days ?? 30;
    const d = new Date();
    d.setDate(d.getDate() - lookbackDays);
    startDate = d.toISOString().split('T')[0];
  }

  const cacheKey = `pillars:${locationId ?? 'org'}:${employeeId ?? 'all'}:${pillarFilter ?? 'all'}:${startDate}:${endDate}`;

  return tenantCache.getOrFetch(orgId, cacheKey, CacheTTL.DYNAMIC, () =>
    _getPillarScores(orgId, locationId, employeeId, pillarFilter, startDate, endDate)
  );
}

/** Internal: uncached pillar score computation */
async function _getPillarScores(
  orgId: string,
  locationId: string | undefined,
  employeeId: string | undefined,
  pillarFilter: string | undefined,
  startDate: string,
  endDate: string
): Promise<string> {
  const supabase = getServiceClient();

  // ── Step 1: Parallel fetch config data ──
  const [pillarsResult, positionsResult] = await Promise.all([
    supabase
      .from('oe_pillars')
      .select('id, name, display_order, weight')
      .order('display_order', { ascending: true }),
    supabase
      .from('org_positions')
      .select('id, name, zone')
      .eq('org_id', orgId)
      .eq('is_active', true),
  ]);

  if (pillarsResult.error) {
    return JSON.stringify({ error: 'Failed to load pillar definitions' });
  }
  if (positionsResult.error) {
    return JSON.stringify({ error: 'Failed to load positions' });
  }

  const pillarDefs: PillarDef[] = (pillarsResult.data || []).map((p: Record<string, unknown>) => ({
    id: p.id as string,
    name: p.name as string,
    display_order: p.display_order as number,
    weight: (p.weight as number) ?? 0,
  }));

  const positions = positionsResult.data || [];
  const positionIds = positions.map((p: Record<string, unknown>) => p.id as string);

  // Build name→id map
  const positionNameToId = new Map<string, string>();
  const positionIdToName = new Map<string, string>();
  for (const p of positions) {
    positionNameToId.set(p.name as string, p.id as string);
    positionIdToName.set(p.id as string, p.name as string);
  }

  // Build pillar id→name and name→id maps
  const pillarIdToName = new Map<string, string>();
  const pillarNameToId = new Map<string, string>();
  for (const p of pillarDefs) {
    pillarIdToName.set(p.id, p.name);
    pillarNameToId.set(p.name.toLowerCase(), p.id);
  }

  // Resolve pillar filter if provided
  let filteredPillarId: string | undefined;
  if (pillarFilter) {
    const normalized = pillarFilter.toLowerCase().trim();
    filteredPillarId = pillarNameToId.get(normalized);
    // Try partial match if exact doesn't work
    if (!filteredPillarId) {
      for (const [name, id] of pillarNameToId) {
        if (name.includes(normalized) || normalized.includes(name)) {
          filteredPillarId = id;
          break;
        }
      }
    }
    if (!filteredPillarId) {
      return JSON.stringify({
        error: `Pillar "${pillarFilter}" not found. Available pillars: ${pillarDefs.map((p) => p.name).join(', ')}`,
      });
    }
  }

  // ── Step 2: Fetch position criteria ──
  let criteriaByPosition = new Map<string, CriteriaMapping[]>();
  if (positionIds.length > 0) {
    const { data: criteriaData, error: criteriaError } = await supabase
      .from('position_criteria')
      .select('position_id, criteria_order, pillar_1_id, pillar_2_id, name')
      .in('position_id', positionIds);

    if (criteriaError) {
      return JSON.stringify({ error: 'Failed to load position criteria' });
    }

    for (const c of criteriaData || []) {
      if (!c.pillar_1_id) continue; // Skip unmapped criteria
      const mapping: CriteriaMapping = {
        position_id: c.position_id as string,
        criteria_order: c.criteria_order as number,
        pillar_1_id: c.pillar_1_id as string | null,
        pillar_2_id: c.pillar_2_id as string | null,
        name: c.name as string,
      };
      const arr = criteriaByPosition.get(mapping.position_id) || [];
      arr.push(mapping);
      criteriaByPosition.set(mapping.position_id, arr);
    }
  }

  // ── Step 3: Fetch ratings ──
  let ratingsQuery = supabase
    .from('ratings')
    .select('id, employee_id, position, position_id, rating_1, rating_2, rating_3, rating_4, rating_5, created_at')
    .eq('org_id', orgId)
    .gte('created_at', startDate)
    .lte('created_at', endDate + 'T23:59:59.999Z');

  if (locationId) {
    ratingsQuery = ratingsQuery.eq('location_id', locationId);
  }
  if (employeeId) {
    ratingsQuery = ratingsQuery.eq('employee_id', employeeId);
  }

  const { data: ratingsData, error: ratingsError } = await ratingsQuery;

  if (ratingsError) {
    return JSON.stringify({ error: 'Failed to load ratings' });
  }

  const ratings: RatingRow[] = (ratingsData || []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    employee_id: r.employee_id as string,
    position: r.position as string,
    position_id: r.position_id as string | null,
    rating_1: r.rating_1 as number | null,
    rating_2: r.rating_2 as number | null,
    rating_3: r.rating_3 as number | null,
    rating_4: r.rating_4 as number | null,
    rating_5: r.rating_5 as number | null,
    created_at: r.created_at as string,
  }));

  if (ratings.length === 0) {
    return JSON.stringify({
      period: { start: startDate, end: endDate, rating_count: 0 },
      message: 'No ratings found for this period.',
      pillars: pillarDefs.map((p) => ({ name: p.name, weight: p.weight, score: null, rating_count: 0 })),
    });
  }

  // ── Step 4: Fetch employee names (for location-level or if employee_id provided) ──
  const uniqueEmployeeIds = [...new Set(ratings.map((r) => r.employee_id))];
  let employeeMap = new Map<string, { name: string; role: string }>();

  if (uniqueEmployeeIds.length > 0) {
    const { data: empData } = await supabase
      .from('employees')
      .select('id, full_name, role')
      .in('id', uniqueEmployeeIds);

    for (const e of empData || []) {
      employeeMap.set(e.id as string, {
        name: e.full_name as string,
        role: (e.role as string) || 'Team Member',
      });
    }
  }

  // ── Compute scores ──

  if (employeeId) {
    // ── EMPLOYEE-LEVEL RESPONSE ──
    return _buildEmployeeResponse(
      ratings, employeeId, employeeMap, pillarDefs, criteriaByPosition,
      positionNameToId, positionIdToName, pillarIdToName, filteredPillarId,
      startDate, endDate
    );
  }

  // ── LOCATION-LEVEL RESPONSE ──
  return _buildLocationResponse(
    ratings, employeeMap, pillarDefs, criteriaByPosition,
    positionNameToId, pillarIdToName, filteredPillarId,
    startDate, endDate
  );
}

// ------------------------------------------------------------------
// Response builders
// ------------------------------------------------------------------

function _buildLocationResponse(
  ratings: RatingRow[],
  employeeMap: Map<string, { name: string; role: string }>,
  pillarDefs: PillarDef[],
  criteriaByPosition: Map<string, CriteriaMapping[]>,
  positionNameToId: Map<string, string>,
  pillarIdToName: Map<string, string>,
  filteredPillarId: string | undefined,
  startDate: string,
  endDate: string
): string {
  // Compute location-level pillar scores
  const locationContributions: Record<string, PillarAccumulator> = {};
  for (const rating of ratings) {
    distributeRatingToPillars(rating, criteriaByPosition, positionNameToId, locationContributions);
  }
  const locationScores = computePillarScores(locationContributions, pillarDefs);

  // Format pillar results
  const pillars = pillarDefs.map((p) => {
    const acc = locationContributions[p.id];
    return {
      name: p.name,
      weight: p.weight,
      score: round1(locationScores.pillarScores[p.id] ?? 0),
      has_data: !!(acc && acc.totalWeight > 0),
    };
  });

  // Compute per-employee scores for top/bottom performers
  const ratingsByEmployee = new Map<string, RatingRow[]>();
  for (const r of ratings) {
    const arr = ratingsByEmployee.get(r.employee_id) || [];
    arr.push(r);
    ratingsByEmployee.set(r.employee_id, arr);
  }

  interface EmployeeSummary {
    name: string;
    role: string;
    overall_score: number;
    pillar_scores: Record<string, number>;
    rating_count: number;
  }

  const employeeSummaries: EmployeeSummary[] = [];

  for (const [empId, empRatings] of ratingsByEmployee) {
    const emp = employeeMap.get(empId);
    if (!emp) continue;

    const empContributions: Record<string, PillarAccumulator> = {};
    for (const r of empRatings) {
      distributeRatingToPillars(r, criteriaByPosition, positionNameToId, empContributions);
    }
    const empScores = computePillarScores(empContributions, pillarDefs);

    const pillarScoresNamed: Record<string, number> = {};
    for (const p of pillarDefs) {
      const name = p.name;
      pillarScoresNamed[name] = round1(empScores.pillarScores[p.id] ?? 0);
    }

    employeeSummaries.push({
      name: emp.name,
      role: emp.role,
      overall_score: round1(empScores.overallScore),
      pillar_scores: pillarScoresNamed,
      rating_count: empRatings.length,
    });
  }

  // Sort by overall or by specific pillar
  const sortKey = filteredPillarId
    ? (e: EmployeeSummary) => e.pillar_scores[pillarIdToName.get(filteredPillarId!) ?? ''] ?? 0
    : (e: EmployeeSummary) => e.overall_score;

  employeeSummaries.sort((a, b) => sortKey(b) - sortKey(a));

  const topPerformers = employeeSummaries.slice(0, 5).map((e) => ({
    name: e.name,
    role: e.role,
    overall_score: e.overall_score,
    pillar_scores: e.pillar_scores,
  }));

  const needsImprovement = employeeSummaries
    .slice(-5)
    .reverse()
    .map((e) => ({
      name: e.name,
      role: e.role,
      overall_score: e.overall_score,
      pillar_scores: e.pillar_scores,
    }));

  const result: Record<string, unknown> = {
    period: { start: startDate, end: endDate, rating_count: ratings.length },
    overall_score: round1(locationScores.overallScore),
    pillars,
    top_performers: topPerformers,
    needs_improvement: needsImprovement,
  };

  return JSON.stringify(result);
}

function _buildEmployeeResponse(
  ratings: RatingRow[],
  employeeId: string,
  employeeMap: Map<string, { name: string; role: string }>,
  pillarDefs: PillarDef[],
  criteriaByPosition: Map<string, CriteriaMapping[]>,
  positionNameToId: Map<string, string>,
  positionIdToName: Map<string, string>,
  pillarIdToName: Map<string, string>,
  filteredPillarId: string | undefined,
  startDate: string,
  endDate: string
): string {
  const emp = employeeMap.get(employeeId);
  const empName = emp?.name ?? 'Unknown Employee';
  const empRole = emp?.role ?? 'Team Member';

  // Overall employee pillar scores
  const empContributions: Record<string, PillarAccumulator> = {};
  for (const r of ratings) {
    distributeRatingToPillars(r, criteriaByPosition, positionNameToId, empContributions);
  }
  const empScores = computePillarScores(empContributions, pillarDefs);

  // Format pillar scores with names
  const pillars = pillarDefs.map((p) => {
    const acc = empContributions[p.id];
    return {
      name: p.name,
      weight: p.weight,
      score: round1(empScores.pillarScores[p.id] ?? 0),
      has_data: !!(acc && acc.totalWeight > 0),
    };
  });

  // Per-position breakdown
  const ratingsByPosition = new Map<string, RatingRow[]>();
  for (const r of ratings) {
    const posId = r.position_id || positionNameToId.get(r.position) || r.position;
    const arr = ratingsByPosition.get(posId) || [];
    arr.push(r);
    ratingsByPosition.set(posId, arr);
  }

  const positionBreakdowns: Array<{
    name: string;
    pillar_scores: Record<string, number>;
    criteria: Array<{ name: string; pillar_1: string | null; pillar_2: string | null }>;
    rating_count: number;
  }> = [];

  for (const [posKey, posRatings] of ratingsByPosition) {
    const posContributions: Record<string, PillarAccumulator> = {};
    for (const r of posRatings) {
      distributeRatingToPillars(r, criteriaByPosition, positionNameToId, posContributions);
    }
    const posScores = computePillarScores(posContributions, pillarDefs);

    // Resolve position name
    let posName = positionIdToName.get(posKey) ?? posKey;
    if (posName === posKey && posRatings[0]) {
      posName = posRatings[0].position;
    }

    // Get criteria for this position
    const criteria = criteriaByPosition.get(posKey) || [];
    const criteriaInfo = criteria.map((c) => ({
      name: c.name,
      pillar_1: c.pillar_1_id ? (pillarIdToName.get(c.pillar_1_id) ?? null) : null,
      pillar_2: c.pillar_2_id ? (pillarIdToName.get(c.pillar_2_id) ?? null) : null,
    }));

    const pillarScoresNamed: Record<string, number> = {};
    for (const p of pillarDefs) {
      pillarScoresNamed[p.name] = round1(posScores.pillarScores[p.id] ?? 0);
    }

    positionBreakdowns.push({
      name: posName,
      pillar_scores: pillarScoresNamed,
      criteria: criteriaInfo,
      rating_count: posRatings.length,
    });
  }

  const result: Record<string, unknown> = {
    employee: { name: empName, role: empRole },
    period: { start: startDate, end: endDate, rating_count: ratings.length },
    overall_score: round1(empScores.overallScore),
    pillars,
    positions: positionBreakdowns,
  };

  return JSON.stringify(result);
}
