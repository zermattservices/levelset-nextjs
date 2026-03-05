// scripts/migrate-levelset-fields-to-select.ts

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FIELD_TYPE_TO_DATA_SOURCE: Record<string, string> = {
  employee_select: 'employees',
  leader_select: 'leaders',
  position_select: 'positions',
  infraction_select: 'infractions',
  disc_action_select: 'disc_actions',
};

const OLD_WIDGET_NAMES = new Set([
  'employee_select',
  'leader_select',
  'position_select',
  'infraction_select',
  'disc_action_select',
]);

async function migrateTemplates() {
  console.log('Fetching all form_templates...');

  const { data: templates, error } = await supabase
    .from('form_templates')
    .select('id, name, org_id, schema, ui_schema')
    .order('created_at');

  if (error) {
    console.error('Failed to fetch templates:', error.message);
    process.exit(1);
  }

  if (!templates || templates.length === 0) {
    console.log('No templates found.');
    return;
  }

  console.log(`Found ${templates.length} templates. Scanning for Levelset fields...`);

  let migratedCount = 0;

  for (const template of templates) {
    const schema = template.schema || {};
    const uiSchema = template.ui_schema || {};
    const properties = schema.properties || {};
    const fieldOrder: string[] = uiSchema['ui:order'] || Object.keys(properties);

    let needsMigration = false;

    // Check if any fields use old Levelset types
    for (const fieldId of fieldOrder) {
      const fieldUi = uiSchema[fieldId] || {};
      const meta = fieldUi['ui:fieldMeta'] || {};
      const widget = fieldUi['ui:widget'];

      if (OLD_WIDGET_NAMES.has(widget) || OLD_WIDGET_NAMES.has(meta.fieldType)) {
        needsMigration = true;
        break;
      }
    }

    if (!needsMigration) continue;

    console.log(`  Migrating: "${template.name}" (${template.id})`);

    // Deep clone to avoid mutation
    const newSchema = JSON.parse(JSON.stringify(schema));
    const newUiSchema = JSON.parse(JSON.stringify(uiSchema));

    for (const fieldId of fieldOrder) {
      const fieldUi = newUiSchema[fieldId] || {};
      const meta = fieldUi['ui:fieldMeta'] || {};
      const oldType = meta.fieldType || fieldUi['ui:widget'];

      if (!oldType || !FIELD_TYPE_TO_DATA_SOURCE[oldType]) continue;

      const dataSource = FIELD_TYPE_TO_DATA_SOURCE[oldType];

      // Update fieldMeta
      if (!newUiSchema[fieldId]) newUiSchema[fieldId] = {};
      if (!newUiSchema[fieldId]['ui:fieldMeta']) newUiSchema[fieldId]['ui:fieldMeta'] = {};
      newUiSchema[fieldId]['ui:fieldMeta'].fieldType = 'select';
      newUiSchema[fieldId]['ui:fieldMeta'].dataSource = dataSource;

      // Update widget
      newUiSchema[fieldId]['ui:widget'] = 'data_select';

      // Preserve maxHierarchyLevel for leaders
      if (oldType === 'leader_select' && meta.maxHierarchyLevel !== undefined) {
        newUiSchema[fieldId]['ui:fieldMeta'].maxHierarchyLevel = meta.maxHierarchyLevel;
      }

      console.log(`    Field ${fieldId}: ${oldType} -> select (dataSource: ${dataSource})`);
    }

    // Save updated template
    const { error: updateError } = await supabase
      .from('form_templates')
      .update({
        schema: newSchema,
        ui_schema: newUiSchema,
      })
      .eq('id', template.id);

    if (updateError) {
      console.error(`    ERROR updating ${template.id}:`, updateError.message);
    } else {
      migratedCount++;
      console.log(`    OK`);
    }
  }

  console.log(`\nDone. Migrated ${migratedCount} templates.`);
}

migrateTemplates().catch(console.error);
