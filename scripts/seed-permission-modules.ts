/**
 * Seed Permission Modules and Sub-Items
 * 
 * This script populates the permission_modules and permission_sub_items tables
 * with all the permission definitions from constants.ts
 * 
 * Run with: npx tsx scripts/seed-permission-modules.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import {
  PERMISSION_MODULES,
  MODULE_METADATA,
  SUB_ITEM_METADATA,
  P,
  getSubItemKey,
  getModuleKey,
} from '../apps/dashboard/lib/permissions/constants';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedModules() {
  console.log('Seeding permission modules...');

  const moduleEntries = Object.entries(PERMISSION_MODULES);
  
  for (const [, moduleKey] of moduleEntries) {
    const metadata = MODULE_METADATA[moduleKey];
    
    if (!metadata) {
      console.warn(`No metadata found for module: ${moduleKey}`);
      continue;
    }

    // Upsert module
    const { error } = await supabase
      .from('permission_modules')
      .upsert(
        {
          key: moduleKey,
          name: metadata.name,
          description: metadata.description,
          display_order: metadata.order,
          is_active: true,
        },
        { onConflict: 'key' }
      );

    if (error) {
      console.error(`Error seeding module ${moduleKey}:`, error);
    } else {
      console.log(`✓ Seeded module: ${metadata.name}`);
    }
  }
}

async function seedSubItems() {
  console.log('\nSeeding permission sub-items...');

  // First, get all module IDs
  const { data: modules, error: modulesError } = await supabase
    .from('permission_modules')
    .select('id, key');

  if (modulesError || !modules) {
    console.error('Error fetching modules:', modulesError);
    return;
  }

  const moduleMap = new Map(modules.map((m) => [m.key, m.id]));

  // Seed all sub-items (without dependencies first)
  const permissionKeys = Object.values(P);
  
  for (const permissionKey of permissionKeys) {
    const metadata = SUB_ITEM_METADATA[permissionKey];
    
    if (!metadata) {
      console.warn(`No metadata found for permission: ${permissionKey}`);
      continue;
    }

    const moduleKey = getModuleKey(permissionKey);
    const subItemKey = getSubItemKey(permissionKey);
    const moduleId = moduleMap.get(moduleKey);

    if (!moduleId) {
      console.error(`Module not found for permission: ${permissionKey}`);
      continue;
    }

    // First insert without dependency reference
    const { error } = await supabase
      .from('permission_sub_items')
      .upsert(
        {
          module_id: moduleId,
          key: subItemKey,
          name: metadata.name,
          description: metadata.description,
          display_order: metadata.order,
          // Don't set requires_sub_item_id yet
        },
        { onConflict: 'module_id,key' }
      );

    if (error) {
      console.error(`Error seeding sub-item ${permissionKey}:`, error);
    } else {
      console.log(`✓ Seeded sub-item: ${metadata.name}`);
    }
  }

  // Now update dependencies
  console.log('\nUpdating permission dependencies...');
  
  for (const permissionKey of permissionKeys) {
    const metadata = SUB_ITEM_METADATA[permissionKey];
    
    if (!metadata?.dependsOn) continue;

    const moduleKey = getModuleKey(permissionKey);
    const subItemKey = getSubItemKey(permissionKey);
    const moduleId = moduleMap.get(moduleKey);

    // Get the dependency sub-item ID
    const depModuleKey = getModuleKey(metadata.dependsOn);
    const depSubItemKey = getSubItemKey(metadata.dependsOn);
    const depModuleId = moduleMap.get(depModuleKey);

    if (!moduleId || !depModuleId) {
      console.error(`Module not found for dependency: ${permissionKey} -> ${metadata.dependsOn}`);
      continue;
    }

    // Find the dependency sub-item
    const { data: depSubItem, error: depError } = await supabase
      .from('permission_sub_items')
      .select('id')
      .eq('module_id', depModuleId)
      .eq('key', depSubItemKey)
      .maybeSingle();

    if (depError || !depSubItem) {
      console.error(`Dependency sub-item not found: ${metadata.dependsOn}`, depError);
      continue;
    }

    // Update the sub-item with the dependency reference
    const { error: updateError } = await supabase
      .from('permission_sub_items')
      .update({ requires_sub_item_id: depSubItem.id })
      .eq('module_id', moduleId)
      .eq('key', subItemKey);

    if (updateError) {
      console.error(`Error updating dependency for ${permissionKey}:`, updateError);
    } else {
      console.log(`✓ Set dependency: ${permissionKey} -> ${metadata.dependsOn}`);
    }
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('Permission Modules and Sub-Items Seeding');
  console.log('='.repeat(60));

  await seedModules();
  await seedSubItems();

  console.log('\n' + '='.repeat(60));
  console.log('Seeding complete!');
  console.log('='.repeat(60));
}

main().catch(console.error);
