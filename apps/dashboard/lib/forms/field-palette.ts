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
}

export type FieldCategory = 'basic' | 'selection' | 'advanced' | 'levelset';

export const FIELD_CATEGORIES: { key: FieldCategory; label: string; labelEs: string }[] = [
  { key: 'basic', label: 'Basic', labelEs: 'Básico' },
  { key: 'selection', label: 'Selection', labelEs: 'Selección' },
  { key: 'advanced', label: 'Advanced', labelEs: 'Avanzado' },
  { key: 'levelset', label: 'Levelset', labelEs: 'Levelset' },
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
    labelEs: 'Número',
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
  select: {
    type: 'select',
    label: 'Dropdown',
    labelEs: 'Lista Desplegable',
    icon: 'ArrowDropDownCircleOutlined',
    category: 'selection',
    schema: { type: 'string', enum: ['Option 1', 'Option 2'] },
    hasOptions: true,
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
    labelEs: 'Calificación (1-3)',
    icon: 'StarHalfOutlined',
    category: 'advanced',
    schema: {
      type: 'integer',
      minimum: 1,
      maximum: 3,
      enum: [1, 2, 3],
    },
    uiWidget: 'radio',
  },
  rating_1_5: {
    type: 'rating_1_5',
    label: 'Rating (1-5)',
    labelEs: 'Calificación (1-5)',
    icon: 'StarOutlined',
    category: 'advanced',
    schema: {
      type: 'integer',
      minimum: 1,
      maximum: 5,
      enum: [1, 2, 3, 4, 5],
    },
    uiWidget: 'radio',
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
  section: {
    type: 'section',
    label: 'Section Header',
    labelEs: 'Encabezado de Sección',
    icon: 'ViewAgendaOutlined',
    category: 'basic',
    schema: { type: 'null' },
    uiWidget: 'hidden',
  },
  employee_select: {
    type: 'employee_select',
    label: 'Employee',
    labelEs: 'Empleado',
    icon: 'PersonOutlined',
    category: 'levelset',
    schema: { type: 'string' },
    uiWidget: 'employee_select',
  },
  leader_select: {
    type: 'leader_select',
    label: 'Leader',
    labelEs: 'Líder',
    icon: 'SupervisorAccountOutlined',
    category: 'levelset',
    schema: { type: 'string' },
    uiWidget: 'leader_select',
  },
  position_select: {
    type: 'position_select',
    label: 'Position',
    labelEs: 'Posición',
    icon: 'WorkOutlineOutlined',
    category: 'levelset',
    schema: { type: 'string' },
    uiWidget: 'position_select',
  },
};

/**
 * Get field types grouped by category
 */
export function getFieldTypesByCategory(): Record<FieldCategory, FieldTypeDefinition[]> {
  const grouped: Record<FieldCategory, FieldTypeDefinition[]> = {
    basic: [],
    selection: [],
    advanced: [],
    levelset: [],
  };

  for (const field of Object.values(FIELD_TYPES)) {
    grouped[field.category].push(field);
  }

  return grouped;
}
