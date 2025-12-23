/**
 * Seed a complete demo organization with two locations, employees, ratings, and discipline data.
 *
 * Usage:
 *   npx tsx scripts/seed-demo-organization.ts
 *   npx tsx scripts/seed-demo-organization.ts --clean  (delete existing demo data first)
 *
 * Environment variables required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Reference org for copying infractions/actions rubric
const BUDA_ORG_ID = '54b9864f-9df9-4a15-a209-7b99e1c274f4';

// Demo org configuration
const DEMO_ORG_NAME = 'John Smith';
const DEMO_OPERATOR_EMAIL = 'john.smith.demo@levelset.io';
const DEMO_OPERATOR_PASSWORD = 'LevelsetDemo1!';

const EAST_LOCATION = {
  name: 'Levelset East FSU',
  number: '20001',
};

const WEST_LOCATION = {
  name: 'Levelset West FSU',
  number: '20002',
};

// Date range for ratings and infractions
const START_DATE = new Date('2025-08-12');
const END_DATE = new Date('2025-12-23');

// Rating distribution
const TOTAL_RATINGS = 1781;
const CROSS_LOCATION_PERCENT = 0.03;
const EAST_PERCENT = 0.60;

// Infraction distribution
const TOTAL_INFRACTIONS = 30;

// Check for --clean flag
const shouldClean = process.argv.includes('--clean');

// ===== Employee Names by Role and Location =====

const OPERATOR = { first: 'John', last: 'Smith' };

// Executives work at both locations (3 total)
const EXECUTIVES = [
  { first: 'Alexandra', last: 'Chen' },
  { first: 'Marcus', last: 'Williams' },
  { first: 'Sophia', last: 'Rodriguez' },
];

// Directors - 3 at East, 3 at West
const DIRECTORS_EAST = [
  { first: 'Michael', last: 'Thompson' },
  { first: 'Emily', last: 'Davis' },
  { first: 'Christopher', last: 'Martinez' },
];

const DIRECTORS_WEST = [
  { first: 'Jessica', last: 'Anderson' },
  { first: 'David', last: 'Taylor' },
  { first: 'Ashley', last: 'Thomas' },
];

// Team Leads - 9 at East, 7 at West
const TEAM_LEADS_EAST = [
  { first: 'Brandon', last: 'Garcia' },
  { first: 'Samantha', last: 'Brown' },
  { first: 'Tyler', last: 'Wilson' },
  { first: 'Megan', last: 'Moore' },
  { first: 'Justin', last: 'Jackson' },
  { first: 'Kayla', last: 'White' },
  { first: 'Ryan', last: 'Harris' },
  { first: 'Brittany', last: 'Clark' },
  { first: 'Kevin', last: 'Lewis' },
];

const TEAM_LEADS_WEST = [
  { first: 'Amanda', last: 'Robinson' },
  { first: 'Joshua', last: 'Walker' },
  { first: 'Stephanie', last: 'Hall' },
  { first: 'Andrew', last: 'Allen' },
  { first: 'Lauren', last: 'Young' },
  { first: 'Daniel', last: 'King' },
  { first: 'Nicole', last: 'Wright' },
];

// Trainers - 8 at East, 6 at West
const TRAINERS_EAST = [
  { first: 'Jacob', last: 'Scott' },
  { first: 'Rachel', last: 'Green' },
  { first: 'Nathan', last: 'Adams' },
  { first: 'Hannah', last: 'Baker' },
  { first: 'Zachary', last: 'Nelson' },
  { first: 'Sarah', last: 'Carter' },
  { first: 'Ethan', last: 'Mitchell' },
  { first: 'Olivia', last: 'Perez' },
];

const TRAINERS_WEST = [
  { first: 'Noah', last: 'Roberts' },
  { first: 'Emma', last: 'Turner' },
  { first: 'Mason', last: 'Phillips' },
  { first: 'Ava', last: 'Campbell' },
  { first: 'Logan', last: 'Parker' },
  { first: 'Isabella', last: 'Evans' },
];

// Team Members - 65 at East, 52 at West
const TEAM_MEMBERS_EAST = [
  { first: 'Liam', last: 'Collins' }, { first: 'Charlotte', last: 'Edwards' }, { first: 'Oliver', last: 'Stewart' },
  { first: 'Amelia', last: 'Sanchez' }, { first: 'Elijah', last: 'Morris' }, { first: 'Harper', last: 'Rogers' },
  { first: 'Lucas', last: 'Reed' }, { first: 'Evelyn', last: 'Cook' }, { first: 'Henry', last: 'Morgan' },
  { first: 'Luna', last: 'Bell' }, { first: 'Sebastian', last: 'Murphy' }, { first: 'Mila', last: 'Bailey' },
  { first: 'Jack', last: 'Rivera' }, { first: 'Aria', last: 'Cooper' }, { first: 'Owen', last: 'Richardson' },
  { first: 'Chloe', last: 'Cox' }, { first: 'Alexander', last: 'Howard' }, { first: 'Penelope', last: 'Ward' },
  { first: 'Aiden', last: 'Torres' }, { first: 'Layla', last: 'Peterson' }, { first: 'James', last: 'Gray' },
  { first: 'Riley', last: 'Ramirez' }, { first: 'Benjamin', last: 'James' }, { first: 'Zoey', last: 'Watson' },
  { first: 'Theodore', last: 'Brooks' }, { first: 'Nora', last: 'Kelly' }, { first: 'William', last: 'Sanders' },
  { first: 'Lily', last: 'Price' }, { first: 'Leo', last: 'Bennett' }, { first: 'Eleanor', last: 'Wood' },
  { first: 'Mateo', last: 'Barnes' }, { first: 'Hazel', last: 'Ross' }, { first: 'Daniel', last: 'Henderson' },
  { first: 'Violet', last: 'Coleman' }, { first: 'Jackson', last: 'Jenkins' }, { first: 'Stella', last: 'Perry' },
  { first: 'David', last: 'Powell' }, { first: 'Aurora', last: 'Long' }, { first: 'Joseph', last: 'Patterson' },
  { first: 'Savannah', last: 'Hughes' }, { first: 'Carter', last: 'Flores' }, { first: 'Bella', last: 'Washington' },
  { first: 'Wyatt', last: 'Butler' }, { first: 'Scarlett', last: 'Simmons' }, { first: 'John', last: 'Foster' },
  { first: 'Maya', last: 'Gonzales' }, { first: 'Luke', last: 'Bryant' }, { first: 'Grace', last: 'Alexander' },
  { first: 'Gabriel', last: 'Russell' }, { first: 'Zoe', last: 'Griffin' }, { first: 'Anthony', last: 'Diaz' },
  { first: 'Natalie', last: 'Hayes' }, { first: 'Isaac', last: 'Myers' }, { first: 'Addison', last: 'Ford' },
  { first: 'Dylan', last: 'Hamilton' }, { first: 'Audrey', last: 'Graham' }, { first: 'Lincoln', last: 'Sullivan' },
  { first: 'Leah', last: 'Wallace' }, { first: 'Jaxon', last: 'Woods' }, { first: 'Lucy', last: 'Cole' },
  { first: 'Asher', last: 'West' }, { first: 'Ellie', last: 'Jordan' }, { first: 'Christopher', last: 'Owens' },
  { first: 'Paisley', last: 'Reynolds' }, { first: 'Josiah', last: 'Fisher' },
];

const TEAM_MEMBERS_WEST = [
  { first: 'Andrew', last: 'Ellis' }, { first: 'Skylar', last: 'Harrison' }, { first: 'Thomas', last: 'Gibson' },
  { first: 'Camila', last: 'McDonald' }, { first: 'Charles', last: 'Cruz' }, { first: 'Elizabeth', last: 'Marshall' },
  { first: 'Caleb', last: 'Ortiz' }, { first: 'Lillian', last: 'Gomez' }, { first: 'Ryan', last: 'Murray' },
  { first: 'Hannah', last: 'Freeman' }, { first: 'Adrian', last: 'Wells' }, { first: 'Aaliyah', last: 'Webb' },
  { first: 'Jonathan', last: 'Simpson' }, { first: 'Kinsley', last: 'Stevens' }, { first: 'Nolan', last: 'Tucker' },
  { first: 'Allison', last: 'Porter' }, { first: 'Christian', last: 'Hunter' }, { first: 'Genesis', last: 'Hicks' },
  { first: 'Aaron', last: 'Crawford' }, { first: 'Naomi', last: 'Henry' }, { first: 'Eli', last: 'Boyd' },
  { first: 'Kaylee', last: 'Mason' }, { first: 'Landon', last: 'Morales' }, { first: 'Aubrey', last: 'Kennedy' },
  { first: 'Hunter', last: 'Warren' }, { first: 'Anna', last: 'Dixon' }, { first: 'Connor', last: 'Ramos' },
  { first: 'Claire', last: 'Reyes' }, { first: 'Jeremiah', last: 'Burns' }, { first: 'Sadie', last: 'Gordon' },
  { first: 'Cameron', last: 'Shaw' }, { first: 'Hailey', last: 'Rice' }, { first: 'Jordan', last: 'Robertson' },
  { first: 'Madelyn', last: 'Hunt' }, { first: 'Nicholas', last: 'Black' }, { first: 'Brooklyn', last: 'Daniels' },
  { first: 'Robert', last: 'Palmer' }, { first: 'Peyton', last: 'Mills' }, { first: 'Ian', last: 'Nichols' },
  { first: 'Kennedy', last: 'Grant' }, { first: 'Evan', last: 'Knight' }, { first: 'Ariana', last: 'Ferguson' },
  { first: 'Jason', last: 'Rose' }, { first: 'Nevaeh', last: 'Stone' }, { first: 'Adam', last: 'Hawkins' },
  { first: 'Piper', last: 'Dunn' }, { first: 'Jose', last: 'Perkins' }, { first: 'Clara', last: 'Hudson' },
  { first: 'Dominic', last: 'Spencer' }, { first: 'Emilia', last: 'Gardner' }, { first: 'Austin', last: 'Stephens' },
  { first: 'Isabelle', last: 'Payne' },
];

// ===== Positions =====

const FOH_POSITIONS = [
  { name: 'iPOS', description: 'Primary point of sale position for customer orders' },
  { name: 'Drinks 1/3', description: 'Beverage preparation station one' },
  { name: 'Drinks 2/3', description: 'Beverage preparation station two' },
  { name: 'Host', description: 'Guest greeting and dining room management' },
  { name: 'Window', description: 'Drive-thru window service' },
];

const BOH_POSITIONS = [
  { name: 'Prep', description: 'Food preparation and ingredient staging' },
  { name: 'Breading', description: 'Chicken breading and preparation' },
  { name: 'Machines', description: 'Pressure cooker and equipment operation' },
  { name: 'Fryer', description: 'Frying station management' },
];

// Default criteria for positions (simplified)
const DEFAULT_CRITERIA = {
  FOH: [
    'Guest Interaction',
    'Speed of Service',
    'Order Accuracy',
    'Cleanliness',
    'Teamwork',
  ],
  BOH: [
    'Food Quality',
    'Speed',
    'Safety Compliance',
    'Cleanliness',
    'Teamwork',
  ],
};

// Role colors
const ROLE_COLORS = ['blue', 'purple', 'teal', 'orange', 'pink', 'gray'];

// ===== Helper Functions =====

function generateMobileToken(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let token = '';
  for (let i = 0; i < 12; i++) {
    const index = Math.floor(Math.random() * alphabet.length);
    token += alphabet[index];
  }
  return token;
}

function getRandomDateInRange(start: Date, end: Date, excludeSundays: boolean = true): Date {
  const startTime = start.getTime();
  const endTime = end.getTime();
  let date: Date;
  
  do {
    const randomTime = startTime + Math.random() * (endTime - startTime);
    date = new Date(randomTime);
  } while (excludeSundays && date.getDay() === 0);
  
  return date;
}

function generateRealisticRating(): number {
  // Weighted toward 2-3 (most employees doing well)
  const weights = [0.15, 0.35, 0.50]; // 1, 2, 3
  const random = Math.random();
  if (random < weights[0]) return 1;
  if (random < weights[0] + weights[1]) return 2;
  return 3;
}

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

function randomHireDate(): string {
  const now = new Date();
  const pastDays = Math.floor(Math.random() * 540) + 30;
  const hire = new Date(now.getTime() - pastDays * 24 * 60 * 60 * 1000);
  return hire.toISOString().split('T')[0];
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ===== Main Seed Function =====

async function seed() {
  console.log('🚀 Seeding demo organization...\n');

  if (shouldClean) {
    console.log('🧹 Cleaning existing demo organization data...\n');
    await cleanExistingData();
  }

  // Step 1: Create org
  console.log('📁 Creating organization...');
  const orgId = await createOrg();
  console.log(`   ✅ Org created: ${orgId}\n`);

  // Step 2: Create locations
  console.log('📍 Creating locations...');
  const eastLocationId = await createLocation(orgId, EAST_LOCATION.name, EAST_LOCATION.number);
  const westLocationId = await createLocation(orgId, WEST_LOCATION.name, WEST_LOCATION.number);
  console.log(`   ✅ East location: ${eastLocationId}`);
  console.log(`   ✅ West location: ${westLocationId}\n`);

  // Step 3: Create org_roles
  console.log('👔 Creating role hierarchy...');
  await createRoles(orgId);
  console.log('   ✅ Roles created\n');

  // Step 4: Create positions
  console.log('📋 Creating positions and criteria...');
  await createPositions(orgId);
  console.log('   ✅ Positions created\n');

  // Step 5: Copy infractions and actions rubric
  console.log('⚖️ Copying infractions and actions rubric from Buda...');
  await copyInfractionsRubric(orgId);
  await copyActionsRubric(orgId);
  console.log('   ✅ Rubrics copied\n');

  // Step 6: Create employees
  console.log('👥 Creating employees...');
  const employees = await createEmployees(orgId, eastLocationId, westLocationId);
  console.log(`   ✅ Created ${employees.length} employees\n`);

  // Step 7: Create app_user for operator
  console.log('🔐 Creating operator app_user...');
  const operatorEmployee = employees.find(e => e.role === 'Operator');
  if (operatorEmployee) {
    await createOperatorAppUser(orgId, eastLocationId, operatorEmployee.id);
    console.log('   ✅ Operator app_user created\n');
  }

  // Step 8: Generate ratings
  console.log('⭐ Generating ratings...');
  await generateRatings(orgId, eastLocationId, westLocationId, employees);
  console.log(`   ✅ Generated ${TOTAL_RATINGS} ratings\n`);

  // Step 9: Generate infractions and actions
  console.log('📝 Generating discipline infractions...');
  await generateInfractions(orgId, eastLocationId, westLocationId, employees);
  console.log(`   ✅ Generated ~${TOTAL_INFRACTIONS} infractions\n`);

  console.log('✨ Demo organization seeding complete!');
  console.log(`   Org: ${DEMO_ORG_NAME} (${orgId})`);
  console.log(`   East Location: ${EAST_LOCATION.name} (${eastLocationId})`);
  console.log(`   West Location: ${WEST_LOCATION.name} (${westLocationId})`);
  console.log(`   Operator Login: ${DEMO_OPERATOR_EMAIL} / ${DEMO_OPERATOR_PASSWORD}`);
}

async function cleanExistingData() {
  // Find existing demo org
  const { data: existingOrg } = await supabase
    .from('orgs')
    .select('id')
    .eq('name', DEMO_ORG_NAME)
    .maybeSingle();

  if (!existingOrg) {
    console.log('   No existing demo org found\n');
    return;
  }

  const orgId = existingOrg.id;

  // Get locations
  const { data: locations } = await supabase
    .from('locations')
    .select('id')
    .eq('org_id', orgId);

  const locationIds = locations?.map(l => l.id) || [];

  // Delete in order (respecting foreign keys)
  if (locationIds.length > 0) {
    await supabase.from('disc_actions').delete().in('location_id', locationIds);
    await supabase.from('infractions').delete().in('location_id', locationIds);
    await supabase.from('ratings').delete().in('location_id', locationIds);
    await supabase.from('position_big5_labels').delete().in('location_id', locationIds);
    
    // Clear employee_id from app_users before deleting employees
    await supabase.from('app_users').update({ employee_id: null }).eq('org_id', orgId);
    await supabase.from('employees').delete().in('location_id', locationIds);
    await supabase.from('locations').delete().in('id', locationIds);
  }

  await supabase.from('position_criteria').delete().eq('org_id', orgId);
  await supabase.from('org_positions').delete().eq('org_id', orgId);
  await supabase.from('org_roles').delete().eq('org_id', orgId);
  await supabase.from('infractions_rubric').delete().eq('org_id', orgId);
  await supabase.from('disc_actions_rubric').delete().eq('org_id', orgId);
  await supabase.from('rating_thresholds').delete().eq('org_id', orgId);
  await supabase.from('app_users').delete().eq('org_id', orgId);
  await supabase.from('orgs').delete().eq('id', orgId);

  console.log('   ✅ Cleaned existing data\n');
}

async function createOrg(): Promise<string> {
  const { data: existing } = await supabase
    .from('orgs')
    .select('id')
    .eq('name', DEMO_ORG_NAME)
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  const orgId = randomUUID();
  const { error } = await supabase.from('orgs').insert({
    id: orgId,
    name: DEMO_ORG_NAME,
  });

  if (error) throw error;
  return orgId;
}

async function createLocation(orgId: string, name: string, locationNumber: string): Promise<string> {
  const { data: existing } = await supabase
    .from('locations')
    .select('id')
    .eq('org_id', orgId)
    .eq('location_number', locationNumber)
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  const locationId = randomUUID();
  const { error } = await supabase.from('locations').insert({
    id: locationId,
    org_id: orgId,
    name,
    location_number: locationNumber,
    location_mobile_token: generateMobileToken(),
  });

  if (error) throw error;
  return locationId;
}

async function createRoles(orgId: string) {
  const roles = [
    { role_name: 'Operator', hierarchy_level: 0, color: 'blue' },
    { role_name: 'Executive', hierarchy_level: 1, color: 'purple' },
    { role_name: 'Director', hierarchy_level: 2, color: 'teal' },
    { role_name: 'Team Lead', hierarchy_level: 3, color: 'orange' },
    { role_name: 'Trainer', hierarchy_level: 4, color: 'pink' },
    { role_name: 'Team Member', hierarchy_level: 5, color: 'gray' },
  ];

  for (const role of roles) {
    const { error } = await supabase.from('org_roles').insert({
      id: randomUUID(),
      org_id: orgId,
      ...role,
    });
    if (error && !error.message.includes('duplicate')) throw error;
  }
}

async function createPositions(orgId: string) {
  // Copy positions and criteria from Reece Howard (BUDA_ORG_ID)
  const { data: reecePositions, error: posError } = await supabase
    .from('org_positions')
    .select('name, zone, description, display_order, is_active')
    .eq('org_id', BUDA_ORG_ID)
    .eq('is_active', true)
    .order('display_order');

  if (posError) throw posError;

  if (!reecePositions || reecePositions.length === 0) {
    console.log('   ⚠️ No positions found in Reece Howard org, skipping');
    return;
  }

  // Map old position IDs to new position IDs for criteria copying
  const positionIdMap = new Map<string, string>();

  // Get Reece Howard position IDs for criteria lookup
  const { data: reecePositionIds } = await supabase
    .from('org_positions')
    .select('id, name')
    .eq('org_id', BUDA_ORG_ID)
    .eq('is_active', true);

  const reeceIdByName = new Map<string, string>();
  (reecePositionIds || []).forEach(p => reeceIdByName.set(p.name, p.id));

  for (const pos of reecePositions) {
    const newPositionId = randomUUID();
    const { error: insertError } = await supabase.from('org_positions').insert({
      id: newPositionId,
      org_id: orgId,
      name: pos.name,
      zone: pos.zone,
      description: pos.description,
      display_order: pos.display_order,
      is_active: pos.is_active,
    });
    if (insertError && !insertError.message.includes('duplicate')) throw insertError;

    // Store mapping for criteria
    const oldPositionId = reeceIdByName.get(pos.name);
    if (oldPositionId) {
      positionIdMap.set(oldPositionId, newPositionId);
    }
  }

  // Copy criteria for each position
  for (const [oldPosId, newPosId] of Array.from(positionIdMap.entries())) {
    const { data: criteria } = await supabase
      .from('position_criteria')
      .select('name, description, criteria_order')
      .eq('position_id', oldPosId)
      .order('criteria_order');

    if (criteria && criteria.length > 0) {
      for (const crit of criteria) {
        await supabase.from('position_criteria').insert({
          id: randomUUID(),
          position_id: newPosId,
          criteria_order: crit.criteria_order,
          name: crit.name,
          description: crit.description || '',
        });
      }
    }
  }

  // Create rating thresholds
  await supabase.from('rating_thresholds').insert({
    id: randomUUID(),
    org_id: orgId,
    yellow_threshold: 1.75,
    green_threshold: 2.75,
  });

  console.log(`   ✅ Copied ${reecePositions.length} positions with criteria from Reece Howard`);
}

async function copyInfractionsRubric(orgId: string) {
  // First try org-level infractions from Reece Howard
  let { data: infractions, error } = await supabase
    .from('infractions_rubric')
    .select('action, points')
    .eq('org_id', BUDA_ORG_ID)
    .is('location_id', null)
    .order('points');

  if (error) throw error;

  // If no org-level infractions, get location-specific ones (Reece Howard uses location-specific)
  if (!infractions || infractions.length === 0) {
    const { data: locationInfractions, error: locError } = await supabase
      .from('infractions_rubric')
      .select('action, points')
      .eq('org_id', BUDA_ORG_ID)
      .not('location_id', 'is', null)
      .order('points');

    if (locError) throw locError;

    // Deduplicate by action name (in case multiple locations have same infractions)
    const uniqueInfractions = new Map<string, { action: string; points: number }>();
    (locationInfractions || []).forEach(inf => {
      if (!uniqueInfractions.has(inf.action)) {
        uniqueInfractions.set(inf.action, inf);
      }
    });
    infractions = Array.from(uniqueInfractions.values());
  }

  if (!infractions || infractions.length === 0) {
    console.log('   ⚠️ No infractions found in Reece Howard org');
    return;
  }

  // Insert as org-level infractions (no location_id)
  for (const inf of infractions) {
    await supabase.from('infractions_rubric').insert({
      id: randomUUID(),
      org_id: orgId,
      location_id: null,
      action: inf.action,
      points: inf.points,
    });
  }

  console.log(`   ✅ Copied ${infractions.length} infractions from Reece Howard`);
}

async function copyActionsRubric(orgId: string) {
  // First try org-level actions from Reece Howard
  let { data: actions, error } = await supabase
    .from('disc_actions_rubric')
    .select('action, points_threshold')
    .eq('org_id', BUDA_ORG_ID)
    .is('location_id', null)
    .order('points_threshold');

  if (error) throw error;

  // If no org-level actions, get location-specific ones (Reece Howard uses location-specific)
  if (!actions || actions.length === 0) {
    const { data: locationActions, error: locError } = await supabase
      .from('disc_actions_rubric')
      .select('action, points_threshold')
      .eq('org_id', BUDA_ORG_ID)
      .not('location_id', 'is', null)
      .order('points_threshold');

    if (locError) throw locError;

    // Deduplicate by action name
    const uniqueActions = new Map<string, { action: string; points_threshold: number }>();
    (locationActions || []).forEach(act => {
      if (!uniqueActions.has(act.action)) {
        uniqueActions.set(act.action, act);
      }
    });
    actions = Array.from(uniqueActions.values());
  }

  if (!actions || actions.length === 0) {
    console.log('   ⚠️ No disciplinary actions found in Reece Howard org');
    return;
  }

  // Insert as org-level actions (no location_id)
  for (const act of actions) {
    await supabase.from('disc_actions_rubric').insert({
      id: randomUUID(),
      org_id: orgId,
      location_id: null,
      action: act.action,
      points_threshold: act.points_threshold,
    });
  }

  console.log(`   ✅ Copied ${actions.length} disciplinary actions from Reece Howard`);
}

interface EmployeeRecord {
  id: string;
  role: string;
  location_id: string;
  is_foh: boolean;
  is_boh: boolean;
  full_name: string;
}

async function createEmployees(orgId: string, eastId: string, westId: string): Promise<EmployeeRecord[]> {
  const employees: any[] = [];

  // Helper to determine FOH/BOH randomly
  const randomFohBoh = () => {
    const r = Math.random();
    if (r < 0.4) return { is_foh: true, is_boh: false };
    if (r < 0.7) return { is_foh: false, is_boh: true };
    return { is_foh: true, is_boh: true };
  };

  // Operator (at East, but org-level)
  employees.push({
    id: randomUUID(),
    org_id: orgId,
    location_id: eastId,
    role: 'Operator',
    first_name: OPERATOR.first,
    last_name: OPERATOR.last,
    hire_date: '2020-01-01',
    active: true,
    is_foh: true,
    is_boh: true,
  });

  // Executives (at East location, but work at both)
  for (const exec of EXECUTIVES) {
    employees.push({
      id: randomUUID(),
      org_id: orgId,
      location_id: eastId, // Primary location
      role: 'Executive',
      first_name: exec.first,
      last_name: exec.last,
      hire_date: randomHireDate(),
      active: true,
      is_foh: true,
      is_boh: true,
    });
  }

  // Directors - East
  for (const dir of DIRECTORS_EAST) {
    employees.push({
      id: randomUUID(),
      org_id: orgId,
      location_id: eastId,
      role: 'Director',
      first_name: dir.first,
      last_name: dir.last,
      hire_date: randomHireDate(),
      active: true,
      is_foh: true,
      is_boh: true,
    });
  }

  // Directors - West
  for (const dir of DIRECTORS_WEST) {
    employees.push({
      id: randomUUID(),
      org_id: orgId,
      location_id: westId,
      role: 'Director',
      first_name: dir.first,
      last_name: dir.last,
      hire_date: randomHireDate(),
      active: true,
      is_foh: true,
      is_boh: true,
    });
  }

  // Team Leads - East
  for (const tl of TEAM_LEADS_EAST) {
    const fohBoh = randomFohBoh();
    employees.push({
      id: randomUUID(),
      org_id: orgId,
      location_id: eastId,
      role: 'Team Lead',
      first_name: tl.first,
      last_name: tl.last,
      hire_date: randomHireDate(),
      active: true,
      ...fohBoh,
    });
  }

  // Team Leads - West
  for (const tl of TEAM_LEADS_WEST) {
    const fohBoh = randomFohBoh();
    employees.push({
      id: randomUUID(),
      org_id: orgId,
      location_id: westId,
      role: 'Team Lead',
      first_name: tl.first,
      last_name: tl.last,
      hire_date: randomHireDate(),
      active: true,
      ...fohBoh,
    });
  }

  // Trainers - East
  for (const tr of TRAINERS_EAST) {
    const fohBoh = randomFohBoh();
    employees.push({
      id: randomUUID(),
      org_id: orgId,
      location_id: eastId,
      role: 'Trainer',
      first_name: tr.first,
      last_name: tr.last,
      hire_date: randomHireDate(),
      active: true,
      ...fohBoh,
    });
  }

  // Trainers - West
  for (const tr of TRAINERS_WEST) {
    const fohBoh = randomFohBoh();
    employees.push({
      id: randomUUID(),
      org_id: orgId,
      location_id: westId,
      role: 'Trainer',
      first_name: tr.first,
      last_name: tr.last,
      hire_date: randomHireDate(),
      active: true,
      ...fohBoh,
    });
  }

  // Team Members - East
  for (const tm of TEAM_MEMBERS_EAST) {
    const fohBoh = randomFohBoh();
    employees.push({
      id: randomUUID(),
      org_id: orgId,
      location_id: eastId,
      role: 'Team Member',
      first_name: tm.first,
      last_name: tm.last,
      hire_date: randomHireDate(),
      active: true,
      ...fohBoh,
    });
  }

  // Team Members - West
  for (const tm of TEAM_MEMBERS_WEST) {
    const fohBoh = randomFohBoh();
    employees.push({
      id: randomUUID(),
      org_id: orgId,
      location_id: westId,
      role: 'Team Member',
      first_name: tm.first,
      last_name: tm.last,
      hire_date: randomHireDate(),
      active: true,
      ...fohBoh,
    });
  }

  // Insert employees in chunks
  const chunks = chunkArray(employees, 50);
  for (const chunk of chunks) {
    const { error } = await supabase.from('employees').insert(chunk);
    if (error) throw error;
  }

  // Fetch back with full_name
  const { data: insertedEmployees, error: fetchError } = await supabase
    .from('employees')
    .select('id, role, location_id, is_foh, is_boh, full_name')
    .eq('org_id', orgId);

  if (fetchError) throw fetchError;
  return insertedEmployees || [];
}

async function createOperatorAppUser(orgId: string, locationId: string, employeeId: string) {
  // Check if auth user exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existingAuthUser = existingUsers?.users?.find(
    (u: any) => u.email?.toLowerCase() === DEMO_OPERATOR_EMAIL.toLowerCase()
  );

  let authUserId: string;

  if (existingAuthUser) {
    authUserId = existingAuthUser.id;
    // Update password
    await supabase.auth.admin.updateUserById(authUserId, {
      password: DEMO_OPERATOR_PASSWORD,
    });
  } else {
    // Create auth user
    const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
      email: DEMO_OPERATOR_EMAIL,
      email_confirm: true,
      password: DEMO_OPERATOR_PASSWORD,
      user_metadata: {
        first_name: OPERATOR.first,
        last_name: OPERATOR.last,
      },
    });
    if (authError) throw authError;
    authUserId = newUser.user.id;
  }

  // Check if app_user exists
  const { data: existingAppUser } = await supabase
    .from('app_users')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (existingAppUser) {
    await supabase
      .from('app_users')
      .update({
        org_id: orgId,
        location_id: locationId,
        employee_id: employeeId,
        role: 'Owner/Operator',
        first_name: OPERATOR.first,
        last_name: OPERATOR.last,
        permissions: 'operator',
      })
      .eq('id', existingAppUser.id);
  } else {
    await supabase.from('app_users').insert({
      id: randomUUID(),
      auth_user_id: authUserId,
      email: DEMO_OPERATOR_EMAIL,
      org_id: orgId,
      location_id: locationId,
      employee_id: employeeId,
      role: 'Owner/Operator',
      first_name: OPERATOR.first,
      last_name: OPERATOR.last,
      permissions: 'operator',
    });
  }
}

async function generateRatings(
  orgId: string,
  eastId: string,
  westId: string,
  employees: EmployeeRecord[]
) {
  // Get positions from the database (positions were copied from Reece Howard)
  const { data: positionsData } = await supabase
    .from('org_positions')
    .select('name, zone')
    .eq('org_id', orgId)
    .eq('is_active', true);

  const fohPositions = (positionsData || []).filter(p => p.zone === 'FOH').map(p => p.name);
  const bohPositions = (positionsData || []).filter(p => p.zone === 'BOH').map(p => p.name);
  const allPositions = [...fohPositions, ...bohPositions];

  // Separate employees by location and role
  const eastEmployees = employees.filter(e => e.location_id === eastId);
  const westEmployees = employees.filter(e => e.location_id === westId);
  
  // Leaders who can rate (Operator, Executive, Director, Team Lead)
  const leaderRoles = ['Operator', 'Executive', 'Director', 'Team Lead'];
  const eastLeaders = eastEmployees.filter(e => leaderRoles.includes(e.role));
  const westLeaders = westEmployees.filter(e => leaderRoles.includes(e.role));
  // Executives can rate at both locations
  const executives = employees.filter(e => e.role === 'Executive');

  // Employees who can be rated (everyone except Operator)
  const eastRateable = eastEmployees.filter(e => e.role !== 'Operator');
  const westRateable = westEmployees.filter(e => e.role !== 'Operator');

  const ratings: any[] = [];

  // Calculate distribution
  const crossLocationCount = Math.round(TOTAL_RATINGS * CROSS_LOCATION_PERCENT);
  const normalCount = TOTAL_RATINGS - crossLocationCount;
  const eastNormalCount = Math.round(normalCount * EAST_PERCENT);
  const westNormalCount = normalCount - eastNormalCount;

  // Generate normal East ratings
  for (let i = 0; i < eastNormalCount; i++) {
    const employee = pickRandom(eastRateable);
    const leader = pickRandom([...eastLeaders, ...executives]);
    const position = employee.is_foh && !employee.is_boh 
      ? pickRandom(fohPositions)
      : !employee.is_foh && employee.is_boh
        ? pickRandom(bohPositions)
        : pickRandom(allPositions);

    ratings.push({
      employee_id: employee.id,
      rater_user_id: leader.id,
      position,
      rating_1: generateRealisticRating(),
      rating_2: generateRealisticRating(),
      rating_3: generateRealisticRating(),
      rating_4: generateRealisticRating(),
      rating_5: generateRealisticRating(),
      created_at: getRandomDateInRange(START_DATE, END_DATE).toISOString(),
      location_id: eastId,
      org_id: orgId,
    });
  }

  // Generate normal West ratings
  for (let i = 0; i < westNormalCount; i++) {
    const employee = pickRandom(westRateable);
    const leader = pickRandom([...westLeaders, ...executives]);
    const position = employee.is_foh && !employee.is_boh 
      ? pickRandom(fohPositions)
      : !employee.is_foh && employee.is_boh
        ? pickRandom(bohPositions)
        : pickRandom(allPositions);

    ratings.push({
      employee_id: employee.id,
      rater_user_id: leader.id,
      position,
      rating_1: generateRealisticRating(),
      rating_2: generateRealisticRating(),
      rating_3: generateRealisticRating(),
      rating_4: generateRealisticRating(),
      rating_5: generateRealisticRating(),
      created_at: getRandomDateInRange(START_DATE, END_DATE).toISOString(),
      location_id: westId,
      org_id: orgId,
    });
  }

  // Generate cross-location ratings (East employees rated at West)
  const crossEastToWest = Math.round(crossLocationCount * EAST_PERCENT);
  for (let i = 0; i < crossEastToWest; i++) {
    const employee = pickRandom(eastRateable);
    const leader = pickRandom([...westLeaders, ...executives]);
    const position = pickRandom(allPositions);

    ratings.push({
      employee_id: employee.id,
      rater_user_id: leader.id,
      position,
      rating_1: generateRealisticRating(),
      rating_2: generateRealisticRating(),
      rating_3: generateRealisticRating(),
      rating_4: generateRealisticRating(),
      rating_5: generateRealisticRating(),
      created_at: getRandomDateInRange(START_DATE, END_DATE).toISOString(),
      location_id: westId, // Rated at West
      org_id: orgId,
    });
  }

  // Generate cross-location ratings (West employees rated at East)
  const crossWestToEast = crossLocationCount - crossEastToWest;
  for (let i = 0; i < crossWestToEast; i++) {
    const employee = pickRandom(westRateable);
    const leader = pickRandom([...eastLeaders, ...executives]);
    const position = pickRandom(allPositions);

    ratings.push({
      employee_id: employee.id,
      rater_user_id: leader.id,
      position,
      rating_1: generateRealisticRating(),
      rating_2: generateRealisticRating(),
      rating_3: generateRealisticRating(),
      rating_4: generateRealisticRating(),
      rating_5: generateRealisticRating(),
      created_at: getRandomDateInRange(START_DATE, END_DATE).toISOString(),
      location_id: eastId, // Rated at East
      org_id: orgId,
    });
  }

  // Insert ratings in chunks
  const chunks = chunkArray(ratings, 200);
  for (const chunk of chunks) {
    const { error } = await supabase.from('ratings').insert(chunk);
    if (error) throw error;
  }
}

async function generateInfractions(
  orgId: string,
  eastId: string,
  westId: string,
  employees: EmployeeRecord[]
) {
  // Fetch infractions rubric
  const { data: rubric } = await supabase
    .from('infractions_rubric')
    .select('id, action, points')
    .eq('org_id', orgId);

  if (!rubric || rubric.length === 0) {
    console.log('   ⚠️ No infractions rubric found, skipping');
    return;
  }

  // Fetch actions rubric
  const { data: actionsRubric } = await supabase
    .from('disc_actions_rubric')
    .select('id, action, points_threshold')
    .eq('org_id', orgId)
    .order('points_threshold', { ascending: true });

  // Get employees who can receive infractions (Team Members, Trainers, some Team Leads)
  const teamMembers = employees.filter(e => e.role === 'Team Member');
  const trainers = employees.filter(e => e.role === 'Trainer');
  const teamLeads = employees.filter(e => e.role === 'Team Lead');
  
  // Leaders who can document infractions
  const leaderRoles = ['Operator', 'Executive', 'Director', 'Team Lead'];
  const leaders = employees.filter(e => leaderRoles.includes(e.role));
  const eastLeaders = leaders.filter(e => e.location_id === eastId || e.role === 'Operator' || e.role === 'Executive');
  const westLeaders = leaders.filter(e => e.location_id === westId || e.role === 'Operator' || e.role === 'Executive');

  const infractions: any[] = [];
  const employeePointTotals: Record<string, number> = {};

  // Distribution: 24 team members, 4 trainers, 2 team leads
  const infractionTargets: EmployeeRecord[] = [
    ...Array(24).fill(null).map(() => pickRandom(teamMembers)),
    ...Array(4).fill(null).map(() => pickRandom(trainers)),
    ...Array(2).fill(null).map(() => pickRandom(teamLeads)),
  ];

  // Track used dates per employee to avoid duplicates
  const usedDates: Record<string, Set<string>> = {};

  for (const target of infractionTargets) {
    const infractionType = pickRandom(rubric);
    const isEast = target.location_id === eastId;
    const locationLeaders = isEast ? eastLeaders : westLeaders;
    const leader = pickRandom(locationLeaders);
    const isNotified = Math.random() < 0.7; // 70% notified

    // Ensure unique date for this employee
    if (!usedDates[target.id]) {
      usedDates[target.id] = new Set();
    }
    
    let infractionDate: string;
    let attempts = 0;
    do {
      infractionDate = getRandomDateInRange(START_DATE, END_DATE).toISOString();
      attempts++;
    } while (usedDates[target.id].has(infractionDate) && attempts < 100);
    
    usedDates[target.id].add(infractionDate);

    const infraction = {
      id: randomUUID(),
      employee_id: target.id,
      org_id: orgId,
      location_id: target.location_id,
      infraction: infractionType.action,
      points: infractionType.points,
      infraction_date: infractionDate.split('T')[0],
      created_at: infractionDate,
      leader_id: leader.id,
      acknowledgement: isNotified ? 'Notified' : 'Not Yet Notified',
      ack_bool: isNotified,
      notes: '',
    };

    infractions.push(infraction);

    // Track points for actions
    employeePointTotals[target.id] = (employeePointTotals[target.id] || 0) + infractionType.points;
  }

  // Insert infractions
  const chunks = chunkArray(infractions, 50);
  for (const chunk of chunks) {
    const { error } = await supabase.from('infractions').insert(chunk);
    if (error) throw error;
  }

  // Generate disciplinary actions based on point totals
  if (actionsRubric && actionsRubric.length > 0) {
    const actions: any[] = [];

    for (const [employeeId, points] of Object.entries(employeePointTotals)) {
      // Find applicable action
      const applicableAction = actionsRubric
        .filter(a => a.points_threshold <= points)
        .pop(); // Highest threshold that's still <= points

      if (applicableAction) {
        const employee = employees.find(e => e.id === employeeId);
        if (!employee) continue;

        const isEast = employee.location_id === eastId;
        const locationLeaders = isEast ? eastLeaders : westLeaders;
        const leader = pickRandom(locationLeaders);

        actions.push({
          id: randomUUID(),
          employee_id: employeeId,
          org_id: orgId,
          location_id: employee.location_id,
          action: applicableAction.action,
          action_id: applicableAction.id,
          action_date: getRandomDateInRange(START_DATE, END_DATE).toISOString().split('T')[0],
          acting_leader: leader.id,
          notes: '',
        });
      }
    }

    if (actions.length > 0) {
      const actionChunks = chunkArray(actions, 50);
      for (const chunk of actionChunks) {
        const { error } = await supabase.from('disc_actions').insert(chunk);
        if (error) throw error;
      }
      console.log(`   ✅ Generated ${actions.length} disciplinary actions`);
    }
  }
}

// Run the seed
seed()
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  })
  .then(() => {
    process.exit(0);
  });
