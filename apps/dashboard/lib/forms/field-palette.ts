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
