/**
 * Migrate existing evaluation form templates to mark Employee Name and Date
 * fields as system fields (isSystemField, required, defaultToCurrentDate).
 *
 * Finds fields by:
 * - Employee Name: data_select with dataSource 'employees', or fields labeled "Name"/"Employee Name"
 * - Date: fields with schema format 'date', or fieldType 'date'
 *
 * Usage: npx tsx scripts/migrate-eval-system-fields.ts
 */

import { config } from 'dotenv';
config({ path: 'apps/dashboard/.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // Fetch all evaluation form templates
  const { data: templates, error } = await supabase
    .from('form_templates')
    .select('id, name, org_id, schema, ui_schema, form_type')
    .eq('form_type', 'evaluation');

  if (error) {
    console.error('❌ Failed to fetch templates:', error.message);
    process.exit(1);
  }

  console.log(`📋 Found ${templates.length} evaluation template(s)\n`);

  for (const tmpl of templates) {
    console.log(`\n🔍 Processing: "${tmpl.name}" (${tmpl.id})`);

    const schema = tmpl.schema || {};
    const uiSchema = tmpl.ui_schema || {};
    const properties = schema.properties || {};
    const requiredFields = new Set<string>(schema.required || []);

    let updated = false;
    let employeeFieldId: string | null = null;
    let dateFieldId: string | null = null;

    // Scan all fields to find employee name and date fields
    for (const fieldId of Object.keys(properties)) {
      const prop = properties[fieldId];
      const meta = uiSchema[fieldId]?.['ui:fieldMeta'] || {};
      const widget = uiSchema[fieldId]?.['ui:widget'];
      const title = (prop.title || '').toLowerCase();

      // Already a system field? Skip
      if (meta.isSystemField) {
        console.log(`  ✅ ${fieldId} ("${prop.title}") — already a system field`);
        if (meta.dataSource === 'employees') employeeFieldId = fieldId;
        if (meta.fieldType === 'date' || prop.format === 'date') dateFieldId = fieldId;
        continue;
      }

      // Detect employee name field:
      // - data_select with employees datasource
      // - OR title matches "name" / "employee name" / "nombre"
      const isEmployeeField =
        meta.dataSource === 'employees' ||
        widget === 'data_select' && (title.includes('name') || title.includes('nombre')) ||
        (title === 'name' || title === 'employee name' || title === 'nombre' || title === 'nombre del empleado');

      if (isEmployeeField && !employeeFieldId) {
        employeeFieldId = fieldId;
        console.log(`  🏷️  Marking "${prop.title}" (${fieldId}) as system employee field`);

        // Ensure it's a data_select with employees datasource
        if (!uiSchema[fieldId]) uiSchema[fieldId] = {};
        if (!uiSchema[fieldId]['ui:fieldMeta']) uiSchema[fieldId]['ui:fieldMeta'] = {};
        uiSchema[fieldId]['ui:widget'] = 'data_select';
        uiSchema[fieldId]['ui:fieldMeta'].isSystemField = true;
        uiSchema[fieldId]['ui:fieldMeta'].dataSource = 'employees';
        uiSchema[fieldId]['ui:fieldMeta'].fieldType = uiSchema[fieldId]['ui:fieldMeta'].fieldType || 'select';

        // Ensure it's required
        requiredFields.add(fieldId);

        // Clear any enum from schema (employees are fetched at runtime)
        delete properties[fieldId].enum;
        delete properties[fieldId].enumNames;

        updated = true;
        continue;
      }

      // Detect date field:
      // - format: 'date' in schema
      // - OR fieldType 'date' in metadata
      // - OR title matches "date" / "fecha"
      const isDateField =
        prop.format === 'date' ||
        meta.fieldType === 'date' ||
        (title === 'date' || title === 'fecha');

      if (isDateField && !dateFieldId) {
        dateFieldId = fieldId;
        console.log(`  🏷️  Marking "${prop.title}" (${fieldId}) as system date field`);

        if (!uiSchema[fieldId]) uiSchema[fieldId] = {};
        if (!uiSchema[fieldId]['ui:fieldMeta']) uiSchema[fieldId]['ui:fieldMeta'] = {};
        uiSchema[fieldId]['ui:fieldMeta'].isSystemField = true;
        uiSchema[fieldId]['ui:fieldMeta'].defaultToCurrentDate = true;
        uiSchema[fieldId]['ui:fieldMeta'].fieldType = 'date';

        // Ensure schema has date format
        properties[fieldId].type = 'string';
        properties[fieldId].format = 'date';

        // Ensure it's required
        requiredFields.add(fieldId);

        updated = true;
        continue;
      }
    }

    if (!employeeFieldId) {
      console.log(`  ⚠️  No employee name field found — skipping`);
    }
    if (!dateFieldId) {
      console.log(`  ⚠️  No date field found — skipping`);
    }

    if (!updated) {
      console.log(`  ℹ️  No changes needed`);
      continue;
    }

    // Update the template
    const updatedSchema = {
      ...schema,
      properties,
      required: Array.from(requiredFields),
    };

    const { error: updateError } = await supabase
      .from('form_templates')
      .update({
        schema: updatedSchema,
        ui_schema: uiSchema,
      })
      .eq('id', tmpl.id);

    if (updateError) {
      console.error(`  ❌ Failed to update: ${updateError.message}`);
    } else {
      console.log(`  ✅ Updated successfully`);
    }
  }

  console.log('\n✅ Migration complete');
}

main().then(() => process.exit(0)).catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
