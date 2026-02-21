/**
 * Schema Builder
 *
 * Converts between the internal FormField representation (used by the editor)
 * and the JSON Schema + UI Schema format (stored in the database and used by RJSF).
 */

import { FIELD_TYPES } from './field-palette';

export interface FormField {
  id: string;
  type: string;
  label: string;
  labelEs: string;
  description?: string;
  descriptionEs?: string;
  required: boolean;
  /** For select/radio/checkbox */
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

    // Build property schema from field definition and overrides
    const propSchema: Record<string, any> = {
      ...JSON.parse(JSON.stringify(fieldDef.schema)),
      title: field.label,
    };

    if (field.description) {
      propSchema.description = field.description;
    }

    // Apply options for select/radio/checkbox
    if (field.options && field.options.length > 0) {
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

    if (fieldDef.uiWidget) {
      fieldUiSchema['ui:widget'] = fieldDef.uiWidget;
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
      ...(field.settings.weight !== undefined ? { weight: field.settings.weight } : {}),
      ...(field.settings.scoringType ? { scoringType: field.settings.scoringType } : {}),
      ...(field.settings.connectedTo ? { connectedTo: field.settings.connectedTo } : {}),
      ...(field.settings.connectorParams ? { connectorParams: field.settings.connectorParams } : {}),
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

    // Restore options for select/radio/checkbox
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

    // Restore section settings
    if (fieldType === 'section') {
      field.settings.sectionName = fieldUiSchema['ui:options']?.sectionName || field.label;
      field.settings.sectionNameEs = fieldUiSchema['ui:options']?.sectionNameEs || field.labelEs;
    }

    // Restore evaluation settings from metadata
    if (meta.weight !== undefined) field.settings.weight = meta.weight;
    if (meta.scoringType) field.settings.scoringType = meta.scoringType;
    if (meta.connectedTo) field.settings.connectedTo = meta.connectedTo;
    if (meta.connectorParams) field.settings.connectorParams = meta.connectorParams;

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
  if (widget === 'signature') return 'signature';
  if (widget === 'file') return 'file_upload';
  if (widget === 'employee_select') return 'employee_select';
  if (widget === 'leader_select') return 'leader_select';
  if (widget === 'position_select') return 'position_select';
  if (widget === 'infraction_select') return 'infraction_select';
  if (widget === 'disc_action_select') return 'disc_action_select';
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
