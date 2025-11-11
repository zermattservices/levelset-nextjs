/**
 * Seed a mock org/location with employees, Big 5 labels, and ratings copied from Buda.
 *
 * Usage:
 *   npx tsx scripts/seed-mock-location.ts
 *
 * Environment variables required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional overrides:
 *   --ratings-limit=<number>  (defaults to 900)
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

const BUDA_ORG_ID = process.env.NEXT_PUBLIC_BUDA_ORG_ID ?? '54b9864f-9df9-4a15-a209-7b99e1c274f4';
const BUDA_LOCATION_ID = process.env.NEXT_PUBLIC_BUDA_LOCATION_ID ?? '67e00fb2-29f5-41ce-9c1c-93e2f7f392dd';

const MOCK_ORG_NAME = 'John Smith';
const MOCK_LOCATION_NAME = 'John Smith Mock Location';
const MOCK_LOCATION_NUMBER = '99999';
const MOCK_OWNER_EMAIL = 'john.smith@mocksmithco.test';

const ratingsLimitArg = process.argv.find((arg) => arg.startsWith('--ratings-limit='));
const RATINGS_LIMIT = ratingsLimitArg ? parseInt(ratingsLimitArg.split('=')[1] || '900', 10) : 900;

const ROLE_TEMPLATES: Record<string, Array<{ first: string; last: string }>> = {
  Operator: [{ first: 'John', last: 'Smith' }],
  Executive: [
    { first: 'Ava', last: 'Reed' },
    { first: 'Liam', last: 'Hayes' },
  ],
  Director: [
    { first: 'Sophia', last: 'Reyes' },
    { first: 'Noah', last: 'Bennett' },
    { first: 'Amelia', last: 'Morales' },
  ],
  'Team Lead': [
    { first: 'Mason', last: 'Clark' },
    { first: 'Olivia', last: 'Perry' },
    { first: 'Ethan', last: 'Brooks' },
    { first: 'Isabella', last: 'Nguyen' },
    { first: 'Lucas', last: 'Chavez' },
    { first: 'Mia', last: 'Foster' },
    { first: 'Harper', last: 'Ellis' },
    { first: 'Jack', last: 'Kim' },
    { first: 'Chloe', last: 'Adams' },
    { first: 'Henry', last: 'Walsh' },
  ],
  Trainer: [
    { first: 'Elijah', last: 'Price' },
    { first: 'Lily', last: 'Cooper' },
    { first: 'Owen', last: 'Blake' },
    { first: 'Zoe', last: 'Turner' },
    { first: 'Nora', last: 'Summers' },
  ],
  'Team Member': [
    { first: 'Benjamin', last: 'Hall' },
    { first: 'Charlotte', last: 'Rogers' },
    { first: 'Daniel', last: 'Ortiz' },
    { first: 'Grace', last: 'Sullivan' },
    { first: 'Isaac', last: 'Powell' },
    { first: 'Natalie', last: 'Hopkins' },
    { first: 'Samuel', last: 'Gibbs' },
    { first: 'Victoria', last: 'Lane' },
    { first: 'Wyatt', last: 'Harrington' },
    { first: 'Aubrey', last: 'Shields' },
    { first: 'Carter', last: 'Bowman' },
    { first: 'Delilah', last: 'Hart' },
    { first: 'Easton', last: 'Barber' },
    { first: 'Faith', last: 'Winters' },
    { first: 'Gianna', last: 'Cross' },
    { first: 'Hayden', last: 'McCoy' },
    { first: 'Ivy', last: 'Thornton' },
    { first: 'Julian', last: 'Baxter' },
    { first: 'Kennedy', last: 'Lowell' },
    { first: 'Logan', last: 'Tate' },
    { first: 'Madison', last: 'Pierce' },
    { first: 'Nolan', last: 'Shepard' },
    { first: 'Paisley', last: 'Vaughn' },
    { first: 'Quinn', last: 'Barrett' },
    { first: 'Ryder', last: 'Mason' },
    { first: 'Stella', last: 'Briggs' },
    { first: 'Tristan', last: 'Keller' },
    { first: 'Violet', last: 'Chambers' },
    { first: 'Weston', last: 'Drake' },
  ],
};

async function ensureOwnerAuthUser(): Promise<string> {
  const existing = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (existing.error) {
    throw existing.error;
  }

  const found = existing.data.users?.find((user: any) => user.email?.toLowerCase() === MOCK_OWNER_EMAIL.toLowerCase());
  if (found?.id) {
    return found.id;
  }

  const password = `${randomUUID()}Aa1!`;
  const created = await supabase.auth.admin.createUser({
    email: MOCK_OWNER_EMAIL,
    email_confirm: true,
    password,
    user_metadata: {
      first_name: 'John',
      last_name: 'Smith',
    },
  });

  if (created.error || !created.data?.user?.id) {
    throw created.error ?? new Error('Failed to create auth user for mock owner');
  }

  return created.data.user.id;
}

interface EmployeeRecord {
  id: string;
  role: string;
  full_name: string;
}

function randomHireDate(): string {
  const now = new Date();
  const pastDays = Math.floor(Math.random() * 540) + 30; // between ~1 month and ~18 months
  const hire = new Date(now.getTime() - pastDays * 24 * 60 * 60 * 1000);
  return hire.toISOString().split('T')[0];
}

async function ensureOrg(): Promise<string> {
  const { data: existing, error: existingError } = await supabase
    .from('orgs')
    .select('id, name')
    .eq('name', MOCK_ORG_NAME)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing?.id) {
    console.log(`ℹ️  Reusing existing org "${MOCK_ORG_NAME}" (${existing.id})`);
    return existing.id;
  }

  const { data: referenceOrg, error: referenceError } = await supabase
    .from('orgs')
    .select('*')
    .eq('id', BUDA_ORG_ID)
    .maybeSingle();

  if (referenceError) {
    throw referenceError;
  }

  const orgId = randomUUID();
  const payload: Record<string, any> = { id: orgId, name: MOCK_ORG_NAME };

  if (referenceOrg) {
    for (const [key, value] of Object.entries(referenceOrg)) {
      if (['id', 'created_at', 'updated_at', 'name'].includes(key)) continue;
      payload[key] = value;
    }
  }

  delete (payload as any).slug;
  if ('store_number' in payload) {
    payload.store_number = MOCK_LOCATION_NUMBER;
  }
  if ('owner_name' in payload) {
    payload.owner_name = MOCK_ORG_NAME;
  }

  const { error: insertError } = await supabase.from('orgs').insert(payload);

  if (insertError) {
    console.error('❌ Failed to create org payload:', payload);
    throw insertError;
  }

  console.log(`✅ Created org "${MOCK_ORG_NAME}" (${orgId})`);
  return orgId;
}

async function ensureLocation(orgId: string): Promise<string> {
  const { data: existing, error: existingError } = await supabase
    .from('locations')
    .select('id, name, location_number')
    .eq('org_id', orgId)
    .eq('location_number', MOCK_LOCATION_NUMBER)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing?.id) {
    console.log(`ℹ️  Reusing existing location "${existing.name}" (${existing.id})`);
    return existing.id;
  }

  const { data: referenceLocation, error: referenceError } = await supabase
    .from('locations')
    .select('*')
    .eq('id', BUDA_LOCATION_ID)
    .maybeSingle();

  if (referenceError) {
    throw referenceError;
  }

  const locationId = randomUUID();
  const payload: Record<string, any> = {
    id: locationId,
    org_id: orgId,
    name: MOCK_LOCATION_NAME,
    location_number: MOCK_LOCATION_NUMBER,
  };

  if (referenceLocation) {
    for (const [key, value] of Object.entries(referenceLocation)) {
      if (['id', 'created_at', 'updated_at', 'org_id', 'name', 'location_number'].includes(key)) continue;
      payload[key] = value;
    }
  }

  delete (payload as any).slug;
  if ('store_number' in payload) {
    payload.store_number = MOCK_LOCATION_NUMBER;
  }

  const { error: insertError } = await supabase.from('locations').insert(payload);

  if (insertError) {
    console.error('❌ Failed to create location payload:', payload);
    throw insertError;
  }

  console.log(`✅ Created location "${MOCK_LOCATION_NAME}" (${locationId})`);
  return locationId;
}

async function ensureOwnerAppUser(orgId: string, locationId: string, operatorEmployeeId: string): Promise<string> {
  const authUserId = await ensureOwnerAuthUser();

  const { data: existing, error: existingError } = await supabase
    .from('app_users')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from('app_users')
      .update({
        email: MOCK_OWNER_EMAIL,
        first_name: 'John',
        last_name: 'Smith',
        role: 'Owner/Operator',
        org_id: orgId,
        location_id: locationId,
        employee_id: operatorEmployeeId,
        permissions: 'operator',
      })
      .eq('id', existing.id);

    if (updateError) {
      throw updateError;
    }

    console.log(`ℹ️  Reusing existing app_user for ${authUserId}`);
    return authUserId;
  }

  const payload = {
    id: randomUUID(),
    auth_user_id: authUserId,
    email: MOCK_OWNER_EMAIL,
    first_name: 'John',
    last_name: 'Smith',
    role: 'Owner/Operator',
    org_id: orgId,
    location_id: locationId,
    employee_id: operatorEmployeeId,
    permissions: 'operator',
  };

  const { error: insertError } = await supabase.from('app_users').insert(payload);

  if (insertError) {
    console.error('❌ Failed to create app_user payload:', payload);
    throw insertError;
  }

  console.log('✅ Created owner app_user linked to operator employee');
  return authUserId;
}

function buildEmployees(orgId: string, locationId: string) {
  const employees: any[] = [];
  for (const [role, names] of Object.entries(ROLE_TEMPLATES)) {
    names.forEach((name) => {
      employees.push({
        id: randomUUID(),
        org_id: orgId,
        location_id: locationId,
        role,
        first_name: name.first,
        last_name: name.last,
        hire_date: randomHireDate(),
        active: true,
      });
    });
  }
  return employees;
}

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

function normalizeRole(role?: string | null): string {
  if (!role) return 'Team Member';
  if (ROLE_TEMPLATES[role]) return role;
  if (role.toLowerCase().includes('lead')) return 'Team Lead';
  if (role.toLowerCase().includes('trainer')) return 'Trainer';
  if (role.toLowerCase().includes('director')) return 'Director';
  if (role.toLowerCase().includes('exec')) return 'Executive';
  if (role.toLowerCase().includes('operator')) return 'Operator';
  return 'Team Member';
}

async function seed() {
  console.log('🚀 Seeding mock location data...\n');

  const orgId = await ensureOrg();
  const locationId = await ensureLocation(orgId);

  // Ensure location metadata matches expectations
  await supabase
    .from('locations')
    .update({ name: MOCK_LOCATION_NAME, location_number: MOCK_LOCATION_NUMBER })
    .eq('id', locationId);

  console.log('\n🧹 Clearing existing mock data for location...');
  const { error: deleteRatingsError } = await supabase
    .from('ratings')
    .delete()
    .eq('location_id', locationId);
  if (deleteRatingsError) {
    throw deleteRatingsError;
  }

  const { error: clearAppUsersError } = await supabase
    .from('app_users')
    .update({ employee_id: null })
    .eq('org_id', orgId)
    .eq('location_id', locationId);
  if (clearAppUsersError) {
    throw clearAppUsersError;
  }

  const { error: deleteEmployeesError } = await supabase
    .from('employees')
    .delete()
    .eq('location_id', locationId);
  if (deleteEmployeesError) {
    throw deleteEmployeesError;
  }

  const { error: deleteLabelsError } = await supabase
    .from('position_big5_labels')
    .delete()
    .eq('location_id', locationId);
  if (deleteLabelsError) {
    throw deleteLabelsError;
  }

  console.log('\n📄 Fetching reference data from Buda...');

  const [{ data: budaEmployees, error: budaEmployeesError }, { data: budaRatingsRaw, error: budaRatingsError }, { data: big5Labels, error: big5Error }] =
    await Promise.all([
      supabase
        .from('employees')
        .select('id, full_name, role')
        .eq('location_id', BUDA_LOCATION_ID),
      supabase
        .from('ratings')
        .select('*')
        .eq('location_id', BUDA_LOCATION_ID)
        .order('created_at', { ascending: true }),
      supabase
        .from('position_big5_labels')
        .select('*')
        .eq('location_id', BUDA_LOCATION_ID),
    ]);

  if (budaEmployeesError) throw budaEmployeesError;
  if (budaRatingsError) throw budaRatingsError;
  if (big5Error) throw big5Error;

  if (!budaEmployees || budaEmployees.length === 0) {
    throw new Error('No employees found for Buda reference location');
  }

  console.log(`   • Reference employees: ${budaEmployees.length}`);
  console.log(`   • Reference ratings: ${budaRatingsRaw?.length ?? 0}`);
  console.log(`   • Reference Big 5 labels: ${big5Labels?.length ?? 0}\n`);

  console.log('👥 Generating mock employees...');
  const employeePayloads = buildEmployees(orgId, locationId);

  const { data: insertedEmployees, error: insertEmployeesError } = await supabase
    .from('employees')
    .insert(employeePayloads)
    .select('id, role, full_name');

  if (insertEmployeesError) {
    console.error('❌ Failed to insert employees. Payload preview:', employeePayloads.slice(0, 3));
    throw insertEmployeesError;
  }

  console.log(`✅ Inserted ${insertedEmployees?.length ?? 0} employees`);

  const operatorEmployee = insertedEmployees?.find((emp) => emp.role === 'Operator');
  if (!operatorEmployee) {
    throw new Error('Operator employee not found after insertion');
  }

  const ownerAuthId = await ensureOwnerAppUser(orgId, locationId, operatorEmployee.id);

  console.log('\n🧭 Mirroring Big 5 labels...');

  if (big5Labels && big5Labels.length > 0) {
    const big5Payloads = big5Labels.map((label) => ({
      id: randomUUID(),
      org_id: orgId,
      location_id: locationId,
      position: label.position,
      label_1: label.label_1,
      label_2: label.label_2,
      label_3: label.label_3,
      label_4: label.label_4,
      label_5: label.label_5,
    }));

    const big5Chunks = chunkArray(big5Payloads, 100);
    for (const chunk of big5Chunks) {
      const { error } = await supabase.from('position_big5_labels').insert(chunk);
      if (error) throw error;
    }
  }

  console.log(`✅ Mirrored ${big5Labels?.length ?? 0} Big 5 label rows`);

  console.log('\n📊 Cloning ratings with role-based remapping...');

  const employeeByRole = new Map<string, EmployeeRecord[]>();
  const roleCounters = new Map<string, number>();
  insertedEmployees?.forEach((emp) => {
    const normalized = normalizeRole(emp.role);
    if (!employeeByRole.has(normalized)) {
      employeeByRole.set(normalized, []);
      roleCounters.set(normalized, 0);
    }
    employeeByRole.get(normalized)!.push(emp);
  });

  const defaultTeamMembers = employeeByRole.get('Team Member');
  if (!defaultTeamMembers || defaultTeamMembers.length === 0) {
    throw new Error('Team Member pool is empty; cannot map ratings');
  }

  const budaEmployeeMap = new Map<string, string>();

  function pickNewEmployee(role: string): EmployeeRecord {
    const normalized = normalizeRole(role);
    const pool = employeeByRole.get(normalized) ?? defaultTeamMembers;
    const counter = roleCounters.get(normalized) ?? 0;
    const employee = pool[counter % pool.length];
    roleCounters.set(normalized, counter + 1);
    return employee;
  }

  for (const budaEmployee of budaEmployees) {
    const mapped = pickNewEmployee(budaEmployee.role);
    budaEmployeeMap.set(budaEmployee.id, mapped.id);
  }

  const ratingsToUse = (budaRatingsRaw ?? []).slice(-RATINGS_LIMIT);
  const ratingPayloads = [];

  for (const rating of ratingsToUse) {
    const targetEmployeeId = budaEmployeeMap.get(rating.employee_id) ?? defaultTeamMembers[0].id;
    const raterEmployeeId = budaEmployeeMap.get(rating.rater_user_id) ?? operatorEmployee.id;

    ratingPayloads.push({
      employee_id: targetEmployeeId,
      rater_user_id: raterEmployeeId,
      position: rating.position,
      rating_1: rating.rating_1,
      rating_2: rating.rating_2,
      rating_3: rating.rating_3,
      rating_4: rating.rating_4,
      rating_5: rating.rating_5,
      created_at: rating.created_at,
      location_id: locationId,
      org_id: orgId,
    });
  }

  const ratingChunks = chunkArray(ratingPayloads, 200);
  for (const chunk of ratingChunks) {
    const { error } = await supabase.from('ratings').insert(chunk);
    if (error) throw error;
  }

  console.log(`✅ Inserted ${ratingPayloads.length} ratings (limit ${RATINGS_LIMIT})`);

  console.log('\n✨ Mock location seeding complete!');
  console.log(`   Org ID: ${orgId}`);
  console.log(`   Location ID: ${locationId}`);
  console.log(`   Owner auth_user_id: ${ownerAuthId}`);
}

seed()
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  })
  .then(() => {
    process.exit(0);
  });

