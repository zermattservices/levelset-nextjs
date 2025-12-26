/**
 * Create Administrator Profiles
 * 
 * Creates Administrator 1 and Administrator 2 profiles for each organization.
 * - Administrator 1: Same permissions as tier 1 (Executive/Manager level)
 * - Administrator 2: Same permissions as tier 3 (Team Member level)
 * 
 * Run with: npx tsx scripts/create-admin-profiles.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { DEFAULT_PERMISSIONS } from '../lib/permissions/defaults';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Admin profile configurations
// hierarchy_level is used for permission defaults, but these profiles are not tied to roles
const ADMIN_PROFILES = [
  {
    name: 'Administrator 1',
    permissionLevel: 1, // Same permissions as level 1 (Executive/Manager)
    displayOrder: 100,  // High number to sort after employee roles
  },
  {
    name: 'Administrator 2',
    permissionLevel: 3, // Same permissions as level 3 (Team Member)
    displayOrder: 101,
  },
];

async function createAdminProfiles() {
  console.log('Creating Administrator profiles for all organizations...\n');

  try {
    // Get all organizations
    const { data: orgs, error: orgsError } = await supabase
      .from('orgs')
      .select('id, name');

    if (orgsError) throw orgsError;

    console.log(`Found ${orgs?.length || 0} organizations\n`);

    // Get all permission sub-items to create access records
    const { data: subItems, error: subItemsError } = await supabase
      .from('permission_sub_items')
      .select('id, key, module_id, permission_modules!inner(key)');

    if (subItemsError) throw subItemsError;

    console.log(`Found ${subItems?.length || 0} permission sub-items\n`);

    for (const org of orgs || []) {
      console.log(`\nProcessing organization: ${org.name}`);

      for (const adminConfig of ADMIN_PROFILES) {
        // Check if this admin profile already exists
        const { data: existing } = await supabase
          .from('permission_profiles')
          .select('id')
          .eq('org_id', org.id)
          .eq('name', adminConfig.name)
          .eq('is_admin_profile', true)
          .single();

        if (existing) {
          console.log(`  ✓ ${adminConfig.name} already exists`);
          continue;
        }

        // Create the admin profile
        const { data: profile, error: profileError } = await supabase
          .from('permission_profiles')
          .insert({
            org_id: org.id,
            name: adminConfig.name,
            hierarchy_level: adminConfig.displayOrder, // Use high number for sorting
            linked_role_name: null, // Not tied to a role
            is_system_default: true, // System-created
            is_admin_profile: true,
          })
          .select('id')
          .single();

        if (profileError) {
          console.error(`  Error creating ${adminConfig.name}:`, profileError);
          continue;
        }

        console.log(`  ✓ Created ${adminConfig.name}`);

        // Get default permissions for this level
        const defaultPerms = DEFAULT_PERMISSIONS[
          adminConfig.permissionLevel as keyof typeof DEFAULT_PERMISSIONS
        ] || new Set();

        // Create permission access records
        const accessRecords = (subItems || []).map((item: any) => {
          const moduleKey = item.permission_modules?.key || '';
          const subItemKey = item.key;
          const fullKey = `${moduleKey}.${subItemKey}`;
          
          return {
            profile_id: profile.id,
            sub_item_id: item.id,
            is_enabled: defaultPerms.has(fullKey as any),
          };
        });

        const { error: accessError } = await supabase
          .from('permission_profile_access')
          .insert(accessRecords);

        if (accessError) {
          console.error(`    Error creating access records:`, accessError);
        } else {
          const enabledCount = accessRecords.filter(r => r.is_enabled).length;
          console.log(`    Added ${enabledCount}/${accessRecords.length} permissions enabled`);
        }
      }
    }

    console.log('\n\nDone!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createAdminProfiles();
