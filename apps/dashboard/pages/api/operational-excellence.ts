import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';

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
  org_id: string;
}

interface EmployeeRow {
  id: string;
  first_name: string;
  last_name: string;
}

interface OrgPositionRow {
  id: string;
  name: string;
  org_id: string;
}

// Response types
interface PillarScore {
  id: string;
  name: string;
  weight: number;
  displayOrder: number;
  score: number;
  priorScore: number;
  change: number;
  percentChange: number;
}

interface EmployeePositionDetail {
  positionName: string;
  pillarScores: Record<string, number>;
  ratingCount: number;
}

interface EmployeeScore {
  employeeId: string;
  name: string;
  overallScore: number;
  priorOverallScore: number;
  change: number;
  pillarScores: Record<string, number>;
  priorPillarScores: Record<string, number>;
  positions: EmployeePositionDetail[];
  ratingCount: number;
}

interface TrendPoint {
  weekStart: string;
  pillarScores: Record<string, number | null>;
  overallScore: number;
}

interface OEResponse {
  pillars: PillarScore[];
  overall: {
    score: number;
    priorScore: number;
    change: number;
    percentChange: number;
  };
  employees: EmployeeScore[];
  trends: TrendPoint[];
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

/** Normalize a 1-3 scale average to 0-100 */
function normalizeTo100(avg: number): number {
  return ((avg - 1) / 2) * 100;
}

/** Get ISO week start (Monday) for a date */
function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

/** Weighted accumulator for pillar scores */
interface PillarAccumulator {
  weightedSum: number;
  totalWeight: number;
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
      const avg = acc.weightedSum / acc.totalWeight; // still on 1-3 scale
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

/** Distribute a rating's criterion scores to pillar contributions using 60/40 split */
function distributeRatingToPillars(
  rating: RatingRow,
  criteriaByPosition: Map<string, CriteriaMapping[]>,
  positionNameToId: Map<string, string>,
  contributions: Record<string, PillarAccumulator>
) {
  // Resolve position_id
  const positionId = rating.position_id || positionNameToId.get(rating.position);
  if (!positionId) return;

  const criteria = criteriaByPosition.get(positionId);
  if (!criteria) return;

  const ratingValues = [rating.rating_1, rating.rating_2, rating.rating_3, rating.rating_4, rating.rating_5];

  for (const criterion of criteria) {
    const value = ratingValues[criterion.criteria_order - 1];
    if (value == null) continue;

    if (criterion.pillar_1_id && criterion.pillar_2_id) {
      // 60/40 split: each criterion has equal total weight (1.0),
      // but distributes 60% to primary pillar and 40% to secondary
      if (!contributions[criterion.pillar_1_id]) contributions[criterion.pillar_1_id] = { weightedSum: 0, totalWeight: 0 };
      if (!contributions[criterion.pillar_2_id]) contributions[criterion.pillar_2_id] = { weightedSum: 0, totalWeight: 0 };
      contributions[criterion.pillar_1_id].weightedSum += value * 0.6;
      contributions[criterion.pillar_1_id].totalWeight += 0.6;
      contributions[criterion.pillar_2_id].weightedSum += value * 0.4;
      contributions[criterion.pillar_2_id].totalWeight += 0.4;
    } else if (criterion.pillar_1_id) {
      // 100% to primary pillar
      if (!contributions[criterion.pillar_1_id]) contributions[criterion.pillar_1_id] = { weightedSum: 0, totalWeight: 0 };
      contributions[criterion.pillar_1_id].weightedSum += value;
      contributions[criterion.pillar_1_id].totalWeight += 1;
    }
  }
}

// ------------------------------------------------------------------
// Handler
// ------------------------------------------------------------------

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { location_id, start, end } = req.query;

  if (!location_id || typeof location_id !== 'string') {
    return res.status(400).json({ error: 'location_id is required' });
  }
  if (!start || typeof start !== 'string' || !end || typeof end !== 'string') {
    return res.status(400).json({ error: 'start and end dates are required' });
  }

  const supabase = createServerSupabaseClient();

  try {
    // Calculate prior period (same length before start date)
    const startDate = new Date(start);
    const endDate = new Date(end);
    const periodLengthMs = endDate.getTime() - startDate.getTime();
    const priorStart = new Date(startDate.getTime() - periodLengthMs);
    const priorEnd = new Date(startDate.getTime());

    // 1. Fetch oe_pillars (global)
    const { data: pillarsData, error: pillarsError } = await supabase
      .from('oe_pillars')
      .select('id, name, display_order, weight')
      .order('display_order', { ascending: true });

    if (pillarsError) throw pillarsError;
    const pillarDefs: PillarDef[] = (pillarsData || []).map(p => ({
      ...p,
      weight: p.weight ?? 0,
    }));

    // 2. Get org_id from location
    const { data: locationData, error: locationError } = await supabase
      .from('locations')
      .select('org_id')
      .eq('id', location_id)
      .single();

    if (locationError) throw locationError;
    const orgId = locationData.org_id;

    // 3. Fetch org_positions for this org (for name-based fallback)
    const { data: positionsData, error: positionsError } = await supabase
      .from('org_positions')
      .select('id, name, org_id')
      .eq('org_id', orgId)
      .eq('is_active', true);

    if (positionsError) throw positionsError;
    const positions: OrgPositionRow[] = positionsData || [];

    // Build name→id map (scoped by org)
    const positionNameToId = new Map<string, string>();
    for (const p of positions) {
      positionNameToId.set(p.name, p.id);
    }

    // 4. Fetch position_criteria with pillar mappings for all org positions
    const positionIds = positions.map(p => p.id);
    let allCriteria: CriteriaMapping[] = [];

    if (positionIds.length > 0) {
      const { data: criteriaData, error: criteriaError } = await supabase
        .from('position_criteria')
        .select('position_id, criteria_order, pillar_1_id, pillar_2_id')
        .in('position_id', positionIds);

      if (criteriaError) throw criteriaError;
      allCriteria = (criteriaData || []).filter(c => c.pillar_1_id); // Only criteria with pillar mapping
    }

    // Build position_id → criteria[] map
    const criteriaByPosition = new Map<string, CriteriaMapping[]>();
    for (const c of allCriteria) {
      const arr = criteriaByPosition.get(c.position_id) || [];
      arr.push(c);
      criteriaByPosition.set(c.position_id, arr);
    }

    // 5. Fetch ratings for current + prior period
    // Current period
    const { data: currentRatings, error: currentError } = await supabase
      .from('ratings')
      .select('id, employee_id, position, position_id, rating_1, rating_2, rating_3, rating_4, rating_5, created_at, org_id')
      .eq('location_id', location_id)
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at', { ascending: true });

    if (currentError) throw currentError;

    // Prior period
    const { data: priorRatings, error: priorError } = await supabase
      .from('ratings')
      .select('id, employee_id, position, position_id, rating_1, rating_2, rating_3, rating_4, rating_5, created_at, org_id')
      .eq('location_id', location_id)
      .gte('created_at', priorStart.toISOString())
      .lt('created_at', priorEnd.toISOString());

    if (priorError) throw priorError;

    // 6. Fetch employee names
    const employeeIds = new Set<string>();
    for (const r of [...(currentRatings || []), ...(priorRatings || [])]) {
      employeeIds.add(r.employee_id);
    }

    let employeeMap = new Map<string, EmployeeRow>();
    if (employeeIds.size > 0) {
      const { data: empData, error: empError } = await supabase
        .from('employees')
        .select('id, first_name, last_name')
        .in('id', Array.from(employeeIds));

      if (empError) throw empError;
      for (const e of empData || []) {
        employeeMap.set(e.id, e);
      }
    }

    // ------------------------------------------------------------------
    // Compute location-level pillar scores (current period)
    // ------------------------------------------------------------------
    const locationContributions: Record<string, PillarAccumulator> = {};
    for (const rating of currentRatings || []) {
      distributeRatingToPillars(rating, criteriaByPosition, positionNameToId, locationContributions);
    }
    const currentLocation = computePillarScores(locationContributions, pillarDefs);

    // Prior period location scores
    const priorContributions: Record<string, PillarAccumulator> = {};
    for (const rating of priorRatings || []) {
      distributeRatingToPillars(rating, criteriaByPosition, positionNameToId, priorContributions);
    }
    const priorLocation = computePillarScores(priorContributions, pillarDefs);

    // Build pillar response
    const pillarScores: PillarScore[] = pillarDefs.map(p => {
      const current = currentLocation.pillarScores[p.id] || 0;
      const prior = priorLocation.pillarScores[p.id] || 0;
      const change = current - prior;
      return {
        id: p.id,
        name: p.name,
        weight: p.weight,
        displayOrder: p.display_order,
        score: Math.round(current * 10) / 10,
        priorScore: Math.round(prior * 10) / 10,
        change: Math.round(change * 10) / 10,
        percentChange: prior > 0 ? Math.round((change / prior) * 1000) / 10 : current > 0 ? 100 : 0,
      };
    });

    const overallChange = currentLocation.overallScore - priorLocation.overallScore;
    const overall = {
      score: Math.round(currentLocation.overallScore * 10) / 10,
      priorScore: Math.round(priorLocation.overallScore * 10) / 10,
      change: Math.round(overallChange * 10) / 10,
      percentChange: priorLocation.overallScore > 0
        ? Math.round((overallChange / priorLocation.overallScore) * 1000) / 10
        : currentLocation.overallScore > 0 ? 100 : 0,
    };

    // ------------------------------------------------------------------
    // Per-employee scores
    // ------------------------------------------------------------------
    // Group current ratings by employee
    const ratingsByEmployee = new Map<string, RatingRow[]>();
    for (const r of currentRatings || []) {
      const arr = ratingsByEmployee.get(r.employee_id) || [];
      arr.push(r);
      ratingsByEmployee.set(r.employee_id, arr);
    }

    // Group prior ratings by employee
    const priorRatingsByEmployee = new Map<string, RatingRow[]>();
    for (const r of priorRatings || []) {
      const arr = priorRatingsByEmployee.get(r.employee_id) || [];
      arr.push(r);
      priorRatingsByEmployee.set(r.employee_id, arr);
    }

    const employees: EmployeeScore[] = [];

    for (const [empId, empRatings] of Array.from(ratingsByEmployee.entries())) {
      const emp = employeeMap.get(empId);
      if (!emp) continue;

      // Current period contributions
      const empContributions: Record<string, PillarAccumulator> = {};
      for (const r of empRatings) {
        distributeRatingToPillars(r, criteriaByPosition, positionNameToId, empContributions);
      }
      const empScores = computePillarScores(empContributions, pillarDefs);

      // Prior period contributions
      const priorEmpRatings = priorRatingsByEmployee.get(empId) || [];
      const priorEmpContributions: Record<string, PillarAccumulator> = {};
      for (const r of priorEmpRatings) {
        distributeRatingToPillars(r, criteriaByPosition, positionNameToId, priorEmpContributions);
      }
      const priorEmpScores = computePillarScores(priorEmpContributions, pillarDefs);

      // Position-level breakdowns
      const ratingsByPosition = new Map<string, RatingRow[]>();
      for (const r of empRatings) {
        const posId = r.position_id || positionNameToId.get(r.position) || r.position;
        const arr = ratingsByPosition.get(posId) || [];
        arr.push(r);
        ratingsByPosition.set(posId, arr);
      }

      const positionDetails: EmployeePositionDetail[] = [];
      for (const [posKey, posRatings] of Array.from(ratingsByPosition.entries())) {
        const posContributions: Record<string, PillarAccumulator> = {};
        for (const r of posRatings) {
          distributeRatingToPillars(r, criteriaByPosition, positionNameToId, posContributions);
        }
        const posScores = computePillarScores(posContributions, pillarDefs);

        // Resolve position name
        let posName = posKey;
        for (const p of positions) {
          if (p.id === posKey) {
            posName = p.name;
            break;
          }
        }
        // Also check original rating position name
        if (posName === posKey && posRatings[0]) {
          posName = posRatings[0].position;
        }

        positionDetails.push({
          positionName: posName,
          pillarScores: Object.fromEntries(
            Object.entries(posScores.pillarScores).map(([k, v]) => [k, Math.round(v * 10) / 10])
          ),
          ratingCount: posRatings.length,
        });
      }

      const empChange = empScores.overallScore - priorEmpScores.overallScore;

      employees.push({
        employeeId: empId,
        name: `${emp.first_name} ${emp.last_name}`,
        overallScore: Math.round(empScores.overallScore * 10) / 10,
        priorOverallScore: Math.round(priorEmpScores.overallScore * 10) / 10,
        change: Math.round(empChange * 10) / 10,
        pillarScores: Object.fromEntries(
          Object.entries(empScores.pillarScores).map(([k, v]) => [k, Math.round(v * 10) / 10])
        ),
        priorPillarScores: Object.fromEntries(
          Object.entries(priorEmpScores.pillarScores).map(([k, v]) => [k, Math.round(v * 10) / 10])
        ),
        positions: positionDetails,
        ratingCount: empRatings.length,
      });
    }

    // Sort by overall score descending
    employees.sort((a, b) => b.overallScore - a.overallScore);

    // ------------------------------------------------------------------
    // Weekly trends
    // ------------------------------------------------------------------
    const ratingsByWeek = new Map<string, RatingRow[]>();
    for (const r of currentRatings || []) {
      const weekKey = getWeekStart(new Date(r.created_at));
      const arr = ratingsByWeek.get(weekKey) || [];
      arr.push(r);
      ratingsByWeek.set(weekKey, arr);
    }

    const trends: TrendPoint[] = [];
    const sortedWeeks = Array.from(ratingsByWeek.keys()).sort();
    for (const weekStart of sortedWeeks) {
      const weekRatings = ratingsByWeek.get(weekStart) || [];
      const weekContributions: Record<string, PillarAccumulator> = {};
      for (const r of weekRatings) {
        distributeRatingToPillars(r, criteriaByPosition, positionNameToId, weekContributions);
      }
      const weekScores = computePillarScores(weekContributions, pillarDefs);

      // Use null for pillars with no data this week (prevents zero-spikes in chart)
      const pillarScoresForWeek: Record<string, number | null> = {};
      for (const pillar of pillarDefs) {
        const acc = weekContributions[pillar.id];
        if (acc && acc.totalWeight > 0) {
          pillarScoresForWeek[pillar.id] = Math.round(weekScores.pillarScores[pillar.id] * 10) / 10;
        } else {
          pillarScoresForWeek[pillar.id] = null;
        }
      }

      trends.push({
        weekStart,
        pillarScores: pillarScoresForWeek,
        overallScore: Math.round(weekScores.overallScore * 10) / 10,
      });
    }

    const response: OEResponse = {
      pillars: pillarScores,
      overall,
      employees,
      trends,
    };

    return res.status(200).json(response);
  } catch (err: any) {
    console.error('[OE API] Error computing scores:', err);
    return res.status(500).json({ error: 'Failed to compute operational excellence scores' });
  }
}
