/**
 * Seed ~1500 ratings into the demo org (Andrew Dyar) by:
 * 1. Copying Riley Emter's 703 real ratings, remapped to demo employees/positions
 * 2. Generating ~800 additional ratings using realistic score distributions
 *
 * Rules:
 * - Only leaders (Operator, Executive, Director, Team Lead, Trainer) submit ratings
 * - Leaders receive slightly higher scores than Team Members
 * - Ratings spread across both locations (20001 and 20002)
 * - Positions mapped by name (both orgs now share the same position set)
 * - Does NOT touch any org other than the demo org
 *
 * Run: npx tsx scripts/seed-demo-ratings.ts
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const RILEY_ORG = '88ae7722-9d14-44ce-9183-56c6e8dd70d4';
const REECE_ORG = '54b9864f-9df9-4a15-a209-7b99e1c274f4';
const DEMO_ORG = '5cdd62ac-6083-4d66-88cf-86716658b629';
const LOC_EAST = '6cd9c848-a739-4439-9472-352a7d52bdae'; // 20001
const LOC_WEST = '531d501b-aab7-457a-9de2-73f9e69c51ff'; // 20002

const LEADER_ROLES = ['Operator', 'Executive', 'Director', 'Team Lead', 'Trainer'];
const TARGET_TOTAL = 1500;

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  location_id: string;
}

interface DemoPosition {
  id: string;
  name: string;
  zone: string;
}

function isLeader(role: string): boolean {
  return LEADER_ROLES.includes(role);
}

/** Generate a realistic rating (1-3) with bias */
function genScore(bias: 'high' | 'avg' | 'low'): number {
  const r = Math.random();
  if (bias === 'high') {
    // Leaders: ~60% get 3, ~30% get 2, ~10% get 1
    if (r < 0.60) return 3;
    if (r < 0.90) return 2;
    return 1;
  } else if (bias === 'avg') {
    // Average TMs: ~35% get 3, ~40% get 2, ~25% get 1
    if (r < 0.35) return 3;
    if (r < 0.75) return 2;
    return 1;
  } else {
    // Below average: ~15% get 3, ~35% get 2, ~50% get 1
    if (r < 0.15) return 3;
    if (r < 0.50) return 2;
    return 1;
  }
}

/** Random date between two dates */
function randomDate(start: Date, end: Date): Date {
  const s = start.getTime();
  const e = end.getTime();
  return new Date(s + Math.random() * (e - s));
}

/** Pick random element from array */
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log('=== Seeding demo org ratings ===\n');

  // 1) Load demo org employees
  const { data: demoEmployees, error: empErr } = await supabase
    .from('employees')
    .select('id, first_name, last_name, role, location_id')
    .eq('org_id', DEMO_ORG)
    .eq('active', true);

  if (empErr) throw new Error(`Failed to load employees: ${empErr.message}`);

  const eastEmployees = demoEmployees!.filter((e) => e.location_id === LOC_EAST);
  const westEmployees = demoEmployees!.filter((e) => e.location_id === LOC_WEST);
  const eastLeaders = eastEmployees.filter((e) => isLeader(e.role));
  const westLeaders = westEmployees.filter((e) => isLeader(e.role));
  const eastMembers = eastEmployees.filter((e) => !isLeader(e.role));
  const westMembers = westEmployees.filter((e) => !isLeader(e.role));

  console.log(`East (20001): ${eastEmployees.length} employees (${eastLeaders.length} leaders, ${eastMembers.length} TMs)`);
  console.log(`West (20002): ${westEmployees.length} employees (${westLeaders.length} leaders, ${westMembers.length} TMs)\n`);

  // 2) Load demo positions (by name for mapping)
  const { data: demoPositions, error: posErr } = await supabase
    .from('org_positions')
    .select('id, name, zone')
    .eq('org_id', DEMO_ORG);

  if (posErr) throw new Error(`Failed to load positions: ${posErr.message}`);

  const positionByName: Record<string, DemoPosition> = {};
  for (const p of demoPositions!) {
    positionByName[p.name.toLowerCase()] = p;
  }

  // Standard ratable positions (exclude Leadership, Trainer, H.O.P.E. Week for regular TMs)
  const standardFOH = demoPositions!.filter(
    (p) => p.zone === 'FOH' && !['Leadership', 'Trainer', 'H.O.P.E. Week'].includes(p.name)
  );
  const standardBOH = demoPositions!.filter(
    (p) => p.zone === 'BOH' && !['Leadership', 'Trainer', 'H.O.P.E. Week'].includes(p.name)
  );
  const leaderPositions = demoPositions!.filter((p) => ['Leadership', 'Trainer'].includes(p.name));
  const allStandard = [...standardFOH, ...standardBOH];

  console.log(`Positions: ${standardFOH.length} FOH standard, ${standardBOH.length} BOH standard, ${leaderPositions.length} leader\n`);

  // 3) Load source ratings from Riley Emter
  const { data: rileyRatings, error: rErr } = await supabase
    .from('ratings')
    .select('rating_1, rating_2, rating_3, rating_4, rating_5, created_at, position_id, notes')
    .eq('org_id', RILEY_ORG)
    .order('created_at', { ascending: true });

  if (rErr) throw new Error(`Failed to load Riley ratings: ${rErr.message}`);
  console.log(`Loaded ${rileyRatings!.length} Riley Emter ratings as templates`);

  // 4) Load Riley Emter position names for mapping
  const { data: rileyPositions } = await supabase
    .from('org_positions')
    .select('id, name')
    .eq('org_id', RILEY_ORG);

  const rileyPosNameById: Record<string, string> = {};
  for (const p of rileyPositions || []) {
    rileyPosNameById[p.id] = p.name;
  }

  // 5) Load Reece Howard ratings for additional data
  const { data: reeceRatings, error: rErr2 } = await supabase
    .from('ratings')
    .select('rating_1, rating_2, rating_3, rating_4, rating_5, created_at, notes')
    .eq('org_id', REECE_ORG)
    .order('created_at', { ascending: false })
    .limit(1000);

  if (rErr2) throw new Error(`Failed to load Reece ratings: ${rErr2.message}`);
  console.log(`Loaded ${reeceRatings!.length} Reece Howard ratings as additional templates\n`);

  // 6) Build the ratings
  const ratings: any[] = [];
  const dateStart = new Date('2025-12-15');
  const dateEnd = new Date('2026-02-27');

  // Helper: create a rating row
  function createRating(
    employee: Employee,
    rater: Employee,
    position: DemoPosition,
    scores: { r1: number; r2: number; r3: number; r4: number; r5: number },
    createdAt: Date,
    notes?: string
  ) {
    ratings.push({
      id: randomUUID(),
      employee_id: employee.id,
      rater_user_id: rater.id,
      position: position.name,
      position_id: position.id,
      rating_1: scores.r1,
      rating_2: scores.r2,
      rating_3: scores.r3,
      rating_4: scores.r4,
      rating_5: scores.r5,
      org_id: DEMO_ORG,
      location_id: employee.location_id,
      created_at: createdAt.toISOString(),
      notes: notes || null,
    });
  }

  // Phase A: Map Riley Emter's real ratings onto demo employees
  // Split roughly 60/40 between East and West
  const eastRileyCount = Math.round(rileyRatings!.length * 0.6);

  for (let i = 0; i < rileyRatings!.length; i++) {
    const src = rileyRatings![i];
    const isEast = i < eastRileyCount;
    const employees = isEast ? eastEmployees : westEmployees;
    const leaders = isEast ? eastLeaders : westLeaders;
    const members = isEast ? eastMembers : westMembers;

    // Pick employee (80% chance TM, 20% leader)
    const employee = Math.random() < 0.8 ? pick(members) : pick(leaders);
    const rater = pick(leaders.filter((l) => l.id !== employee.id));
    if (!rater) continue;

    // Map position by name or pick random
    let position: DemoPosition;
    if (src.position_id && rileyPosNameById[src.position_id]) {
      const name = rileyPosNameById[src.position_id].toLowerCase();
      position = positionByName[name] || pick(allStandard);
    } else {
      position = pick(allStandard);
    }

    // If rating a leader, use Leadership/Trainer position
    if (isLeader(employee.role) && leaderPositions.length > 0) {
      position = employee.role === 'Trainer'
        ? (positionByName['trainer'] || pick(leaderPositions))
        : (positionByName['leadership'] || pick(leaderPositions));
    }

    // Boost scores for leaders
    let r1 = src.rating_1, r2 = src.rating_2, r3 = src.rating_3, r4 = src.rating_4, r5 = src.rating_5;
    if (isLeader(employee.role)) {
      r1 = Math.min(3, r1 + (Math.random() < 0.4 ? 1 : 0));
      r2 = Math.min(3, r2 + (Math.random() < 0.4 ? 1 : 0));
      r3 = Math.min(3, r3 + (Math.random() < 0.4 ? 1 : 0));
      r4 = Math.min(3, r4 + (Math.random() < 0.4 ? 1 : 0));
      r5 = Math.min(3, r5 + (Math.random() < 0.4 ? 1 : 0));
    }

    createRating(
      employee,
      rater,
      position,
      { r1, r2, r3, r4, r5 },
      new Date(src.created_at),
      src.notes
    );
  }

  console.log(`Phase A: ${ratings.length} ratings from Riley Emter templates`);

  // Phase B: Map Reece Howard ratings for more volume
  const reeceNeeded = Math.min(reeceRatings!.length, TARGET_TOTAL - ratings.length - 100);

  for (let i = 0; i < reeceNeeded; i++) {
    const src = reeceRatings![i];
    const isEast = Math.random() < 0.55;
    const employees = isEast ? eastEmployees : westEmployees;
    const leaders = isEast ? eastLeaders : westLeaders;
    const members = isEast ? eastMembers : westMembers;

    const employee = Math.random() < 0.8 ? pick(members) : pick(leaders);
    const rater = pick(leaders.filter((l) => l.id !== employee.id));
    if (!rater) continue;

    // Assign random standard position, or leader position for leaders
    let position: DemoPosition;
    if (isLeader(employee.role) && leaderPositions.length > 0) {
      position = employee.role === 'Trainer'
        ? (positionByName['trainer'] || pick(leaderPositions))
        : (positionByName['leadership'] || pick(leaderPositions));
    } else {
      position = pick(allStandard);
    }

    let r1 = src.rating_1, r2 = src.rating_2, r3 = src.rating_3, r4 = src.rating_4, r5 = src.rating_5;
    if (isLeader(employee.role)) {
      r1 = Math.min(3, r1 + (Math.random() < 0.4 ? 1 : 0));
      r2 = Math.min(3, r2 + (Math.random() < 0.4 ? 1 : 0));
      r3 = Math.min(3, r3 + (Math.random() < 0.4 ? 1 : 0));
      r4 = Math.min(3, r4 + (Math.random() < 0.4 ? 1 : 0));
      r5 = Math.min(3, r5 + (Math.random() < 0.4 ? 1 : 0));
    }

    // Spread dates evenly across the period
    const createdAt = randomDate(dateStart, dateEnd);

    createRating(employee, rater, position, { r1, r2, r3, r4, r5 }, createdAt, src.notes);
  }

  console.log(`Phase B: ${ratings.length} total after Reece Howard templates`);

  // Phase C: Fill remaining gap with generated ratings
  const remaining = TARGET_TOTAL - ratings.length;
  if (remaining > 0) {
    for (let i = 0; i < remaining; i++) {
      const isEast = Math.random() < 0.55;
      const employees = isEast ? eastEmployees : westEmployees;
      const leaders = isEast ? eastLeaders : westLeaders;
      const members = isEast ? eastMembers : westMembers;

      const employee = Math.random() < 0.8 ? pick(members) : pick(leaders);
      const rater = pick(leaders.filter((l) => l.id !== employee.id));
      if (!rater) continue;

      let position: DemoPosition;
      if (isLeader(employee.role) && leaderPositions.length > 0) {
        position = employee.role === 'Trainer'
          ? (positionByName['trainer'] || pick(leaderPositions))
          : (positionByName['leadership'] || pick(leaderPositions));
      } else {
        position = pick(allStandard);
      }

      const bias = isLeader(employee.role) ? 'high' : (Math.random() < 0.3 ? 'low' : 'avg');

      createRating(
        employee,
        rater,
        position,
        { r1: genScore(bias), r2: genScore(bias), r3: genScore(bias), r4: genScore(bias), r5: genScore(bias) },
        randomDate(dateStart, dateEnd)
      );
    }
  }

  console.log(`Phase C: ${ratings.length} total after generated fill\n`);

  // 7) Insert in batches
  console.log(`Inserting ${ratings.length} ratings in batches...`);
  const BATCH = 100;
  let inserted = 0;

  for (let i = 0; i < ratings.length; i += BATCH) {
    const batch = ratings.slice(i, i + BATCH);
    const { error: insErr } = await supabase.from('ratings').insert(batch);
    if (insErr) throw new Error(`Insert batch ${i} failed: ${insErr.message}`);
    inserted += batch.length;
  }

  console.log(`\n=== Done! Inserted ${inserted} ratings ===`);

  // 8) Verify
  const { count } = await supabase
    .from('ratings')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', DEMO_ORG);

  console.log(`Demo org now has ${count} total ratings`);

  // Quick stats
  const { data: stats } = await supabase.rpc('', {}).then(() => null).catch(() => null) as any;
  const { data: avgData } = await supabase
    .from('ratings')
    .select('rating_1, rating_2, rating_3, rating_4, rating_5')
    .eq('org_id', DEMO_ORG)
    .limit(1);

  // Stats via SQL
  console.log('\nVerification queries:');
  console.log('Run: SELECT count(*), location_id FROM ratings WHERE org_id = \'5cdd62ac...\' GROUP BY location_id;');
}

main().catch((e) => {
  console.error('ERROR:', e.message);
  process.exit(1);
});
