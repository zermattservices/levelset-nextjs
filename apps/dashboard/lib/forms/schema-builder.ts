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
  /** For import: maps scored field to evaluation section ID */
  evaluationSectionId?: string;
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
