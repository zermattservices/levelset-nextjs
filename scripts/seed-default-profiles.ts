/**
 * Seed Default Permission Profiles
 * 
 * This script creates default permission profiles for all existing organizations
 * based on their role hierarchy and the default permission matrix
 * 
 * Run with: npx tsx scripts/seed-default-profiles.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import {
  P,
  getSubItemKey,
  getModuleKey,
} from '../lib/permissions/constants';
import {
  getDefaultPermissions,
  getDefaultProfileName,
} from '../lib/permissions/defaults';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface OrgRole {
  role_name: string;
  hierarchy_level: number;
}

interface SubItemWithModule {
  id: string;
  key: string;
  module_id: string;
  permission_modules: {
    key: string;
  };
}

async function getSubItemMap(): Promise<Map<string, string>> {
  // Get all sub-items with their module keys
  const { data: subItems, error } = await supabase
    .from('permission_sub_items')
    .select(`
      id,
      key,
      module_id,
      permission_modules!inner (
        key
      )
    `);

  if (error || !subItems) {
    console.error('Error fetching sub-items:', error);
    return new Map();
  }

  // Create map of "module.key" -> sub_item_id
  const subItemMap = new Map<string, string>();
  for (const item of subItems as any[]) {
    const fullKey = `${item.permission_modules.key}.${item.key}`;
    subItemMap.set(fullKey, item.id);
  }

  return subItemMap;
}

async function createProfileWithAccess(
  orgId: string,
  hierarchyLevel: number,
  roleName: string | null,
  isSystemDefault: boolean,
  subItemMap: Map<string, string>
): Promise<string | null> {
  // Use the role name as the profile name (permission levels should match role names)
  const profileName = roleName || getDefaultProfileName(hierarchyLevel);
  
  // Check if profile already exists
  const { data: existing } = await supabase
    .from('permission_profiles')
    .select('id')
    .eq('org_id', orgId)
    .eq('hierarchy_level', hierarchyLevel)
    .eq('is_system_default', isSystemDefault)
    .maybeSingle();

  let profileId: string;

  if (existing) {
    profileId = existing.id;
    console.log(`  Profile already exists: ${profileName} (Level ${hierarchyLevel})`);
  } else {
    // Create the profile
    const { data: profile, error: profileError } = await supabase
      .from('permission_profiles')
      .insert({
        org_id: orgId,
        name: profileName,
        hierarchy_level: hierarchyLevel,
        linked_role_name: roleName,
        is_system_default: isSystemDefault,
      })
      .select('id')
      .single();

    if (profileError || !profile) {
      console.error(`  Error creating profile ${profileName}:`, profileError);
      return null;
    }

    profileId = profile.id;
    console.log(`  ✓ Created profile: ${profileName} (Level ${hierarchyLevel})`);
  }

  // Get default permissions for this level
  const defaultPermissions = getDefaultPermissions(hierarchyLevel);

  // Create access records for all sub-items
  const allPermissionKeys = Object.values(P);
  const accessRecords = allPermissionKeys.map((permKey) => {
    const subItemId = subItemMap.get(permKey);
    if (!subItemId) {
      console.warn(`  Sub-item not found: ${permKey}`);
      return null;
    }

    return {
      profile_id: profileId,
      sub_item_id: subItemId,
      is_enabled: defaultPermissions.has(permKey),
    };
  }).filter(Boolean);

  // Upsert access records
  const { error: accessError } = await supabase
    .from('permission_profile_access')
    .upsert(accessRecords as any[], { onConflict: 'profile_id,sub_item_id' });

  if (accessError) {
    console.error(`  Error creating access records for ${profileName}:`, accessError);
    return null;
  }

  const enabledCount = Array.from(defaultPermissions).length;
  console.log(`    → Set ${enabledCount}/${allPermissionKeys.length} permissions enabled`);

  return profileId;
}

async function seedOrgProfiles(
  orgId: string,
  orgName: string,
  subItemMap: Map<string, string>
) {
  console.log(`\nProcessing organization: ${orgName} (${orgId})`);

  // Get all roles for this org
  const { data: roles, error: rolesError } = await supabase
    .from('org_roles')
    .select('role_name, hierarchy_level')
    .eq('org_id', orgId)
    .order('hierarchy_level', { ascending: true });

  if (rolesError) {
    console.error(`  Error fetching roles for org ${orgName}:`, rolesError);
    return;
  }

  // Create a set of unique hierarchy levels
  const hierarchyLevels = new Set<number>();
  const rolesByLevel = new Map<number, string>();

  if (roles && roles.length > 0) {
    for (const role of roles as OrgRole[]) {
      if (!hierarchyLevels.has(role.hierarchy_level)) {
        hierarchyLevels.add(role.hierarchy_level);
        rolesByLevel.set(role.hierarchy_level, role.role_name);
      }
    }
  }

  // Ensure we have at least levels 0, 1, 2, 3
  for (let level = 0; level <= 3; level++) {
    hierarchyLevels.add(level);
  }

  // Create profiles for each hierarchy level
  const sortedLevels = Array.from(hierarchyLevels).sort((a, b) => a - b);
  
  for (const level of sortedLevels) {
    const roleName = rolesByLevel.get(level) || null;
    await createProfileWithAccess(
      orgId,
      level,
      roleName,
      true, // is_system_default
      subItemMap
    );
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Default Permission Profiles Seeding');
  console.log('='.repeat(60));

  // Get sub-item map first
  console.log('\nFetching permission sub-items...');
  const subItemMap = await getSubItemMap();
  
  if (subItemMap.size === 0) {
    console.error('No sub-items found. Run seed-permission-modules.ts first.');
    process.exit(1);
  }
  
  console.log(`Found ${subItemMap.size} permission sub-items`);

  // Get all organizations
  console.log('\nFetching organizations...');
  const { data: orgs, error: orgsError } = await supabase
    .from('orgs')
    .select('id, name')
    .order('name');

  if (orgsError || !orgs) {
    console.error('Error fetching organizations:', orgsError);
    process.exit(1);
  }

  console.log(`Found ${orgs.length} organizations`);

  // Seed profiles for each org
  for (const org of orgs) {
    await seedOrgProfiles(org.id, org.name || 'Unknown', subItemMap);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Seeding complete!');
  console.log('='.repeat(60));
}

main().catch(console.error);
