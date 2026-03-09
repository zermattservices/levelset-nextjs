import type { NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { withPermissionAndContext, AuthenticatedRequest } from '@/lib/permissions/middleware';
import { P } from '@/lib/permissions/constants';
import { getDefaultPermissions } from '@/lib/permissions/defaults';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  context: { orgId: string; userId: string }
) {
  const supabase = createServerSupabaseClient();
  const { orgId } = context;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { intent, ...payload } = req.body;

  try {
    switch (intent) {
      case 'add_role':
        return await addRole(res, supabase, orgId, payload);
      case 'reorder_roles':
        return await reorderRoles(res, supabase, orgId, payload);
      default:
        return res.status(400).json({ error: `Unknown intent: ${intent}` });
    }
  } catch (err: any) {
    console.error('Roles API error:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}

export default withPermissionAndContext(P.ROLES_MANAGE, handler);

// ---------------------------------------------------------------------------
// Add role + create matching permission profile
// ---------------------------------------------------------------------------
async function addRole(
  res: NextApiResponse,
  supabase: any,
  orgId: string,
  payload: any
) {
  const { role_name, hierarchy_level, is_leader, is_trainer, color } = payload;

  if (!role_name || hierarchy_level === undefined) {
    return res.status(400).json({ error: 'role_name and hierarchy_level are required' });
  }

  // Insert the role
  const { data: role, error: roleError } = await supabase
    .from('org_roles')
    .insert({
      org_id: orgId,
      role_name,
      hierarchy_level,
      is_leader: is_leader || false,
      is_trainer: is_trainer || false,
      color: color || 'blue',
    })
    .select()
    .single();

  if (roleError) {
    return res.status(500).json({ error: roleError.message });
  }

  // Create matching permission profile
  const profileError = await createPermissionProfileForRole(supabase, orgId, role_name, hierarchy_level);
  if (profileError) {
    console.error('Failed to create permission profile for new role:', profileError);
    // Don't fail the whole request — role was created successfully
  }

  return res.status(201).json(role);
}

// ---------------------------------------------------------------------------
// Reorder roles atomically using temp offset to avoid unique constraint
// ---------------------------------------------------------------------------
async function reorderRoles(
  res: NextApiResponse,
  supabase: any,
  orgId: string,
  payload: any
) {
  const { role_ids } = payload;

  if (!Array.isArray(role_ids) || role_ids.length === 0) {
    return res.status(400).json({ error: 'role_ids array is required' });
  }

  // Build SQL that moves all to temp values first, then sets final values
  // This avoids UNIQUE (org_id, hierarchy_level) conflicts
  const tempOffset = 1000;
  const statements: string[] = [];

  // Phase 1: move all to temp high values
  role_ids.forEach((id: string, index: number) => {
    statements.push(
      `UPDATE org_roles SET hierarchy_level = ${tempOffset + index}, updated_at = NOW() WHERE id = '${id}' AND org_id = '${orgId}';`
    );
  });

  // Phase 2: set correct values
  role_ids.forEach((id: string, index: number) => {
    statements.push(
      `UPDATE org_roles SET hierarchy_level = ${index} WHERE id = '${id}' AND org_id = '${orgId}';`
    );
  });

  // Also update permission_profiles to keep hierarchy_level in sync
  // First get current role data to map role_name -> new level
  const { data: roles } = await supabase
    .from('org_roles')
    .select('id, role_name')
    .eq('org_id', orgId)
    .in('id', role_ids);

  if (roles) {
    const roleMap = new Map<string, string>(roles.map((r: any) => [r.id, r.role_name]));

    // Move profiles to temp values first
    role_ids.forEach((id: string, index: number) => {
      const roleName = roleMap.get(id);
      if (roleName) {
        statements.push(
          `UPDATE permission_profiles SET hierarchy_level = ${tempOffset + index}, updated_at = NOW() WHERE org_id = '${orgId}' AND linked_role_name = '${roleName.replace(/'/g, "''")}' AND is_system_default = true;`
        );
      }
    });

    // Set final values
    role_ids.forEach((id: string, index: number) => {
      const roleName = roleMap.get(id);
      if (roleName) {
        statements.push(
          `UPDATE permission_profiles SET hierarchy_level = ${index} WHERE org_id = '${orgId}' AND linked_role_name = '${roleName.replace(/'/g, "''")}' AND is_system_default = true;`
        );
      }
    });
  }

  // Execute all in a single transaction via rpc or raw SQL
  const sql = `BEGIN;\n${statements.join('\n')}\nCOMMIT;`;

  const { error } = await supabase.rpc('exec_sql', { sql_text: sql });

  if (error) {
    // Fallback: try sequential updates with temp offset if rpc doesn't exist
    if (error.message?.includes('function') || error.code === '42883') {
      return await reorderRolesFallback(res, supabase, orgId, role_ids, roles);
    }
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ success: true });
}

// Fallback: sequential updates using temp offset (no raw SQL rpc needed)
async function reorderRolesFallback(
  res: NextApiResponse,
  supabase: any,
  orgId: string,
  roleIds: string[],
  roles: any[]
) {
  const tempOffset = 1000;
  const roleMap = new Map((roles || []).map((r: any) => [r.id, r.role_name]));

  // Phase 1: move all roles to temp high values
  for (let i = 0; i < roleIds.length; i++) {
    const { error } = await supabase
      .from('org_roles')
      .update({ hierarchy_level: tempOffset + i, updated_at: new Date().toISOString() })
      .eq('id', roleIds[i])
      .eq('org_id', orgId);
    if (error) return res.status(500).json({ error: error.message });
  }

  // Phase 2: set correct values
  for (let i = 0; i < roleIds.length; i++) {
    const { error } = await supabase
      .from('org_roles')
      .update({ hierarchy_level: i, updated_at: new Date().toISOString() })
      .eq('id', roleIds[i])
      .eq('org_id', orgId);
    if (error) return res.status(500).json({ error: error.message });
  }

  // Phase 3: sync permission_profiles hierarchy levels
  for (let i = 0; i < roleIds.length; i++) {
    const roleName = roleMap.get(roleIds[i]);
    if (roleName) {
      // Move to temp first
      await supabase
        .from('permission_profiles')
        .update({ hierarchy_level: tempOffset + i, updated_at: new Date().toISOString() })
        .eq('org_id', orgId)
        .eq('linked_role_name', roleName)
        .eq('is_system_default', true);
    }
  }

  for (let i = 0; i < roleIds.length; i++) {
    const roleName = roleMap.get(roleIds[i]);
    if (roleName) {
      await supabase
        .from('permission_profiles')
        .update({ hierarchy_level: i, updated_at: new Date().toISOString() })
        .eq('org_id', orgId)
        .eq('linked_role_name', roleName)
        .eq('is_system_default', true);
    }
  }

  return res.status(200).json({ success: true });
}

// ---------------------------------------------------------------------------
// Create a permission profile for a newly added role
// ---------------------------------------------------------------------------
async function createPermissionProfileForRole(
  supabase: any,
  orgId: string,
  roleName: string,
  hierarchyLevel: number
): Promise<string | null> {
  // Check if profile already exists
  const { data: existing } = await supabase
    .from('permission_profiles')
    .select('id')
    .eq('org_id', orgId)
    .eq('linked_role_name', roleName)
    .eq('is_system_default', true)
    .maybeSingle();

  if (existing) return null; // already exists

  // Create profile
  const { data: profile, error: profileError } = await supabase
    .from('permission_profiles')
    .insert({
      org_id: orgId,
      name: roleName,
      hierarchy_level: hierarchyLevel,
      linked_role_name: roleName,
      is_system_default: true,
    })
    .select('id')
    .single();

  if (profileError || !profile) {
    return profileError?.message || 'Failed to create profile';
  }

  // Get all permission sub-items
  const { data: subItems } = await supabase
    .from('permission_sub_items')
    .select(`id, key, module_id, permission_modules!inner ( key )`);

  if (!subItems || subItems.length === 0) return null;

  // Build sub-item map
  const subItemMap = new Map<string, string>();
  for (const item of subItems as any[]) {
    const fullKey = `${item.permission_modules.key}.${item.key}`;
    subItemMap.set(fullKey, item.id);
  }

  // Get default permissions for this hierarchy level
  const defaultPermissions = getDefaultPermissions(hierarchyLevel);
  const allPermissionKeys = Object.values(P);

  const accessRecords = allPermissionKeys
    .map((permKey) => {
      const subItemId = subItemMap.get(permKey);
      if (!subItemId) return null;
      return {
        profile_id: profile.id,
        sub_item_id: subItemId,
        is_enabled: defaultPermissions.has(permKey),
      };
    })
    .filter(Boolean);

  const { error: accessError } = await supabase
    .from('permission_profile_access')
    .upsert(accessRecords as any[], { onConflict: 'profile_id,sub_item_id' });

  if (accessError) {
    return accessError.message;
  }

  return null;
}
