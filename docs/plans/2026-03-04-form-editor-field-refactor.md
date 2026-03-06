# Form Editor Field Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Unify the five separate Levelset dropdown field types (employee_select, leader_select, position_select, infraction_select, disc_action_select) into a single `select` field with a data source setting, and add a new `text_block` field type with inline TipTap rich text editing.

**Architecture:** The `select` field gains a `settings.dataSource` property (default: `'custom'`) that controls whether options are user-defined or fetched from a predefined Levelset data source. A new unified `DataSelectWidget` replaces the five individual widget components. The "Levelset" field category is removed entirely. A new `text_block` field type uses TipTap for inline WYSIWYG editing on the canvas and renders as read-only HTML in form submissions. A migration script updates all existing form_templates in the database.

**Tech Stack:** TipTap (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`), existing MUI + RJSF stack, Supabase migration script

---

## Task 1: Update Field Palette — Remove Levelset Category, Add Text Block

**Files:**
- Modify: `apps/dashboard/lib/forms/field-palette.ts`

**Step 1: Remove all Levelset field type entries and the Levelset category. Add text_block field type. Update the select field to include a `hasDataSource` flag.**

Replace the entire contents of `apps/dashboard/lib/forms/field-palette.ts` with:

```typescript
/**
 * Field Palette Definitions
 *
 * Defines all available field types for the constrained form editor.
 * Each field type specifies its JSON Schema template and optional UI widget.
 */

export interface FieldTypeDefinition {
  type: string;
  label: string;
  labelEs: string;
  icon: string; // MUI icon name
  category: FieldCategory;
  schema: Record<string, any>;
  uiWidget?: string;
  uiOptions?: Record<string, any>;
  defaultRequired?: boolean;
  /** If true, this field type supports user-defined options (for select/radio/checkbox) */
  hasOptions?: boolean;
  /** If true, this field supports min/max configuration */
  hasRange?: boolean;
  /** If true, this field supports a data source selector (custom vs predefined) */
  hasDataSource?: boolean;
  /** Label shown in the type tag on the editor canvas (e.g., "Dropdown" for Levelset selects) */
  displayTypeLabel?: string;
  /** Icon name for the type tag (defaults to `icon` if not set) */
  displayTypeIcon?: string;
}

export type FieldCategory = 'basic' | 'selection' | 'advanced';

export const FIELD_CATEGORIES: { key: FieldCategory; label: string; labelEs: string }[] = [
  { key: 'basic', label: 'Basic', labelEs: 'Basico' },
  { key: 'selection', label: 'Selection', labelEs: 'Seleccion' },
  { key: 'advanced', label: 'Advanced', labelEs: 'Avanzado' },
];

export const FIELD_TYPES: Record<string, FieldTypeDefinition> = {
  text: {
    type: 'text',
    label: 'Text',
    labelEs: 'Texto',
    icon: 'TextFieldsOutlined',
    category: 'basic',
    schema: { type: 'string' },
  },
  textarea: {
    type: 'textarea',
    label: 'Long Text',
    labelEs: 'Texto Largo',
    icon: 'SubjectOutlined',
    category: 'basic',
    schema: { type: 'string' },
    uiWidget: 'textarea',
    uiOptions: { rows: 3 },
  },
  number: {
    type: 'number',
    label: 'Number',
    labelEs: 'Numero',
    icon: 'PinOutlined',
    category: 'basic',
    schema: { type: 'number' },
    hasRange: true,
  },
  date: {
    type: 'date',
    label: 'Date',
    labelEs: 'Fecha',
    icon: 'CalendarTodayOutlined',
    category: 'basic',
    schema: { type: 'string', format: 'date' },
  },
  section: {
    type: 'section',
    label: 'Section Header',
    labelEs: 'Encabezado de Seccion',
    icon: 'ViewAgendaOutlined',
    category: 'basic',
    schema: { type: 'null' },
    uiWidget: 'hidden',
  },
  text_block: {
    type: 'text_block',
    label: 'Text Block',
    labelEs: 'Bloque de Texto',
    icon: 'ArticleOutlined',
    category: 'basic',
    schema: { type: 'null' },
    uiWidget: 'hidden',
  },
  select: {
    type: 'select',
    label: 'Dropdown',
    labelEs: 'Lista Desplegable',
    icon: 'ArrowDropDownCircleOutlined',
    category: 'selection',
    schema: { type: 'string', enum: ['Option 1', 'Option 2'] },
    hasOptions: true,
    hasDataSource: true,
  },
  radio: {
    type: 'radio',
    label: 'Radio Buttons',
    labelEs: 'Botones de Radio',
    icon: 'RadioButtonCheckedOutlined',
    category: 'selection',
    schema: { type: 'string', enum: ['Option 1', 'Option 2'] },
    uiWidget: 'radio',
    hasOptions: true,
  },
  checkbox: {
    type: 'checkbox',
    label: 'Checkboxes',
    labelEs: 'Casillas',
    icon: 'CheckBoxOutlined',
    category: 'selection',
    schema: {
      type: 'array',
      items: { type: 'string', enum: ['Option 1', 'Option 2'] },
      uniqueItems: true,
    },
    uiWidget: 'checkboxes',
    hasOptions: true,
  },
  true_false: {
    type: 'true_false',
    label: 'True / False',
    labelEs: 'Verdadero / Falso',
    icon: 'ToggleOnOutlined',
    category: 'selection',
    schema: { type: 'boolean' },
  },
  rating_1_3: {
    type: 'rating_1_3',
    label: 'Rating (1-3)',
    labelEs: 'Calificacion (1-3)',
    icon: 'StarHalfOutlined',
    category: 'advanced',
    schema: {
      type: 'integer',
      minimum: 1,
      maximum: 3,
      enum: [1, 2, 3],
    },
    uiWidget: 'ratingScale',
  },
  rating_1_5: {
    type: 'rating_1_5',
    label: 'Rating (1-5)',
    labelEs: 'Calificacion (1-5)',
    icon: 'StarOutlined',
    category: 'advanced',
    schema: {
      type: 'integer',
      minimum: 1,
      maximum: 5,
      enum: [1, 2, 3, 4, 5],
    },
    uiWidget: 'ratingScale',
  },
  percentage: {
    type: 'percentage',
    label: 'Percentage',
    labelEs: 'Porcentaje',
    icon: 'PercentOutlined',
    category: 'advanced',
    schema: {
      type: 'number',
      minimum: 0,
      maximum: 100,
    },
  },
  signature: {
    type: 'signature',
    label: 'Signature',
    labelEs: 'Firma',
    icon: 'DrawOutlined',
    category: 'advanced',
    schema: { type: 'string' },
    uiWidget: 'signature',
  },
  file_upload: {
    type: 'file_upload',
    label: 'File Upload',
    labelEs: 'Subir Archivo',
    icon: 'AttachFileOutlined',
    category: 'advanced',
    schema: { type: 'string' },
    uiWidget: 'file',
  },
};

/** Predefined data sources for the select field */
export type DataSource = 'custom' | 'employees' | 'leaders' | 'positions' | 'infractions' | 'disc_actions';

export interface DataSourceOption {
  value: DataSource;
  label: string;
  labelEs: string;
  description: string;
  configLink?: string;
  configLinkLabel?: string;
}

export const DATA_SOURCE_OPTIONS: DataSourceOption[] = [
  {
    value: 'custom',
    label: 'Custom Options',
    labelEs: 'Opciones Personalizadas',
    description: 'Define your own options for this dropdown.',
  },
  {
    value: 'employees',
    label: 'Employees',
    labelEs: 'Empleados',
    description: 'All active team members at this location.',
  },
  {
    value: 'leaders',
    label: 'Leaders',
    labelEs: 'Lideres',
    description: 'Filters employees by role hierarchy level.',
  },
  {
    value: 'positions',
    label: 'Positions',
    labelEs: 'Posiciones',
    description: 'Positions configured for this organization.',
    configLink: '/org-settings?tab=positional-excellence&subtab=positions',
    configLinkLabel: 'Manage positions',
  },
  {
    value: 'infractions',
    label: 'Infractions',
    labelEs: 'Infracciones',
    description: 'Infraction types from the discipline rubric.',
    configLink: '/org-settings?tab=discipline&subtab=infractions',
    configLinkLabel: 'Manage infractions',
  },
  {
    value: 'disc_actions',
    label: 'Discipline Actions',
    labelEs: 'Acciones Disciplinarias',
    description: 'Discipline actions from the discipline rubric.',
    configLink: '/org-settings?tab=discipline&subtab=actions',
    configLinkLabel: 'Manage actions',
  },
];

/**
 * Get field types grouped by category
 */
export function getFieldTypesByCategory(): Record<FieldCategory, FieldTypeDefinition[]> {
  const grouped: Record<FieldCategory, FieldTypeDefinition[]> = {
    basic: [],
    selection: [],
    advanced: [],
  };

  for (const field of Object.values(FIELD_TYPES)) {
    grouped[field.category].push(field);
  }

  return grouped;
}
```

**Step 2: Verify the module compiles**

Run: `cd /Users/andrewdyar/levelset-nextjs && pnpm --filter dashboard exec tsc --noEmit --pretty 2>&1 | head -30`

Expected: May show pre-existing errors from other files, but no NEW errors from field-palette.ts.

**Step 3: Commit**

```bash
git add apps/dashboard/lib/forms/field-palette.ts
git commit -m "refactor(forms): remove Levelset field category, add text_block and data source definitions"
```

---

## Task 2: Update Schema Builder — Add dataSource to FormField, Handle text_block

**Files:**
- Modify: `apps/dashboard/lib/forms/schema-builder.ts`

**Step 1: Add `dataSource` to FieldSettings. Update `createFieldFromType` for text_block. Update `fieldsToJsonSchema` and `jsonSchemaToFields` for text_block and dataSource. Update `inferFieldType` to remove old Levelset references.**

Replace the entire contents of `apps/dashboard/lib/forms/schema-builder.ts`:

```typescript
/**
 * Schema Builder
 *
 * Converts between the internal FormField representation (used by the editor)
 * and the JSON Schema + UI Schema format (stored in the database and used by RJSF).
 */

import { FIELD_TYPES, type DataSource } from './field-palette';

export interface FormField {
  id: string;
  type: string;
  label: string;
  labelEs: string;
  description?: string;
  descriptionEs?: string;
  required: boolean;
  /** For select/radio/checkbox with custom options */
  options?: FieldOption[];
  /** Type-specific settings */
  settings: FieldSettings;
  /** Section grouping (ID of a section field) */
  sectionId?: string;
}

export interface FieldOption {
  value: string;
  label: string;
  labelEs?: string;
}

export interface FieldSettings {
  /** For number fields */
  min?: number;
  max?: number;
  /** For textarea */
  rows?: number;
  /** For evaluation scoring */
  weight?: number;
  scoringType?: 'rating_1_3' | 'rating_1_5' | 'true_false' | 'percentage';
  /** Connected question config */
  connectedTo?: string;
  connectorParams?: Record<string, any>;
  /** For section headers */
  sectionName?: string;
  sectionNameEs?: string;
  /** For select fields: data source (default: 'custom') */
  dataSource?: DataSource;
  /** For leader data source: max hierarchy level to include (default 2) */
  maxHierarchyLevel?: number;
  /** For text_block: rich text content */
  content?: string;
  contentEs?: string;
}

/**
 * Generate a unique field ID
 */
export function generateFieldId(): string {
  return `field_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Create a new FormField from a field type
 */
export function createFieldFromType(fieldType: string): FormField {
  const def = FIELD_TYPES[fieldType];
  if (!def) {
    throw new Error(`Unknown field type: ${fieldType}`);
  }

  const field: FormField = {
    id: generateFieldId(),
    type: fieldType,
    label: def.label,
    labelEs: def.labelEs,
    required: def.defaultRequired ?? false,
    settings: {},
  };

  // Add default options for selection-type fields
  if (def.hasOptions) {
    field.options = [
      { value: 'option_1', label: 'Option 1' },
      { value: 'option_2', label: 'Option 2' },
    ];
  }

  // Add default range for number fields
  if (def.hasRange) {
    field.settings.min = undefined;
    field.settings.max = undefined;
  }

  // Set default rows for textarea
  if (fieldType === 'textarea') {
    field.settings.rows = 3;
  }

  // Set default data source for select
  if (def.hasDataSource) {
    field.settings.dataSource = 'custom';
  }

  // Set default content for text_block
  if (fieldType === 'text_block') {
    field.settings.content = '<p>Enter text here...</p>';
    field.settings.contentEs = '<p>Ingrese texto aqui...</p>';
  }

  return field;
}

/**
 * Convert FormField[] to JSON Schema + UI Schema
 */
export function fieldsToJsonSchema(fields: FormField[]): {
  schema: Record<string, any>;
  uiSchema: Record<string, any>;
} {
  const properties: Record<string, any> = {};
  const required: string[] = [];
  const uiSchema: Record<string, any> = {
    'ui:order': [] as string[],
  };

  for (const field of fields) {
    const fieldDef = FIELD_TYPES[field.type];
    if (!fieldDef) continue;

    // Section headers are purely UI — store as a null-typed property
    if (field.type === 'section') {
      properties[field.id] = {
        type: 'null',
        title: field.label,
      };
      uiSchema[field.id] = {
        'ui:widget': 'hidden',
        'ui:field': 'section',
        'ui:options': {
          sectionName: field.settings.sectionName || field.label,
          sectionNameEs: field.settings.sectionNameEs || field.labelEs,
        },
      };
      uiSchema['ui:order'].push(field.id);
      continue;
    }

    // Text blocks are purely UI — store as a null-typed property with content
    if (field.type === 'text_block') {
      properties[field.id] = {
        type: 'null',
        title: field.label,
      };
      uiSchema[field.id] = {
        'ui:widget': 'hidden',
        'ui:field': 'textBlock',
        'ui:options': {
          content: field.settings.content || '',
          contentEs: field.settings.contentEs || '',
        },
        'ui:fieldMeta': {
          fieldType: 'text_block',
          labelEs: field.labelEs,
        },
      };
      uiSchema['ui:order'].push(field.id);
      continue;
    }

    // Build property schema from field definition and overrides
    const propSchema: Record<string, any> = {
      ...JSON.parse(JSON.stringify(fieldDef.schema)),
      title: field.label,
    };

    if (field.description) {
      propSchema.description = field.description;
    }

    // Apply options for select/radio/checkbox (only when dataSource is custom or not set)
    const dataSource = field.settings.dataSource || 'custom';
    if (field.options && field.options.length > 0 && dataSource === 'custom') {
      if (field.type === 'checkbox') {
        propSchema.items = {
          type: 'string',
          enum: field.options.map((o) => o.value),
        };
        // Store option labels as enumNames at items level
        propSchema.items.enumNames = field.options.map((o) => o.label);
      } else {
        propSchema.enum = field.options.map((o) => o.value);
        propSchema.enumNames = field.options.map((o) => o.label);
      }
    }

    // For predefined data sources, clear enum from schema (widget fetches data at runtime)
    if (field.type === 'select' && dataSource !== 'custom') {
      delete propSchema.enum;
      delete propSchema.enumNames;
    }

    // Apply range for number fields
    if (field.settings.min !== undefined) {
      propSchema.minimum = field.settings.min;
    }
    if (field.settings.max !== undefined) {
      propSchema.maximum = field.settings.max;
    }

    properties[field.id] = propSchema;

    // Build UI schema
    const fieldUiSchema: Record<string, any> = {};

    // Widget selection: predefined data sources use data_select widget
    if (field.type === 'select' && dataSource !== 'custom') {
      fieldUiSchema['ui:widget'] = 'data_select';
    } else if (fieldDef.uiWidget) {
      fieldUiSchema['ui:widget'] = fieldDef.uiWidget;
    }

    // Rating fields render their own card with title + description — hide RJSF's label
    if (field.type === 'rating_1_3' || field.type === 'rating_1_5') {
      fieldUiSchema['ui:options'] = {
        ...(fieldUiSchema['ui:options'] || {}),
        label: false,
      };
    }

    // Textarea rows
    if (field.type === 'textarea') {
      fieldUiSchema['ui:options'] = {
        rows: field.settings.rows || 3,
      };
    }

    // Store custom metadata for i18n and editor
    fieldUiSchema['ui:fieldMeta'] = {
      fieldType: field.type,
      labelEs: field.labelEs,
      descriptionEs: field.descriptionEs,
      sectionId: field.sectionId,
      ...(field.settings.dataSource && field.settings.dataSource !== 'custom'
        ? { dataSource: field.settings.dataSource }
        : {}),
      ...(field.settings.weight !== undefined ? { weight: field.settings.weight } : {}),
      ...(field.settings.scoringType ? { scoringType: field.settings.scoringType } : {}),
      ...(field.settings.connectedTo ? { connectedTo: field.settings.connectedTo } : {}),
      ...(field.settings.connectorParams ? { connectorParams: field.settings.connectorParams } : {}),
      ...(field.settings.maxHierarchyLevel !== undefined ? { maxHierarchyLevel: field.settings.maxHierarchyLevel } : {}),
    };

    if (Object.keys(fieldUiSchema).length > 0) {
      uiSchema[field.id] = fieldUiSchema;
    }

    // Track required fields
    if (field.required) {
      required.push(field.id);
    }

    // Track field order
    uiSchema['ui:order'].push(field.id);
  }

  const schema: Record<string, any> = {
    type: 'object',
    properties,
  };

  if (required.length > 0) {
    schema.required = required;
  }

  return { schema, uiSchema };
}

/**
 * Convert JSON Schema + UI Schema back to FormField[]
 */
export function jsonSchemaToFields(
  schema: Record<string, any>,
  uiSchema: Record<string, any>
): FormField[] {
  if (!schema || !schema.properties) return [];

  const properties = schema.properties;
  const requiredFields = new Set<string>(schema.required || []);
  const fieldOrder: string[] = uiSchema?.['ui:order'] || Object.keys(properties);

  const fields: FormField[] = [];

  for (const fieldId of fieldOrder) {
    const propSchema = properties[fieldId];
    if (!propSchema) continue;

    const fieldUiSchema = uiSchema?.[fieldId] || {};
    const meta = fieldUiSchema['ui:fieldMeta'] || {};

    // Determine field type from metadata or infer from schema
    const fieldType = meta.fieldType || inferFieldType(propSchema, fieldUiSchema);

    const field: FormField = {
      id: fieldId,
      type: fieldType,
      label: propSchema.title || fieldId,
      labelEs: meta.labelEs || '',
      description: propSchema.description,
      descriptionEs: meta.descriptionEs,
      required: requiredFields.has(fieldId),
      settings: {},
    };

    // Restore section ID
    if (meta.sectionId) {
      field.sectionId = meta.sectionId;
    }

    // Restore text_block content
    if (fieldType === 'text_block') {
      field.settings.content = fieldUiSchema['ui:options']?.content || '';
      field.settings.contentEs = fieldUiSchema['ui:options']?.contentEs || '';
    }

    // Restore section settings
    if (fieldType === 'section') {
      field.settings.sectionName = fieldUiSchema['ui:options']?.sectionName || field.label;
      field.settings.sectionNameEs = fieldUiSchema['ui:options']?.sectionNameEs || field.labelEs;
    }

    // Restore data source for select fields
    if (meta.dataSource) {
      field.settings.dataSource = meta.dataSource;
    }

    // Restore options for select/radio/checkbox (only when custom data source)
    if (!field.settings.dataSource || field.settings.dataSource === 'custom') {
      if (fieldType === 'checkbox' && propSchema.items?.enum) {
        const labels = propSchema.items.enumNames || propSchema.items.enum;
        field.options = propSchema.items.enum.map((val: string, i: number) => ({
          value: val,
          label: labels[i] || val,
        }));
      } else if (propSchema.enum && ['select', 'radio'].includes(fieldType)) {
        const labels = propSchema.enumNames || propSchema.enum;
        field.options = propSchema.enum.map((val: string, i: number) => ({
          value: val,
          label: labels[i] || val,
        }));
      }
    }

    // Restore range settings
    if (propSchema.minimum !== undefined) {
      field.settings.min = propSchema.minimum;
    }
    if (propSchema.maximum !== undefined) {
      field.settings.max = propSchema.maximum;
    }

    // Restore textarea rows
    if (fieldType === 'textarea') {
      field.settings.rows = fieldUiSchema['ui:options']?.rows || 3;
    }

    // Restore evaluation settings from metadata
    if (meta.weight !== undefined) field.settings.weight = meta.weight;
    if (meta.scoringType) field.settings.scoringType = meta.scoringType;
    if (meta.connectedTo) field.settings.connectedTo = meta.connectedTo;
    if (meta.connectorParams) field.settings.connectorParams = meta.connectorParams;
    if (meta.maxHierarchyLevel !== undefined) field.settings.maxHierarchyLevel = meta.maxHierarchyLevel;

    fields.push(field);
  }

  return fields;
}

/**
 * Infer field type from JSON Schema when metadata is missing
 */
function inferFieldType(
  propSchema: Record<string, any>,
  uiSchema: Record<string, any>
): string {
  const widget = uiSchema?.['ui:widget'];
  const field = uiSchema?.['ui:field'];

  if (field === 'section') return 'section';
  if (field === 'textBlock') return 'text_block';
  if (widget === 'signature') return 'signature';
  if (widget === 'file') return 'file_upload';
  if (widget === 'data_select') return 'select';
  if (widget === 'textarea') return 'textarea';
  if (widget === 'ratingScale') {
    if (propSchema.maximum === 3) return 'rating_1_3';
    return 'rating_1_5';
  }

  if (propSchema.type === 'boolean') return 'true_false';

  if (propSchema.type === 'integer' && propSchema.enum) {
    if (propSchema.maximum === 3) return 'rating_1_3';
    if (propSchema.maximum === 5) return 'rating_1_5';
  }

  if (propSchema.type === 'number') {
    if (propSchema.minimum === 0 && propSchema.maximum === 100) return 'percentage';
    return 'number';
  }

  if (propSchema.type === 'string') {
    if (propSchema.format === 'date') return 'date';
    if (propSchema.enum) {
      return widget === 'radio' ? 'radio' : 'select';
    }
    return 'text';
  }

  if (propSchema.type === 'array') {
    return 'checkbox';
  }

  return 'text';
}
```

**Step 2: Commit**

```bash
git add apps/dashboard/lib/forms/schema-builder.ts
git commit -m "refactor(forms): add dataSource and text_block support to schema builder"
```

---

## Task 3: Create Unified DataSelectWidget

**Files:**
- Create: `apps/dashboard/components/forms/widgets/DataSelectWidget.tsx`
- Modify: `apps/dashboard/components/forms/widgets/index.ts`

**Step 1: Create the DataSelectWidget that dispatches to the correct data source based on `ui:fieldMeta.dataSource`.**

```typescript
// apps/dashboard/components/forms/widgets/DataSelectWidget.tsx

import * as React from 'react';
import { Autocomplete, TextField, Typography, FormControl, FormHelperText } from '@mui/material';
import type { WidgetProps } from '@rjsf/utils';
import { useAuth } from '@/lib/providers/AuthProvider';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

interface DataOption {
  id: string;
  label: string;
  sublabel?: string;
  group?: string;
  description?: string;
}

/**
 * Unified data select widget for RJSF forms.
 * Fetches data based on the dataSource setting in fieldMeta.
 * Replaces: EmployeeSelectWidget, LeaderSelectWidget, PositionSelectWidget,
 *           InfractionSelectWidget, DiscActionSelectWidget.
 */
export function DataSelectWidget(props: WidgetProps) {
  const { id, value, required, disabled, readonly, onChange, label, rawErrors, formContext } = props;
  const auth = useAuth();
  const org_id = formContext?.orgId || auth.org_id;
  const location_id = formContext?.locationId || auth.location_id;
  const formType = formContext?.formType || 'custom';

  const meta = props.uiSchema?.['ui:fieldMeta'] || {};
  const dataSource = meta.dataSource || 'employees';
  const maxHierarchyLevel = meta.maxHierarchyLevel;

  const [options, setOptions] = React.useState<DataOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  // Determine what value is stored (ID vs name) based on data source
  const storesName = dataSource === 'positions';

  React.useEffect(() => {
    if (!org_id) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    const fetchData = async () => {
      try {
        let fetchedOptions: DataOption[] = [];

        if (dataSource === 'employees') {
          if (!location_id) { setLoading(false); return; }
          const res = await fetch(`/api/employees?location_id=${encodeURIComponent(location_id)}`);
          const json = await res.json();
          if (json.employees) {
            fetchedOptions = json.employees.map((e: any) => ({
              id: e.id,
              label: e.full_name?.trim() || `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim() || 'Unnamed',
              sublabel: e.role ?? undefined,
            }));
          }
        } else if (dataSource === 'leaders') {
          if (!location_id) { setLoading(false); return; }
          const params = new URLSearchParams({
            type: 'leaders',
            org_id,
            location_id,
            form_type: formType,
          });
          if (maxHierarchyLevel !== undefined) {
            params.set('max_hierarchy', String(maxHierarchyLevel));
          }
          const res = await fetch(`/api/forms/widget-data?${params}`);
          const json = await res.json();
          if (json.data) {
            fetchedOptions = json.data.map((e: any) => ({
              id: e.id,
              label: e.full_name || 'Unnamed',
              sublabel: e.role ?? undefined,
            }));
          }
        } else if (dataSource === 'positions') {
          const res = await fetch(`/api/forms/widget-data?type=positions&org_id=${encodeURIComponent(org_id)}`);
          const json = await res.json();
          if (json.data) {
            fetchedOptions = json.data.map((p: any) => ({
              id: p.id,
              label: p.name,
              group: p.zone ?? undefined,
              description: p.description ?? undefined,
            }));
          }
        } else if (dataSource === 'infractions') {
          const res = await fetch(`/api/forms/widget-data?type=infractions&org_id=${encodeURIComponent(org_id)}`);
          const json = await res.json();
          if (json.data) {
            fetchedOptions = json.data.map((item: any) => ({
              id: item.id,
              label: `${item.points ?? 0} - ${item.action || 'Unknown'}`,
            }));
          }
        } else if (dataSource === 'disc_actions') {
          const res = await fetch(`/api/forms/widget-data?type=disc_actions&org_id=${encodeURIComponent(org_id)}`);
          const json = await res.json();
          if (json.data) {
            fetchedOptions = json.data.map((item: any) => ({
              id: item.id,
              label: item.action || 'Unknown',
              sublabel: item.points_threshold != null ? `At ${item.points_threshold}+ points` : undefined,
            }));
          }
        }

        if (!cancelled) setOptions(fetchedOptions);
      } catch (err) {
        console.error(`DataSelectWidget(${dataSource}): load failed`, err);
        if (!cancelled) setLoadError(`Failed to load ${dataSource}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [org_id, location_id, formType, dataSource, maxHierarchyLevel]);

  const selectedOption = React.useMemo(() => {
    if (!value) return null;
    if (storesName) {
      return options.find((o) => o.label === value) || null;
    }
    return options.find((o) => o.id === value) || null;
  }, [value, options, storesName]);

  const isDisabled = disabled || readonly;

  return (
    <FormControl
      required={required}
      error={rawErrors && rawErrors.length > 0}
      sx={{ width: '100%' }}
    >
      <Autocomplete
        id={id}
        options={options}
        loading={loading}
        disabled={isDisabled}
        value={selectedOption}
        onChange={(_, option) => {
          if (storesName) {
            onChange(option?.label ?? undefined);
          } else {
            onChange(option?.id ?? undefined);
          }
        }}
        getOptionLabel={(option) => option.label}
        groupBy={dataSource === 'positions' ? (option) => option.group || 'Other' : undefined}
        renderOption={(optionProps, option) => (
          <li {...optionProps} key={option.id}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontFamily, fontSize: 13 }}>{option.label}</span>
              {option.sublabel && (
                <span style={{ fontFamily, fontSize: 11, color: 'var(--ls-color-muted)' }}>
                  {option.sublabel}
                </span>
              )}
            </div>
          </li>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            required={required}
            error={rawErrors && rawErrors.length > 0}
            sx={{
              '& .MuiInputBase-root': { fontFamily, fontSize: 14 },
              '& .MuiInputLabel-root': { fontFamily, fontSize: 14 },
            }}
          />
        )}
        sx={{ '& .MuiAutocomplete-option': { fontFamily, fontSize: 13 } }}
      />

      {/* Position description */}
      {dataSource === 'positions' && selectedOption?.description && (
        <Typography
          sx={{
            fontFamily,
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--ls-color-text-secondary)',
            backgroundColor: 'var(--ls-color-neutral-foreground)',
            borderRadius: '8px',
            padding: '12px 16px',
            lineHeight: 1.5,
            mt: 1,
          }}
        >
          {selectedOption.description}
        </Typography>
      )}

      {loadError && (
        <FormHelperText error sx={{ fontFamily, fontSize: 12 }}>
          {loadError}
        </FormHelperText>
      )}
      {rawErrors && rawErrors.length > 0 && (
        <FormHelperText error sx={{ fontFamily, fontSize: 12 }}>
          {rawErrors[0]}
        </FormHelperText>
      )}
    </FormControl>
  );
}
```

**Step 2: Create a TextBlockField for RJSF rendering (form submission view)**

```typescript
// apps/dashboard/components/forms/widgets/TextBlockField.tsx

import * as React from 'react';
import type { FieldProps } from '@rjsf/utils';
import { useTranslation } from 'react-i18next';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

/**
 * TextBlockField — renders rich text content as read-only HTML in forms.
 * Registered as a custom RJSF field (not widget) via ui:field = 'textBlock'.
 */
export function TextBlockField(props: FieldProps) {
  const { uiSchema } = props;
  const { i18n } = useTranslation();
  const options = uiSchema?.['ui:options'] || {};
  const isSpanish = i18n.language === 'es';
  const content = isSpanish ? (options.contentEs || options.content || '') : (options.content || '');

  if (!content) return null;

  return (
    <div
      className="text-block-content"
      style={{
        fontFamily,
        fontSize: 14,
        lineHeight: 1.6,
        color: 'var(--ls-color-text-primary)',
        padding: '8px 0',
      }}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
```

**Step 3: Update widget registry to add DataSelectWidget and TextBlockField, remove old widgets.**

Replace `apps/dashboard/components/forms/widgets/index.ts`:

```typescript
/**
 * Custom RJSF Widget & Field Registry
 *
 * Maps widget names to custom widget components.
 * Standard widgets (text, select, checkbox, radio, etc.) use @rjsf/mui defaults.
 * Custom widgets listed here extend RJSF with Levelset-specific UI.
 */

import type { RegistryWidgetsType, RegistryFieldsType } from '@rjsf/utils';
import { RatingScaleWidget } from './RatingScaleWidget';
import { SignatureWidget } from './SignatureWidget';
import { DataSelectWidget } from './DataSelectWidget';
import { FileUploadWidget } from './FileUploadWidget';
import { TextBlockField } from './TextBlockField';

export const customWidgets: RegistryWidgetsType = {
  signature: SignatureWidget,
  ratingScale: RatingScaleWidget,
  data_select: DataSelectWidget,
  file: FileUploadWidget,
};

export const customFields: RegistryFieldsType = {
  textBlock: TextBlockField as any,
};

/**
 * Get the widget registry, filtering out undefined placeholders
 */
export function getCustomWidgets(): RegistryWidgetsType {
  const widgets: RegistryWidgetsType = {};
  for (const [key, widget] of Object.entries(customWidgets)) {
    if (widget) {
      widgets[key] = widget;
    }
  }
  return widgets;
}

/**
 * Get the custom field registry
 */
export function getCustomFields(): RegistryFieldsType {
  return { ...customFields };
}
```

**Step 4: Update FormRenderer to pass custom fields to RJSF**

In `apps/dashboard/components/forms/FormRenderer.tsx`, add the fields registry:

1. Add import: `import { getCustomFields } from '@/components/forms/widgets';`
2. Add memoized fields: `const fields = React.useMemo(() => getCustomFields(), []);`
3. Add `fields={fields}` prop to the `<Form>` component (after `widgets={widgets}`)

**Step 5: Commit**

```bash
git add apps/dashboard/components/forms/widgets/DataSelectWidget.tsx apps/dashboard/components/forms/widgets/TextBlockField.tsx apps/dashboard/components/forms/widgets/index.ts apps/dashboard/components/forms/FormRenderer.tsx
git commit -m "feat(forms): add DataSelectWidget, TextBlockField, update widget registry"
```

---

## Task 4: Install TipTap and Create Inline Text Block Editor

**Files:**
- Install: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`
- Create: `apps/dashboard/components/forms/editor/TextBlockEditor.tsx`
- Create: `apps/dashboard/components/forms/editor/TextBlockEditor.module.css`

**Step 1: Install TipTap**

Run: `cd /Users/andrewdyar/levelset-nextjs && pnpm --filter dashboard add @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/pm`

**Step 2: Create the TextBlockEditor CSS module**

```css
/* apps/dashboard/components/forms/editor/TextBlockEditor.module.css */

.editorWrapper {
  border: 1px solid var(--ls-color-muted-border);
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
}

.toolbar {
  display: flex;
  flex-direction: row;
  gap: 2px;
  padding: 4px 8px;
  border-bottom: 1px solid var(--ls-color-muted-border);
  background: var(--ls-color-neutral-foreground);
}

.toolbarButton {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--ls-color-muted);
  cursor: pointer;
  transition: all 0.15s ease;
}

.toolbarButton:hover {
  background: var(--ls-color-muted-border);
  color: var(--ls-color-text-primary);
}

.toolbarButtonActive {
  background: var(--ls-color-brand-soft);
  color: var(--ls-color-brand);
}

.editorContent {
  padding: 12px 16px;
  min-height: 60px;
  font-family: "Satoshi", sans-serif;
  font-size: 14px;
  line-height: 1.6;
  color: var(--ls-color-text-primary);
}

.editorContent :global(.ProseMirror) {
  outline: none;
  min-height: 40px;
}

.editorContent :global(.ProseMirror p) {
  margin: 0 0 8px 0;
}

.editorContent :global(.ProseMirror p:last-child) {
  margin-bottom: 0;
}

.editorContent :global(.ProseMirror ul),
.editorContent :global(.ProseMirror ol) {
  margin: 0 0 8px 0;
  padding-left: 24px;
}

.editorContent :global(.ProseMirror a) {
  color: var(--ls-color-brand);
  text-decoration: underline;
}
```

**Step 3: Create the TextBlockEditor component**

```typescript
// apps/dashboard/components/forms/editor/TextBlockEditor.tsx

import * as React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import LinkIcon from '@mui/icons-material/Link';
import sty from './TextBlockEditor.module.css';

interface TextBlockEditorProps {
  content: string;
  onChange: (html: string) => void;
}

export function TextBlockEditor({ content, onChange }: TextBlockEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
    ],
    content,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  });

  if (!editor) return null;

  const handleLinkToggle = () => {
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
    } else {
      const url = window.prompt('Enter URL:');
      if (url) {
        editor.chain().focus().setLink({ href: url }).run();
      }
    }
  };

  return (
    <div className={sty.editorWrapper}>
      <div className={sty.toolbar}>
        <button
          type="button"
          className={`${sty.toolbarButton} ${editor.isActive('bold') ? sty.toolbarButtonActive : ''}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <FormatBoldIcon sx={{ fontSize: 16 }} />
        </button>
        <button
          type="button"
          className={`${sty.toolbarButton} ${editor.isActive('italic') ? sty.toolbarButtonActive : ''}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <FormatItalicIcon sx={{ fontSize: 16 }} />
        </button>
        <button
          type="button"
          className={`${sty.toolbarButton} ${editor.isActive('bulletList') ? sty.toolbarButtonActive : ''}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet List"
        >
          <FormatListBulletedIcon sx={{ fontSize: 16 }} />
        </button>
        <button
          type="button"
          className={`${sty.toolbarButton} ${editor.isActive('orderedList') ? sty.toolbarButtonActive : ''}`}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numbered List"
        >
          <FormatListNumberedIcon sx={{ fontSize: 16 }} />
        </button>
        <button
          type="button"
          className={`${sty.toolbarButton} ${editor.isActive('link') ? sty.toolbarButtonActive : ''}`}
          onClick={handleLinkToggle}
          title="Link"
        >
          <LinkIcon sx={{ fontSize: 16 }} />
        </button>
      </div>
      <div className={sty.editorContent}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add apps/dashboard/components/forms/editor/TextBlockEditor.tsx apps/dashboard/components/forms/editor/TextBlockEditor.module.css
git commit -m "feat(forms): add TipTap-based TextBlockEditor for inline rich text editing"
```

---

## Task 5: Update EditorFieldCard — Remove Levelset Styling, Add Text Block Inline Editing

**Files:**
- Modify: `apps/dashboard/components/forms/editor/EditorFieldCard.tsx`
- Modify: `apps/dashboard/components/forms/editor/EditorFieldCard.module.css`

**Step 1: Update EditorFieldCard to remove Levelset-specific logic and add text block inline rendering.**

Key changes:
1. Remove imports for Levelset icons (PersonOutlined, SupervisorAccountOutlined, etc.) and `getLevelsetFieldInfo`
2. Remove `levelsetInfo`, `isLevelset` logic
3. Remove `cardLevelset` CSS class usage
4. Remove `levelsetDescription` rendering
5. Add import for `TextBlockEditor`
6. Add import for `ArticleOutlinedIcon`
7. For text_block fields, render inline `TextBlockEditor` instead of the standard card content
8. Add `onUpdateField` prop to handle text block content changes

The component needs an `onUpdateField` prop added. Update `EditorFieldCardProps`:

```typescript
interface EditorFieldCardProps {
  field: FormField;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onUpdateField?: (id: string, updates: Partial<FormField>) => void;
  isOverlay?: boolean;
  formType?: string;
}
```

For text_block rendering in the card content area, after the existing `cardTop` div and before the delete button:

```typescript
{field.type === 'text_block' && !isOverlay && onUpdateField && (
  <TextBlockEditor
    content={field.settings.content || ''}
    onChange={(html) => {
      onUpdateField(field.id, {
        settings: { ...field.settings, content: html },
      });
    }}
  />
)}
```

Remove from `EditorFieldCard.module.css`:
- `.cardLevelset` rule (line 89-91)
- `.levelsetDescription` rule (lines 93-101)

Remove from `TYPE_TAG_ICON_MAP`:
- `PersonOutlined`, `SupervisorAccountOutlined`, `WorkOutlineOutlined`, `ReportProblemOutlined`, `GavelOutlined`

Add to `TYPE_TAG_ICON_MAP`:
- `ArticleOutlined` (import `ArticleOutlinedIcon`)

**Step 2: Update EditorCanvas to pass onUpdateField through to EditorFieldCard**

In `apps/dashboard/components/forms/editor/EditorCanvas.tsx`, add `onUpdateField` prop and pass it to `EditorFieldCard`.

**Step 3: Update FormEditorPanel to pass handleUpdateField to EditorCanvas**

In `apps/dashboard/components/forms/editor/FormEditorPanel.tsx` (line 227-233), add `onUpdateField={handleUpdateField}` to `<EditorCanvas>`.

**Step 4: Commit**

```bash
git add apps/dashboard/components/forms/editor/EditorFieldCard.tsx apps/dashboard/components/forms/editor/EditorFieldCard.module.css apps/dashboard/components/forms/editor/EditorCanvas.tsx apps/dashboard/components/forms/editor/FormEditorPanel.tsx
git commit -m "refactor(forms): remove Levelset styling from field cards, add inline text block editing"
```

---

## Task 6: Update FieldConfigPanel — Add Data Source Selector, Remove Levelset Logic

**Files:**
- Modify: `apps/dashboard/components/forms/editor/FieldConfigPanel.tsx`
- Modify: `apps/dashboard/components/forms/editor/FieldConfigPanel.module.css`

**Step 1: Replace the entire FieldConfigPanel to add data source selector and remove Levelset logic.**

Key changes:
1. Remove `getLevelsetFieldInfo` import
2. Remove `levelsetInfo` variable and all its rendering (lines 54, 121-144)
3. Remove leader_select special case (lines 300-317)
4. Add `DATA_SOURCE_OPTIONS` import from field-palette
5. Add data source dropdown for fields where `fieldDef?.hasDataSource` is true
6. Show options editor only when `dataSource === 'custom'` (or dataSource not set)
7. Show data source description and config link when a predefined source is selected
8. Show max hierarchy level config when `dataSource === 'leaders'`
9. For text_block fields, show English and Spanish content editors (config panel version for Spanish, since canvas only shows English)

After the Required toggle section and before the Options editor, add:

```typescript
{/* Data Source selector (for select fields) */}
{fieldDef?.hasDataSource && (
  <>
    <Divider sx={{ margin: '8px 0' }} />
    <div className={sty.configSection}>
      <span className={sty.sectionLabel}>Data Source</span>
      <FormControl fullWidth size="small">
        <InputLabel sx={inputLabelSx}>Source</InputLabel>
        <StyledSelect
          value={field.settings.dataSource || 'custom'}
          onChange={(e) => {
            const newSource = e.target.value as string;
            const updates: Partial<FormField> = {
              settings: {
                ...field.settings,
                dataSource: newSource as any,
              },
            };
            // Clear options when switching to predefined source
            if (newSource !== 'custom') {
              updates.options = undefined;
            } else if (!field.options || field.options.length === 0) {
              updates.options = [
                { value: 'option_1', label: 'Option 1' },
                { value: 'option_2', label: 'Option 2' },
              ];
            }
            onUpdateField(field.id, updates);
          }}
          label="Source"
        >
          {DATA_SOURCE_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value} sx={menuItemSx}>
              {opt.label}
            </MenuItem>
          ))}
        </StyledSelect>
      </FormControl>

      {/* Data source info card */}
      {field.settings.dataSource && field.settings.dataSource !== 'custom' && (() => {
        const sourceInfo = DATA_SOURCE_OPTIONS.find(o => o.value === field.settings.dataSource);
        if (!sourceInfo) return null;
        return (
          <div className={sty.dataSourceInfoCard}>
            <InfoOutlinedIcon sx={{ fontSize: 14, color: 'var(--ls-color-brand)', flexShrink: 0, mt: '1px' }} />
            <div className={sty.dataSourceInfoContent}>
              <span className={sty.dataSourceInfoText}>{sourceInfo.description}</span>
              {sourceInfo.configLink && (
                <a href={sourceInfo.configLink} target="_blank" rel="noopener noreferrer" className={sty.dataSourceConfigLink}>
                  {sourceInfo.configLinkLabel}
                  <OpenInNewOutlinedIcon sx={{ fontSize: 12, ml: '2px' }} />
                </a>
              )}
            </div>
          </div>
        );
      })()}

      {/* Leader hierarchy filter */}
      {field.settings.dataSource === 'leaders' && (
        <StyledTextField
          label="Max Hierarchy Level"
          type="number"
          value={field.settings.maxHierarchyLevel ?? 2}
          onChange={(e) => handleSettingsChange('maxHierarchyLevel', Math.max(0, Math.min(10, Number(e.target.value))))}
          size="small"
          slotProps={{ htmlInput: { min: 0, max: 10 } }}
          helperText="Include roles at this hierarchy level and above (0 = top level)"
        />
      )}
    </div>
  </>
)}
```

Update the options editor conditional (currently `{fieldDef?.hasOptions && field.options && (`) to also check data source:

```typescript
{fieldDef?.hasOptions && field.options && (!field.settings.dataSource || field.settings.dataSource === 'custom') && (
```

For text_block Spanish content, add after the Label section:

```typescript
{field.type === 'text_block' && (
  <>
    <Divider sx={{ margin: '8px 0' }} />
    <div className={sty.configSection}>
      <span className={sty.sectionLabel}>Spanish Content</span>
      <StyledTextField
        label="Spanish Text (HTML)"
        value={field.settings.contentEs || ''}
        onChange={(e) => handleSettingsChange('contentEs', e.target.value)}
        fullWidth
        size="small"
        multiline
        rows={4}
        InputLabelProps={{ shrink: true }}
        helperText="HTML content for Spanish version"
      />
    </div>
  </>
)}
```

**Step 2: Update FieldConfigPanel.module.css — rename Levelset styles to data source styles**

Replace `.levelsetInfoCard` with `.dataSourceInfoCard`, `.levelsetInfoContent` with `.dataSourceInfoContent`, `.levelsetInfoText` with `.dataSourceInfoText`, `.levelsetConfigLink` with `.dataSourceConfigLink` (same CSS, just renamed class names).

**Step 3: Commit**

```bash
git add apps/dashboard/components/forms/editor/FieldConfigPanel.tsx apps/dashboard/components/forms/editor/FieldConfigPanel.module.css
git commit -m "refactor(forms): replace Levelset info with data source selector in config panel"
```

---

## Task 7: Write Migration Script for Existing Templates

**Files:**
- Create: `scripts/migrate-levelset-fields-to-select.ts`

This script converts all existing form_templates that use old Levelset field types to the new unified select format.

**Step 1: Create the migration script**

```typescript
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
```

**Step 2: Run the migration**

Run: `cd /Users/andrewdyar/levelset-nextjs && npx tsx scripts/migrate-levelset-fields-to-select.ts`

Expected: Output showing which templates were migrated and field conversions.

**Step 3: Commit**

```bash
git add scripts/migrate-levelset-fields-to-select.ts
git commit -m "feat(forms): add migration script to convert Levelset fields to unified select"
```

---

## Task 8: Delete Old Widget Files and Clean Up

**Files:**
- Delete: `apps/dashboard/components/forms/widgets/EmployeeSelectWidget.tsx`
- Delete: `apps/dashboard/components/forms/widgets/LeaderSelectWidget.tsx`
- Delete: `apps/dashboard/components/forms/widgets/PositionSelectWidget.tsx`
- Delete: `apps/dashboard/components/forms/widgets/InfractionSelectWidget.tsx`
- Delete: `apps/dashboard/components/forms/widgets/DiscActionSelectWidget.tsx`

**Step 1: Remove the old widget files**

```bash
rm apps/dashboard/components/forms/widgets/EmployeeSelectWidget.tsx
rm apps/dashboard/components/forms/widgets/LeaderSelectWidget.tsx
rm apps/dashboard/components/forms/widgets/PositionSelectWidget.tsx
rm apps/dashboard/components/forms/widgets/InfractionSelectWidget.tsx
rm apps/dashboard/components/forms/widgets/DiscActionSelectWidget.tsx
```

**Step 2: Verify the build succeeds**

Run: `cd /Users/andrewdyar/levelset-nextjs && pnpm --filter dashboard build`

Expected: Build succeeds. No references to deleted files remain.

**Step 3: Commit**

```bash
git add -A apps/dashboard/components/forms/widgets/
git commit -m "chore(forms): remove old Levelset widget components replaced by DataSelectWidget"
```

---

## Task 9: Update Form Import Prompt (if already created)

**Files:**
- Modify: `apps/dashboard/lib/forms/import-prompt.ts` (if it exists from the import feature plan)

If the form import feature has been implemented, update the AI prompt to:
1. Remove references to `employee_select`, `leader_select`, `position_select`, `infraction_select`, `disc_action_select` as field types
2. Instead, instruct the AI to use `select` with a `dataSource` setting
3. Add `text_block` as an available field type

This task is conditional — skip if the import feature hasn't been built yet. The import plan document (`docs/plans/2026-03-04-form-import-feature.md`) should be updated to reflect the new field types regardless.

**Step 1: Update the import feature plan document**

Add a note at the top of `docs/plans/2026-03-04-form-import-feature.md`:

```markdown
> **Note:** The Levelset-specific field types (employee_select, leader_select, etc.) have been
> unified into the `select` field type with a `settings.dataSource` property. Update the AI prompt
> in Task 1 to use `select` with dataSource instead of individual Levelset field types. Also add
> `text_block` as an available field type.
```

**Step 2: Commit**

```bash
git add docs/plans/2026-03-04-form-import-feature.md
git commit -m "docs: update import plan to reflect unified select field types"
```

---

## Summary of Changes

| File | Action | Purpose |
|------|--------|---------|
| `lib/forms/field-palette.ts` | Rewrite | Remove 5 Levelset types + category, add text_block, add DataSource types |
| `lib/forms/schema-builder.ts` | Rewrite | Add dataSource to FieldSettings, handle text_block in schema conversion |
| `widgets/DataSelectWidget.tsx` | Create | Unified widget replacing 5 individual Levelset widgets |
| `widgets/TextBlockField.tsx` | Create | RJSF field for rendering text blocks in form submission |
| `widgets/index.ts` | Rewrite | Register new widgets/fields, remove old ones |
| `editor/TextBlockEditor.tsx` | Create | TipTap inline editor for text blocks on canvas |
| `editor/TextBlockEditor.module.css` | Create | Styles for TipTap editor |
| `editor/EditorFieldCard.tsx` | Modify | Remove Levelset styling, add text block inline rendering |
| `editor/EditorFieldCard.module.css` | Modify | Remove Levelset CSS classes |
| `editor/EditorCanvas.tsx` | Modify | Pass onUpdateField to field cards |
| `editor/FormEditorPanel.tsx` | Modify | Pass handleUpdateField to canvas |
| `editor/FieldConfigPanel.tsx` | Modify | Add data source selector, remove Levelset info |
| `editor/FieldConfigPanel.module.css` | Modify | Rename Levelset styles to data source styles |
| `FormRenderer.tsx` | Modify | Add custom fields registry |
| `widgets/EmployeeSelectWidget.tsx` | Delete | Replaced by DataSelectWidget |
| `widgets/LeaderSelectWidget.tsx` | Delete | Replaced by DataSelectWidget |
| `widgets/PositionSelectWidget.tsx` | Delete | Replaced by DataSelectWidget |
| `widgets/InfractionSelectWidget.tsx` | Delete | Replaced by DataSelectWidget |
| `widgets/DiscActionSelectWidget.tsx` | Delete | Replaced by DataSelectWidget |
| `scripts/migrate-levelset-fields-to-select.ts` | Create | Database migration script |
