/**
 * POST /api/onboarding/step
 *
 * Saves progress for a completed onboarding step.
 * Step 2 = Org Structure (roles)
 * Step 3 = Positions + criteria
 * Step 4 = Documents (optional — stores document IDs)
 * Step 5 = Discipline (optional — inserts infractions + actions)
 * Step 6 = Employee Import (inserts employees)
 * Step 7 = Invite Leaders (marks complete)
 * "complete" = Final completion handler
 *
 * Auth: Bearer token from Supabase Auth session.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { ROLE_COLOR_KEYS } from '@/lib/role-utils';
import { getTemplateCriteria, isTemplatePosition } from '@/lib/onboarding/position-template';
import { P } from '@/lib/permissions/constants';
import { getDefaultPermissions, getDefaultProfileName } from '@/lib/permissions/defaults';

interface RoleInput {
  name: string;
  level: number;
  isLeader: boolean;
  color: string;
}

interface PositionInput {
  name: string;
  zone: 'FOH' | 'BOH';
  description?: string;
  displayOrder: number;
  criteria?: Array<{ name: string; description: string; criteria_order: number }>;
}

interface StepRequest {
  step: number | 'complete';
  data: any;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createServerSupabaseClient();

  // Verify auth
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

  // Find app_user + org
  const { data: appUser } = await supabase
    .from('app_users')
    .select('id, org_id, first_name, last_name')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!appUser?.org_id) {
    return res.status(403).json({ error: 'Complete account setup first' });
  }

  const orgId = appUser.org_id;
  const { step, data } = req.body as StepRequest;

  if (step === undefined || step === null) {
    return res.status(400).json({ error: 'step is required' });
  }

  try {
    // Get the onboarding session
    const { data: session } = await supabase
      .from('onboarding_sessions')
      .select('id, completed_steps, step_data')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!session) {
      return res.status(404).json({ error: 'Onboarding session not found' });
    }

    // Handle "complete" intent — mark onboarding as done
    if (step === 'complete') {
      await supabase
        .from('onboarding_sessions')
        .update({
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.id);

      await supabase
        .from('orgs')
        .update({
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq('id', orgId);

      // Seed default permission profiles for the new org
      try {
        await seedDefaultPermissionProfiles(supabase, orgId);
      } catch (permErr: any) {
        console.error('Failed to seed permission profiles (non-fatal):', permErr);
      }

      return res.status(200).json({ success: true, isComplete: true });
    }

    if (typeof step !== 'number' || !data) {
      return res.status(400).json({ error: 'step (number) and data are required' });
    }

    // Handle step-specific logic
    if (step === 2) {
      await handleOrgStructureStep(supabase, orgId, data);
    } else if (step === 3) {
      await handlePositionsStep(supabase, orgId, data);
    } else if (step === 4) {
      // Documents — step_data storage only (docs already uploaded via separate API)
    } else if (step === 5) {
      if (!data.skipped) {
        await handleDisciplineStep(supabase, orgId, data);
      }
    } else if (step === 6) {
      if (!data.skipped) {
        await handleEmployeeImportStep(supabase, orgId, data);
      }
    } else if (step === 7) {
      // Invites handled by separate /api/onboarding/invite-leaders endpoint
      // Step 7 completion just marks progress
    } else {
      return res.status(400).json({ error: `Unknown step: ${step}` });
    }

    // Update onboarding session progress
    const completedSteps = Array.from(
      new Set([...(session.completed_steps || []), step])
    ).sort();

    const stepData = { ...(session.step_data || {}), [step]: data };
    const nextStep = step + 1;

    // Completion: all required steps done.
    // Required: 2, 3. Optional: 4, 5. Required: 6, 7 (or skippable as a pair).
    // Final completion triggered by "complete" intent from CompletionModal.
    const isComplete = step === 7;

    const sessionUpdate: Record<string, any> = {
      completed_steps: completedSteps,
      step_data: stepData,
      current_step: isComplete ? 8 : nextStep,
      updated_at: new Date().toISOString(),
    };

    if (isComplete) {
      sessionUpdate.completed_at = new Date().toISOString();
    }

    await supabase
      .from('onboarding_sessions')
      .update(sessionUpdate)
      .eq('id', session.id);

    return res.status(200).json({
      success: true,
      currentStep: isComplete ? 8 : nextStep,
      completedSteps,
      isComplete,
    });
  } catch (err: any) {
    console.error('onboarding step error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

/**
 * Step 2: Org Structure — create/update org roles.
 */
async function handleOrgStructureStep(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  orgId: string,
  data: { roles: RoleInput[] }
) {
  const { roles } = data;

  if (!roles || !Array.isArray(roles) || roles.length === 0) {
    throw new Error('At least one role is required');
  }

  // Delete existing roles for this org (fresh upsert)
  await supabase.from('org_roles').delete().eq('org_id', orgId);

  const roleInserts = roles.map((role, i) => ({
    org_id: orgId,
    role_name: role.name,
    hierarchy_level: role.level,
    is_leader: role.isLeader,
    is_trainer: false,
    color: role.color || ROLE_COLOR_KEYS[i % ROLE_COLOR_KEYS.length],
  }));

  const { error } = await supabase.from('org_roles').insert(roleInserts);

  if (error) {
    throw new Error(`Failed to save roles: ${error.message}`);
  }
}

/**
 * Step 3: Positions — create org positions and criteria.
 */
async function handlePositionsStep(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  orgId: string,
  data: { positions: PositionInput[] }
) {
  const { positions } = data;

  if (!positions || !Array.isArray(positions) || positions.length === 0) {
    throw new Error('At least one position is required');
  }

  // Delete existing positions + criteria for this org (cascade should handle criteria)
  await supabase.from('org_positions').delete().eq('org_id', orgId);

  const positionInserts = positions.map(pos => ({
    org_id: orgId,
    name: pos.name,
    zone: pos.zone,
    description: pos.description || null,
    display_order: pos.displayOrder,
    is_active: true,
    position_type: 'standard',
  }));

  const { data: createdPositions, error: posError } = await supabase
    .from('org_positions')
    .insert(positionInserts)
    .select('id, name');

  if (posError || !createdPositions) {
    throw new Error(`Failed to save positions: ${posError?.message}`);
  }

  // Insert criteria: use provided criteria if available, otherwise fall back to template
  const criteriaInserts: any[] = [];

  for (const dbPos of createdPositions) {
    const inputPos = positions.find(p => p.name === dbPos.name);
    const hasCriteria = inputPos?.criteria && inputPos.criteria.length > 0;

    if (hasCriteria) {
      // Use criteria provided by the user
      for (const c of inputPos!.criteria!) {
        if (c.name.trim()) {
          criteriaInserts.push({
            position_id: dbPos.id,
            criteria_order: c.criteria_order,
            name: c.name,
            description: c.description || '',
          });
        }
      }
    } else if (isTemplatePosition(dbPos.name)) {
      // Fall back to template criteria
      const templateCriteria = getTemplateCriteria(dbPos.name);
      for (const tc of templateCriteria) {
        criteriaInserts.push({
          position_id: dbPos.id,
          criteria_order: tc.criteria_order,
          name: tc.name,
          description: tc.description,
        });
      }
    }
  }

  if (criteriaInserts.length > 0) {
    const { error: critError } = await supabase
      .from('position_criteria')
      .insert(criteriaInserts);

    if (critError) {
      console.error('Failed to insert position criteria (non-fatal):', critError);
    }
  }
}

/**
 * Step 5: Discipline — insert infractions and actions rubric.
 */
async function handleDisciplineStep(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  orgId: string,
  data: {
    infractions: Array<{ name: string; points: number }>;
    actions: Array<{ name: string; pointsThreshold: number }>;
  }
) {
  const { infractions, actions } = data;

  // Get first location for this org (used as default scope)
  const { data: locations } = await supabase
    .from('locations')
    .select('id')
    .eq('org_id', orgId)
    .order('created_at')
    .limit(1);

  const locationId = locations?.[0]?.id || null;

  // Insert infractions
  if (infractions && infractions.length > 0) {
    const infractionInserts = infractions.map(inf => ({
      org_id: orgId,
      location_id: locationId,
      action: inf.name,
      points: inf.points,
    }));

    const { error } = await supabase.from('infractions_rubric').insert(infractionInserts);
    if (error) {
      console.error('Failed to insert infractions (non-fatal):', error);
    }
  }

  // Insert disciplinary actions
  if (actions && actions.length > 0) {
    const actionInserts = actions.map(act => ({
      org_id: orgId,
      location_id: locationId,
      action: act.name,
      points_threshold: act.pointsThreshold,
    }));

    const { error } = await supabase.from('disc_actions_rubric').insert(actionInserts);
    if (error) {
      console.error('Failed to insert disc actions (non-fatal):', error);
    }
  }
}

/**
 * Step 6: Employee Import — insert employees into the employees table.
 */
async function handleEmployeeImportStep(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  orgId: string,
  data: {
    employees: Array<{
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      role: string;
      isFoh: boolean;
      isBoh: boolean;
      isLeader: boolean;
      hsId?: string;
    }>;
  }
) {
  const { employees } = data;

  if (!employees || employees.length === 0) return;

  // Get first location for this org
  const { data: locations } = await supabase
    .from('locations')
    .select('id')
    .eq('org_id', orgId)
    .order('created_at')
    .limit(1);

  const locationId = locations?.[0]?.id || null;

  // Get the default (lowest-hierarchy) role for this org to use when no role is selected
  const { data: orgRoles } = await supabase
    .from('org_roles')
    .select('role_name, hierarchy_level')
    .eq('org_id', orgId)
    .order('hierarchy_level', { ascending: false })
    .limit(1);

  const defaultRole = orgRoles?.[0]?.role_name || 'Team Member';

  const employeeInserts = employees.map(emp => ({
    org_id: orgId,
    location_id: locationId,
    first_name: emp.firstName,
    last_name: emp.lastName,
    email: emp.email || null,
    phone: emp.phone || null,
    role: emp.role || defaultRole,
    is_foh: emp.isFoh,
    is_boh: emp.isBoh,
    hs_id: emp.hsId || null,
    active: true,
  }));

  const { error } = await supabase.from('employees').insert(employeeInserts);

  if (error) {
    throw new Error(`Failed to import employees: ${error.message}`);
  }
}

/**
 * Seed default permission profiles for a new org.
 * Creates system-default profiles for each hierarchy level with permissions
 * based on the default permission matrix.
 */
async function seedDefaultPermissionProfiles(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  orgId: string
) {
  // 1. Build sub-item map: "module.key" → sub_item_id
  const { data: subItems, error: subItemsError } = await supabase
    .from('permission_sub_items')
    .select(`
      id,
      key,
      module_id,
      permission_modules!inner (
        key
      )
    `);

  if (subItemsError || !subItems || subItems.length === 0) {
    console.error('No permission sub-items found — skipping profile seeding');
    return;
  }

  const subItemMap = new Map<string, string>();
  for (const item of subItems as any[]) {
    const fullKey = `${item.permission_modules.key}.${item.key}`;
    subItemMap.set(fullKey, item.id);
  }

  // 2. Get org roles and their hierarchy levels
  const { data: roles } = await supabase
    .from('org_roles')
    .select('role_name, hierarchy_level')
    .eq('org_id', orgId)
    .order('hierarchy_level', { ascending: true });

  // Build map of unique hierarchy levels → first role name at that level
  const rolesByLevel = new Map<number, string>();
  const hierarchyLevels = new Set<number>();

  if (roles && roles.length > 0) {
    for (const role of roles) {
      if (!hierarchyLevels.has(role.hierarchy_level)) {
        hierarchyLevels.add(role.hierarchy_level);
        rolesByLevel.set(role.hierarchy_level, role.role_name);
      }
    }
  }

  // Ensure we have at least levels 0–3
  for (let level = 0; level <= 3; level++) {
    hierarchyLevels.add(level);
  }

  const allPermissionKeys = Object.values(P);

  // 3. Create a profile + access records for each hierarchy level
  for (const level of Array.from(hierarchyLevels).sort((a, b) => a - b)) {
    const roleName = rolesByLevel.get(level) || null;
    const profileName = roleName || getDefaultProfileName(level);

    // Check if profile already exists (idempotent)
    const { data: existing } = await supabase
      .from('permission_profiles')
      .select('id')
      .eq('org_id', orgId)
      .eq('hierarchy_level', level)
      .eq('is_system_default', true)
      .maybeSingle();

    let profileId: string;

    if (existing) {
      profileId = existing.id;
    } else {
      const { data: profile, error: profileError } = await supabase
        .from('permission_profiles')
        .insert({
          org_id: orgId,
          name: profileName,
          hierarchy_level: level,
          linked_role_name: roleName,
          is_system_default: true,
        })
        .select('id')
        .single();

      if (profileError || !profile) {
        console.error(`Failed to create permission profile for level ${level}:`, profileError);
        continue;
      }

      profileId = profile.id;
    }

    // Get default permissions for this hierarchy level
    const defaultPermissions = getDefaultPermissions(level);

    // Build access records for every sub-item
    const accessRecords = allPermissionKeys
      .map((permKey) => {
        const subItemId = subItemMap.get(permKey);
        if (!subItemId) return null;

        return {
          profile_id: profileId,
          sub_item_id: subItemId,
          is_enabled: defaultPermissions.has(permKey),
        };
      })
      .filter(Boolean);

    // Upsert access records
    const { error: accessError } = await supabase
      .from('permission_profile_access')
      .upsert(accessRecords as any[], { onConflict: 'profile_id,sub_item_id' });

    if (accessError) {
      console.error(`Failed to create access records for level ${level}:`, accessError);
    }
  }

  console.log(`Seeded default permission profiles for org ${orgId}`);
}
