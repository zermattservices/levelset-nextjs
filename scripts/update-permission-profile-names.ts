/**
 * Update Permission Profile Names
 * 
 * This script updates existing permission profiles to use the actual role names
 * instead of generic names like "Full Access", "Manager Access", etc.
 * 
 * Run with: npx tsx scripts/update-permission-profile-names.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updatePermissionProfileNames() {
  console.log('Updating permission profile names to use role names...\n');

  try {
    // Get all organizations
    const { data: orgs, error: orgsError } = await supabase
      .from('orgs')
      .select('id, name');

    if (orgsError) throw orgsError;

    console.log(`Found ${orgs?.length || 0} organizations\n`);

    for (const org of orgs || []) {
      console.log(`\nProcessing organization: ${org.name} (${org.id})`);

      // Get org roles with hierarchy levels
      const { data: roles, error: rolesError } = await supabase
        .from('org_roles')
        .select('role_name, hierarchy_level')
        .eq('org_id', org.id)
        .order('hierarchy_level');

      if (rolesError) {
        console.error(`  Error fetching roles:`, rolesError);
        continue;
      }

      // Create a map of hierarchy level to role name
      const levelToRole = new Map<number, string>();
      for (const role of roles || []) {
        // Only use the first role for each level (in case of duplicates)
        if (!levelToRole.has(role.hierarchy_level)) {
          levelToRole.set(role.hierarchy_level, role.role_name);
        }
      }

      console.log(`  Found ${roles?.length || 0} roles`);

      // Get permission profiles for this org
      const { data: profiles, error: profilesError } = await supabase
        .from('permission_profiles')
        .select('id, name, hierarchy_level, linked_role_name, is_system_default')
        .eq('org_id', org.id);

      if (profilesError) {
        console.error(`  Error fetching profiles:`, profilesError);
        continue;
      }

      console.log(`  Found ${profiles?.length || 0} permission profiles`);

      // Update each system default profile to use the role name
      for (const profile of profiles || []) {
        if (!profile.is_system_default) {
          console.log(`    Skipping custom profile: ${profile.name}`);
          continue;
        }

        const roleName = levelToRole.get(profile.hierarchy_level);
        
        if (!roleName) {
          console.log(`    No role found for level ${profile.hierarchy_level}, keeping: ${profile.name}`);
          continue;
        }

        if (profile.name === roleName && profile.linked_role_name === roleName) {
          console.log(`    Profile already correct: ${profile.name}`);
          continue;
        }

        // Update the profile name and linked_role_name
        const { error: updateError } = await supabase
          .from('permission_profiles')
          .update({
            name: roleName,
            linked_role_name: roleName,
          })
          .eq('id', profile.id);

        if (updateError) {
          console.error(`    Error updating profile ${profile.id}:`, updateError);
        } else {
          console.log(`    ✓ Updated: "${profile.name}" → "${roleName}"`);
        }
      }
    }

    console.log('\n\nDone!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updatePermissionProfileNames();
