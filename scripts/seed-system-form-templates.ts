/**
 * Seed System Form Templates
 *
 * Creates default form templates for each organization's system form groups:
 * 1. Positional Excellence Rating — in the positional_excellence group
 * 2. Discipline Infraction — in the discipline group
 * 3. Discipline Action — in the discipline group
 *
 * Each template is built with proper JSON Schema + UI Schema and
 * settings.field_mappings wired for dual-write to legacy tables.
 *
 * Run with: npx tsx scripts/seed-system-form-templates.ts
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ── Slug utility (inlined to avoid cross-package import issues) ────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

// ── Inline schema builder (to avoid cross-package import issues) ──────

/** Field type definitions matching apps/dashboard/lib/forms/field-palette.ts */
const FIELD_DEFS: Record<string, { schema: Record<string, any>; uiWidget?: string; uiOptions?: Record<string, any> }> = {
  employee_select: { schema: { type: 'string' }, uiWidget: 'employee_select' },
  leader_select: { schema: { type: 'string' }, uiWidget: 'leader_select' },
  position_select: { schema: { type: 'string' }, uiWidget: 'position_select' },
  infraction_select: { schema: { type: 'string' }, uiWidget: 'infraction_select' },
  disc_action_select: { schema: { type: 'string' }, uiWidget: 'disc_action_select' },
  rating_1_3: {
    schema: { type: 'integer', minimum: 1, maximum: 3, enum: [1, 2, 3] },
    uiWidget: 'ratingScale',
  },
  textarea: { schema: { type: 'string' }, uiWidget: 'textarea', uiOptions: { rows: 3 } },
  date: { schema: { type: 'string', format: 'date' } },
  true_false: { schema: { type: 'boolean' } },
  signature: { schema: { type: 'string' }, uiWidget: 'signature' },
};

interface SimpleField {
  id: string;
  type: string;
  label: string;
  labelEs: string;
  required: boolean;
  rows?: number;
}

let fieldCounter = 0;

function generateFieldId(): string {
  fieldCounter++;
  return `field_sys_${Date.now()}_${fieldCounter}_${Math.random().toString(36).substring(2, 6)}`;
}

function buildSchema(fields: SimpleField[]): { schema: Record<string, any>; uiSchema: Record<string, any> } {
  const properties: Record<string, any> = {};
  const required: string[] = [];
  const uiSchema: Record<string, any> = { 'ui:order': [] as string[] };

  for (const field of fields) {
    const def = FIELD_DEFS[field.type];
    if (!def) {
      console.warn(`Unknown field type: ${field.type}, skipping`);
      continue;
    }

    properties[field.id] = {
      ...JSON.parse(JSON.stringify(def.schema)),
      title: field.label,
    };

    const fieldUi: Record<string, any> = {};
    if (def.uiWidget) {
      fieldUi['ui:widget'] = def.uiWidget;
    }
    if (field.type === 'textarea') {
      fieldUi['ui:options'] = { rows: field.rows || 3 };
    }
    fieldUi['ui:fieldMeta'] = {
      fieldType: field.type,
      labelEs: field.labelEs,
    };

    if (Object.keys(fieldUi).length > 0) {
      uiSchema[field.id] = fieldUi;
    }

    if (field.required) {
      required.push(field.id);
    }

    uiSchema['ui:order'].push(field.id);
  }

  const schema: Record<string, any> = { type: 'object', properties };
  if (required.length > 0) {
    schema.required = required;
  }

  return { schema, uiSchema };
}

// ── Template definitions ──────────────────────────────────────────────

function buildRatingFields(requireNotes: boolean): SimpleField[] {
  return [
    { id: generateFieldId(), type: 'employee_select', label: 'Employee', labelEs: 'Empleado', required: true },
    { id: generateFieldId(), type: 'leader_select', label: 'Leader', labelEs: 'Líder', required: true },
    { id: generateFieldId(), type: 'position_select', label: 'Position', labelEs: 'Posición', required: true },
    { id: generateFieldId(), type: 'rating_1_3', label: 'Rating 1', labelEs: 'Calificación 1', required: true },
    { id: generateFieldId(), type: 'rating_1_3', label: 'Rating 2', labelEs: 'Calificación 2', required: true },
    { id: generateFieldId(), type: 'rating_1_3', label: 'Rating 3', labelEs: 'Calificación 3', required: true },
    { id: generateFieldId(), type: 'rating_1_3', label: 'Rating 4', labelEs: 'Calificación 4', required: true },
    { id: generateFieldId(), type: 'rating_1_3', label: 'Rating 5', labelEs: 'Calificación 5', required: true },
    { id: generateFieldId(), type: 'textarea', label: 'Notes', labelEs: 'Notas', required: requireNotes, rows: 3 },
  ];
}

function buildInfractionFields(): SimpleField[] {
  return [
    { id: generateFieldId(), type: 'employee_select', label: 'Employee', labelEs: 'Empleado', required: true },
    { id: generateFieldId(), type: 'leader_select', label: 'Leader', labelEs: 'Líder', required: true },
    { id: generateFieldId(), type: 'infraction_select', label: 'Infraction Type', labelEs: 'Tipo de Infracción', required: true },
    { id: generateFieldId(), type: 'date', label: 'Infraction Date', labelEs: 'Fecha de Infracción', required: false },
    { id: generateFieldId(), type: 'true_false', label: 'Acknowledged', labelEs: 'Notificado', required: false },
    { id: generateFieldId(), type: 'textarea', label: 'Notes', labelEs: 'Notas', required: false, rows: 3 },
    { id: generateFieldId(), type: 'signature', label: 'Team Member Signature', labelEs: 'Firma del Miembro del Equipo', required: false },
    { id: generateFieldId(), type: 'signature', label: 'Leader Signature', labelEs: 'Firma del Líder', required: true },
  ];
}

function buildDiscActionFields(): SimpleField[] {
  return [
    { id: generateFieldId(), type: 'employee_select', label: 'Employee', labelEs: 'Empleado', required: true },
    { id: generateFieldId(), type: 'leader_select', label: 'Acting Leader', labelEs: 'Líder Actuante', required: true },
    { id: generateFieldId(), type: 'disc_action_select', label: 'Action Type', labelEs: 'Tipo de Acción', required: true },
    { id: generateFieldId(), type: 'date', label: 'Action Date', labelEs: 'Fecha de Acción', required: true },
    { id: generateFieldId(), type: 'textarea', label: 'Notes', labelEs: 'Notas', required: false, rows: 3 },
  ];
}

// ── Main ──────────────────────────────────────────────────────────────

interface TemplateDefinition {
  name: string;
  name_es: string;
  description: string;
  description_es: string;
  form_type: string;
  groupSlug: string;
  buildFields: (...args: any[]) => SimpleField[];
  buildMappings: (fields: SimpleField[]) => Record<string, any>;
}

const TEMPLATE_DEFS: TemplateDefinition[] = [
  {
    name: 'Positional Excellence Rating',
    name_es: 'Calificación de Excelencia Posicional',
    description: 'Standard positional excellence rating form',
    description_es: 'Formulario estándar de calificación de excelencia posicional',
    form_type: 'rating',
    groupSlug: 'positional_excellence',
    buildFields: buildRatingFields,
    buildMappings: (fields) => ({
      employee_id: fields[0].id,
      leader_id: fields[1].id,
      position: fields[2].id,
      ratings: [fields[3].id, fields[4].id, fields[5].id, fields[6].id, fields[7].id],
      notes: fields[8].id,
    }),
  },
  {
    name: 'Discipline Infraction',
    name_es: 'Infracción Disciplinaria',
    description: 'Standard discipline infraction form with signatures',
    description_es: 'Formulario estándar de infracción disciplinaria con firmas',
    form_type: 'discipline',
    groupSlug: 'discipline',
    buildFields: buildInfractionFields,
    buildMappings: (fields) => ({
      employee_id: fields[0].id,
      leader_id: fields[1].id,
      infraction_id: fields[2].id,
      infraction_date: fields[3].id,
      acknowledged: fields[4].id,
      notes: fields[5].id,
      team_member_signature: fields[6].id,
      leader_signature: fields[7].id,
    }),
  },
  {
    name: 'Discipline Action',
    name_es: 'Acción Disciplinaria',
    description: 'Record a disciplinary action taken on an employee',
    description_es: 'Registrar una acción disciplinaria tomada sobre un empleado',
    form_type: 'discipline',
    groupSlug: 'discipline',
    buildFields: buildDiscActionFields,
    buildMappings: (fields) => ({
      employee_id: fields[0].id,
      acting_leader: fields[1].id,
      action_id: fields[2].id,
      action_date: fields[3].id,
      notes: fields[4].id,
    }),
  },
];

async function seedSystemFormTemplates() {
  console.log('Fetching organizations...');

  const { data: orgs, error: orgsError } = await supabase
    .from('orgs')
    .select('id, name');

  if (orgsError) {
    console.error('Error fetching orgs:', orgsError.message);
    process.exit(1);
  }

  if (!orgs || orgs.length === 0) {
    console.log('No organizations found.');
    return;
  }

  console.log(`Found ${orgs.length} organization(s). Seeding system form templates...\n`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const org of orgs) {
    console.log(`Processing: ${org.name}`);

    // Get org feature toggles for rating notes requirement
    const { data: toggles } = await supabase
      .from('org_feature_toggles')
      .select('require_rating_comments')
      .eq('org_id', org.id)
      .maybeSingle();

    const requireNotes = toggles?.require_rating_comments ?? false;

    // Get all system form groups for this org
    const { data: groups } = await supabase
      .from('form_groups')
      .select('id, slug')
      .eq('org_id', org.id)
      .eq('is_system', true);

    if (!groups || groups.length === 0) {
      console.log(`  ⚠ No system form groups found — run seed-form-groups.ts first`);
      continue;
    }

    const groupBySlug = new Map(groups.map((g: any) => [g.slug, g.id]));

    for (const templateDef of TEMPLATE_DEFS) {
      const groupId = groupBySlug.get(templateDef.groupSlug);
      if (!groupId) {
        console.log(`  ⚠ Group "${templateDef.groupSlug}" not found, skipping "${templateDef.name}"`);
        continue;
      }

      // Build fields — pass requireNotes for rating form
      const fields = templateDef.groupSlug === 'positional_excellence'
        ? templateDef.buildFields(requireNotes)
        : templateDef.buildFields();

      const { schema, uiSchema } = buildSchema(fields);
      const fieldMappings = templateDef.buildMappings(fields);

      // Check if a system template with this name already exists
      const { data: existing } = await supabase
        .from('form_templates')
        .select('id')
        .eq('org_id', org.id)
        .eq('group_id', groupId)
        .eq('name', templateDef.name)
        .eq('is_system', true)
        .maybeSingle();

      if (existing) {
        // Update existing template with latest schema, ui_schema, settings, description
        const { error: updateError } = await supabase
          .from('form_templates')
          .update({
            description: templateDef.description,
            description_es: templateDef.description_es,
            schema,
            ui_schema: uiSchema,
            settings: { field_mappings: fieldMappings },
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (updateError) {
          console.error(`  ✗ Error updating "${templateDef.name}":`, updateError.message);
        } else {
          updated++;
          console.log(`  ↻ Updated "${templateDef.name}"`);
        }
        continue;
      }

      const { error: insertError } = await supabase
        .from('form_templates')
        .insert({
          org_id: org.id,
          group_id: groupId,
          name: templateDef.name,
          name_es: templateDef.name_es,
          slug: slugify(templateDef.name),
          description: templateDef.description,
          description_es: templateDef.description_es,
          form_type: templateDef.form_type,
          schema,
          ui_schema: uiSchema,
          settings: { field_mappings: fieldMappings },
          is_active: true,
          is_system: true,
          version: 1,
        });

      if (insertError) {
        console.error(`  ✗ Error creating "${templateDef.name}":`, insertError.message);
      } else {
        created++;
        console.log(`  ✓ Created "${templateDef.name}"`);
      }
    }
  }

  console.log(`\nDone! Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`);
}

seedSystemFormTemplates().catch(console.error);
