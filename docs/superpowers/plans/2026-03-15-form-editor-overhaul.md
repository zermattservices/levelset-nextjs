# Form Editor Overhaul Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify sections as draggable containers, add per-field scored toggle, replace /100 scoring with additive points, and rename percentage to numeric_score.

**Architecture:** Sections become first-class container fields with `children: string[]` in the fields array. Scoring metadata (scored, weight) moves onto individual field settings — no separate `template.settings.evaluation` metadata. Scoring type is auto-derived from field type. The EditorCanvas section container UI (currently eval-only) becomes universal for all form types.

**Tech Stack:** Next.js Pages Router, React, MUI v7, @dnd-kit, RJSF (@rjsf/mui), CSS Modules, Supabase (JSONB)

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `apps/dashboard/lib/forms/field-palette.ts` | Rename `percentage` → `numeric_score`, update section definition |
| Modify | `apps/dashboard/lib/forms/schema-builder.ts` | Add `children`, `scored`, `maxValue` to FormField/FieldSettings; serialize/restore section children; remove `scoringType` |
| Modify | `apps/dashboard/lib/forms/scoring.ts` | New scoring math; derive from fields array instead of evaluation settings |
| Modify | `apps/dashboard/lib/forms/import-prompt.ts` | Update for `numeric_score`, new scoring model |
| Modify | `apps/dashboard/components/forms/editor/EditorCanvas.tsx` | Universal section containers for all form types |
| Modify | `apps/dashboard/components/forms/editor/EditorFieldCard.tsx` | Show scoring from field.settings, not evaluationQuestion prop |
| Modify | `apps/dashboard/components/forms/editor/FieldConfigPanel.tsx` | Scored toggle + weight; remove section/scoring-type dropdowns |
| Modify | `apps/dashboard/components/forms/editor/FormEditorPanel.tsx` | Remove eval-specific plumbing; sections managed via fields array |
| Modify | `apps/dashboard/components/forms/editor/FieldPalette.tsx` | No code change needed — palette reads from FIELD_TYPES |
| Create | `apps/dashboard/components/forms/widgets/NumericScoreWidget.tsx` | RJSF widget rendering `___ / {maxValue}` input |
| Modify | `apps/dashboard/components/forms/widgets/index.ts` | Register `numeric_score` widget |
| Modify | `apps/dashboard/components/forms/FormRenderer.tsx` | No changes needed — picks up widgets/fields from registry |
| Modify | `apps/dashboard/components/pages/FormDetailPage.tsx` | Remove EvaluationSettingsModal, gear icon, onSaveSettings |
| Modify | `apps/dashboard/components/forms/evaluation/EvaluationScoreDisplay.tsx` | Update to work with new scoring output |
| Modify | `apps/dashboard/pages/api/forms/submissions.ts` | Extract scoring from schema/uiSchema instead of template.settings.evaluation |

---

## Chunk 1: Data Model & Scoring Engine

### Task 1: Update Field Palette — Rename percentage to numeric_score

**Files:**
- Modify: `apps/dashboard/lib/forms/field-palette.ts`

- [ ] **Step 1: Rename the percentage field type to numeric_score**

In `FIELD_TYPES`, replace the `percentage` entry:

```typescript
numeric_score: {
  type: 'numeric_score',
  label: 'Numeric Score',
  labelEs: 'Puntuacion Numerica',
  icon: 'PercentOutlined', // reuse the same icon
  category: 'advanced',
  schema: {
    type: 'number',
    minimum: 0,
  },
  uiWidget: 'numeric_score',
  /** If true, this field supports a max value configuration */
  hasRange: true,
},
```

Remove the old `percentage` entry entirely.

- [ ] **Step 2: Rename Section Header to Section in the palette**

Update the `section` entry in `FIELD_TYPES` to remove "Header":

```typescript
section: {
  type: 'section',
  label: 'Section',
  labelEs: 'Seccion',
  icon: 'ViewAgendaOutlined',
  category: 'basic',
  schema: { type: 'null' },
  uiWidget: 'hidden',
},
```

- [ ] **Step 3: Verify build**

Run: `pnpm --filter dashboard build 2>&1 | head -60`

Fix any import errors referencing `percentage` type. The main places to grep:
- `scoring.ts` (handled in Task 3)
- `schema-builder.ts` (handled in Task 2)
- `FieldConfigPanel.tsx` (handled in Task 6)
- `import-prompt.ts` (handled in Task 9)

- [ ] **Step 4: Commit**

```bash
git add apps/dashboard/lib/forms/field-palette.ts
git commit -m "refactor(forms): rename percentage field type to numeric_score"
```

---

### Task 2: Update Schema Builder — New Data Model

**Files:**
- Modify: `apps/dashboard/lib/forms/schema-builder.ts`

- [ ] **Step 1: Update FormField and FieldSettings interfaces**

```typescript
export interface FormField {
  id: string;
  type: string;
  label: string;
  labelEs: string;
  description?: string;
  descriptionEs?: string;
  required: boolean;
  options?: FieldOption[];
  settings: FieldSettings;
  sectionId?: string;
  /** For section fields: ordered list of child field IDs */
  children?: string[];
}

export interface FieldSettings {
  min?: number;
  max?: number;
  rows?: number;
  /** Whether this field is scored (only for scorable types) */
  scored?: boolean;
  /** Points this question is worth when scored */
  weight?: number;
  /** For numeric_score: maximum input value (denominator) */
  maxValue?: number;
  connectedTo?: string;
  connectorParams?: Record<string, any>;
  sectionName?: string;
  sectionNameEs?: string;
  dataSource?: DataSource;
  maxHierarchyLevel?: number;
  roleFilter?: string[];
  content?: string;
  contentEs?: string;
  evaluationSectionId?: string;
  // REMOVED: scoringType (auto-derived from field.type)
}
```

- [ ] **Step 2: Update createFieldFromType for numeric_score**

Add handling for `numeric_score` default settings:

```typescript
// Set default maxValue for numeric_score
if (fieldType === 'numeric_score') {
  field.settings.maxValue = 10;
}
```

Also update the section creation to initialize `children`:

```typescript
if (fieldType === 'section') {
  field.settings.sectionName = 'New Section';
  field.settings.sectionNameEs = 'Nueva Seccion';
  field.children = [];
}
```

- [ ] **Step 3: Update fieldsToJsonSchema — section children serialization**

In the section handling block (currently lines 136-151), add children to fieldMeta:

```typescript
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
    'ui:fieldMeta': {
      fieldType: 'section',
      labelEs: field.labelEs,
      children: field.children || [],
    },
  };
  uiSchema['ui:order'].push(field.id);
  continue;
}
```

- [ ] **Step 4: Update fieldsToJsonSchema — scored field metadata**

In the `ui:fieldMeta` block (currently lines 243-257), replace `scoringType` and `weight` with new fields:

```typescript
fieldUiSchema['ui:fieldMeta'] = {
  fieldType: field.type,
  labelEs: field.labelEs,
  descriptionEs: field.descriptionEs,
  sectionId: field.sectionId,
  ...(field.settings.dataSource && field.settings.dataSource !== 'custom'
    ? { dataSource: field.settings.dataSource }
    : {}),
  ...(field.settings.scored ? { scored: true } : {}),
  ...(field.settings.weight !== undefined ? { weight: field.settings.weight } : {}),
  ...(field.settings.maxValue !== undefined ? { maxValue: field.settings.maxValue } : {}),
  ...(field.settings.connectedTo ? { connectedTo: field.settings.connectedTo } : {}),
  ...(field.settings.connectorParams ? { connectorParams: field.settings.connectorParams } : {}),
  ...(field.settings.roleFilter && field.settings.roleFilter.length > 0 ? { roleFilter: field.settings.roleFilter } : {}),
};
```

Remove the `maxHierarchyLevel` line (deprecated).

- [ ] **Step 5: Update fieldsToJsonSchema — numeric_score widget and schema**

Add handling for `numeric_score` when building the property schema. After the range application block:

```typescript
// For numeric_score, set max from maxValue setting
if (field.type === 'numeric_score' && field.settings.maxValue !== undefined) {
  propSchema.maximum = field.settings.maxValue;
}
```

And for the widget selection, the `numeric_score` uiWidget is already set from `fieldDef.uiWidget` ('numeric_score'), so the existing code handles it.

- [ ] **Step 6: Update jsonSchemaToFields — restore section children**

In the section restoration block (currently lines 332-335), add children:

```typescript
if (fieldType === 'section') {
  field.settings.sectionName = fieldUiSchema['ui:options']?.sectionName || field.label;
  field.settings.sectionNameEs = fieldUiSchema['ui:options']?.sectionNameEs || field.labelEs;
  field.children = meta.children || [];
}
```

- [ ] **Step 7: Update jsonSchemaToFields — restore scoring settings**

Replace the old evaluation metadata restoration (currently lines 373-378) with:

```typescript
if (meta.scored) field.settings.scored = true;
if (meta.weight !== undefined) field.settings.weight = meta.weight;
if (meta.maxValue !== undefined) field.settings.maxValue = meta.maxValue;
if (meta.connectedTo) field.settings.connectedTo = meta.connectedTo;
if (meta.connectorParams) field.settings.connectorParams = meta.connectorParams;
if (meta.roleFilter) field.settings.roleFilter = meta.roleFilter;
```

Remove the old `scoringType` restoration.

- [ ] **Step 8: Add backward compat in jsonSchemaToFields for old scoringType**

After the metadata restoration, add a backward compatibility shim that converts old format:

```typescript
// Backward compat: old format stored scoringType separately
if (meta.scoringType && !field.settings.scored) {
  field.settings.scored = true;
  if (meta.weight !== undefined) field.settings.weight = meta.weight;
}
```

- [ ] **Step 9: Add legacy migration function for existing evaluation forms**

Existing evaluation forms store section structure in `template.settings.evaluation` (not in the fields array). When loaded in the editor, we need to reconstruct section containers and scoring metadata from the old format.

Add this function to `schema-builder.ts`:

```typescript
/**
 * Migrate legacy evaluation form data into the fields array.
 *
 * Old format: sections and question scoring metadata stored separately
 * in template.settings.evaluation.sections and template.settings.evaluation.questions.
 *
 * New format: sections are fields with children[], scoring is in field.settings.
 *
 * Call this after jsonSchemaToFields() when template.settings.evaluation exists
 * and the fields array has no section-type fields.
 */
export function migrateEvaluationToFields(
  fields: FormField[],
  evaluationSettings: {
    sections?: Array<{ id: string; name: string; nameEs?: string; order: number }>;
    questions?: Record<string, {
      section_id: string;
      weight: number;
      scoring_type: string;
      connected_to?: string;
      connector_params?: Record<string, any>;
    }>;
  }
): FormField[] {
  const sections = evaluationSettings.sections || [];
  const questions = evaluationSettings.questions || {};

  // If fields already have sections, skip migration
  if (fields.some((f) => f.type === 'section')) return fields;
  // If no legacy sections/questions, nothing to migrate
  if (sections.length === 0 && Object.keys(questions).length === 0) return fields;

  const migratedFields = fields.map((f) => ({ ...f, settings: { ...f.settings } }));

  // Apply scoring metadata from evaluationQuestions to each field
  for (const [fieldId, qConfig] of Object.entries(questions)) {
    const field = migratedFields.find((f) => f.id === fieldId);
    if (!field) continue;

    field.settings.scored = true;
    field.settings.weight = qConfig.weight;
    if (qConfig.connected_to) {
      field.settings.connectedTo = qConfig.connected_to;
      field.settings.connectorParams = qConfig.connector_params;
    }
  }

  // Create section container fields from evaluation sections
  // Sort sections by order, then insert them into the fields array
  const sortedSections = [...sections].sort((a, b) => a.order - b.order);
  const result: FormField[] = [];

  // Collect fields not assigned to any section
  const assignedFieldIds = new Set(
    Object.entries(questions)
      .filter(([, q]) => q.section_id)
      .map(([fieldId]) => fieldId)
  );

  // Add unassigned fields first (top-level)
  for (const f of migratedFields) {
    if (!assignedFieldIds.has(f.id)) {
      result.push(f);
    }
  }

  // Add each section with its children
  for (const section of sortedSections) {
    const childIds = Object.entries(questions)
      .filter(([, q]) => q.section_id === section.id)
      .map(([fieldId]) => fieldId);

    const sectionField: FormField = {
      id: `section_${section.id}`,
      type: 'section',
      label: section.name,
      labelEs: section.nameEs || '',
      required: false,
      settings: {
        sectionName: section.name,
        sectionNameEs: section.nameEs || '',
      },
      children: childIds,
    };

    result.push(sectionField);

    // Add the child fields after the section
    for (const childId of childIds) {
      const child = migratedFields.find((f) => f.id === childId);
      if (child) result.push(child);
    }
  }

  return result;
}
```

- [ ] **Step 10: Update inferFieldType — handle numeric_score**

In `inferFieldType`, replace the percentage detection:

```typescript
if (propSchema.type === 'number') {
  if (uiSchema?.['ui:widget'] === 'numeric_score') return 'numeric_score';
  if (propSchema.minimum === 0 && propSchema.maximum === 100) return 'numeric_score'; // backward compat for old percentage
  return 'number';
}
```

- [ ] **Step 11: Commit**

```bash
git add apps/dashboard/lib/forms/schema-builder.ts
git commit -m "refactor(forms): update schema builder for sections with children and scored fields"
```

---

### Task 3: Rewrite Scoring Engine

**Files:**
- Modify: `apps/dashboard/lib/forms/scoring.ts`

- [ ] **Step 1: Define the scorable type set and new scoring math**

Replace the entire file content. The new scoring engine derives everything from the fields array:

```typescript
/**
 * Evaluation Scoring Engine
 *
 * Calculates scores from form fields with scored=true in their settings.
 * Scoring type is auto-derived from field type.
 * Sections aggregate points from their scored children.
 */

import type { FormField } from './schema-builder';

/** Types that can be scored */
export const SCORABLE_TYPES = new Set([
  'rating_1_3',
  'rating_1_5',
  'true_false',
  'numeric_score',
]);

export function isScorable(fieldType: string): boolean {
  return SCORABLE_TYPES.has(fieldType);
}

export interface ScoredQuestion {
  fieldId: string;
  sectionId: string | null;
  fieldType: string;
  weight: number;
  maxValue?: number;
  rawAnswer: any;
  earnedPoints: number;
  maxPoints: number;
}

export interface SectionScore {
  sectionId: string;
  sectionName: string;
  questions: ScoredQuestion[];
  earnedPoints: number;
  maxPoints: number;
  percentage: number;
}

export interface EvaluationScore {
  sections: SectionScore[];
  unscoredQuestions: ScoredQuestion[];
  totalEarned: number;
  totalMax: number;
  overallPercentage: number;
}

/**
 * Score a single question answer based on field type.
 */
export function scoreQuestion(
  answer: any,
  fieldType: string,
  weight: number,
  maxValue?: number
): { earned: number; max: number } {
  const max = weight;

  if (answer == null || answer === '') {
    return { earned: 0, max };
  }

  switch (fieldType) {
    case 'rating_1_3': {
      const val = Number(answer);
      if (isNaN(val) || val < 1 || val > 3) return { earned: 0, max };
      // 1=0%, 2=50%, 3=100%
      return { earned: ((val - 1) / 2) * weight, max };
    }
    case 'rating_1_5': {
      const val = Number(answer);
      if (isNaN(val) || val < 1 || val > 5) return { earned: 0, max };
      // 1=0%, 2=25%, 3=50%, 4=75%, 5=100%
      return { earned: ((val - 1) / 4) * weight, max };
    }
    case 'true_false': {
      const isTrue = answer === true || answer === 'true' || answer === 1;
      return { earned: isTrue ? weight : 0, max };
    }
    case 'numeric_score': {
      const val = Number(answer);
      if (isNaN(val) || val < 0) return { earned: 0, max };
      const denominator = maxValue || 1;
      const clamped = Math.min(val, denominator);
      return { earned: (clamped / denominator) * weight, max };
    }
    default:
      return { earned: 0, max };
  }
}

/**
 * Calculate the full evaluation score from fields and response data.
 *
 * Sections are identified by type='section' fields with children arrays.
 * Scored questions are fields with settings.scored=true.
 *
 * @param fields - The form's FormField array (with sections and their children)
 * @param responseData - The submitted form answers keyed by field ID
 */
export function calculateEvaluationScore(
  fields: FormField[],
  responseData: Record<string, any>
): EvaluationScore {
  // Build a map of all fields by ID
  const fieldMap = new Map<string, FormField>();
  for (const f of fields) fieldMap.set(f.id, f);

  // Build section map: sectionId -> child field IDs
  const sections: Array<{ id: string; name: string; childIds: string[] }> = [];
  const childToSection = new Map<string, string>();

  for (const field of fields) {
    if (field.type === 'section' && field.children) {
      sections.push({
        id: field.id,
        name: field.settings.sectionName || field.label,
        childIds: field.children,
      });
      for (const childId of field.children) {
        childToSection.set(childId, field.id);
      }
    }
  }

  // Score all scored fields
  const sectionScoreMap = new Map<string, SectionScore>();
  const unscoredQuestions: ScoredQuestion[] = [];

  for (const section of sections) {
    sectionScoreMap.set(section.id, {
      sectionId: section.id,
      sectionName: section.name,
      questions: [],
      earnedPoints: 0,
      maxPoints: 0,
      percentage: 0,
    });
  }

  for (const field of fields) {
    if (!field.settings.scored || !isScorable(field.type)) continue;

    const weight = field.settings.weight || 0;
    if (weight <= 0) continue;

    const answer = responseData[field.id];
    const { earned, max } = scoreQuestion(
      answer,
      field.type,
      weight,
      field.settings.maxValue
    );

    const scored: ScoredQuestion = {
      fieldId: field.id,
      sectionId: childToSection.get(field.id) || null,
      fieldType: field.type,
      weight,
      maxValue: field.settings.maxValue,
      rawAnswer: answer,
      earnedPoints: earned,
      maxPoints: max,
    };

    const parentSectionId = childToSection.get(field.id);
    if (parentSectionId) {
      const section = sectionScoreMap.get(parentSectionId);
      if (section) {
        section.questions.push(scored);
        section.earnedPoints += earned;
        section.maxPoints += max;
      }
    } else {
      unscoredQuestions.push(scored);
    }
  }

  // Calculate section percentages
  for (const section of sectionScoreMap.values()) {
    section.percentage = section.maxPoints > 0
      ? (section.earnedPoints / section.maxPoints) * 100
      : 0;
  }

  // Filter to sections with scored questions, maintain order
  const scoredSections = sections
    .map((s) => sectionScoreMap.get(s.id)!)
    .filter((s) => s.questions.length > 0);

  const allQuestions = [
    ...scoredSections.flatMap((s) => s.questions),
    ...unscoredQuestions,
  ];

  const totalEarned = allQuestions.reduce((sum, q) => sum + q.earnedPoints, 0);
  const totalMax = allQuestions.reduce((sum, q) => sum + q.maxPoints, 0);
  const overallPercentage = totalMax > 0 ? (totalEarned / totalMax) * 100 : 0;

  return {
    sections: scoredSections,
    unscoredQuestions,
    totalEarned,
    totalMax,
    overallPercentage,
  };
}

/**
 * Backward-compatible wrapper for old evaluation settings format.
 * Converts template.settings.evaluation into fields format and scores.
 */
export function calculateEvaluationScoreLegacy(
  responseData: Record<string, any>,
  evaluationSettings: {
    sections?: Array<{ id: string; name: string; order: number }>;
    questions?: Record<string, {
      section_id: string;
      weight: number;
      scoring_type: string;
    }>;
  }
): EvaluationScore {
  // Build synthetic fields from old format
  const fields: FormField[] = [];
  const sections = evaluationSettings.sections || [];
  const questions = evaluationSettings.questions || {};

  // Create section fields
  for (const section of sections) {
    const childIds = Object.entries(questions)
      .filter(([, q]) => q.section_id === section.id)
      .map(([fieldId]) => fieldId);

    fields.push({
      id: section.id,
      type: 'section',
      label: section.name,
      labelEs: '',
      required: false,
      settings: { sectionName: section.name },
      children: childIds,
    });
  }

  // Create question fields
  for (const [fieldId, qConfig] of Object.entries(questions)) {
    // Map old scoring_type to field type
    let fieldType = qConfig.scoring_type;
    if (fieldType === 'percentage') fieldType = 'numeric_score';

    fields.push({
      id: fieldId,
      type: fieldType,
      label: fieldId,
      labelEs: '',
      required: false,
      settings: {
        scored: true,
        weight: qConfig.weight,
      },
    });
  }

  return calculateEvaluationScore(fields, responseData);
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/dashboard/lib/forms/scoring.ts
git commit -m "refactor(forms): rewrite scoring engine for field-based scoring model"
```

---

### Task 4: Create NumericScoreWidget

**Files:**
- Create: `apps/dashboard/components/forms/widgets/NumericScoreWidget.tsx`
- Modify: `apps/dashboard/components/forms/widgets/index.ts`

- [ ] **Step 1: Create the NumericScoreWidget**

```tsx
import * as React from 'react';
import { Box, TextField, Typography, FormHelperText } from '@mui/material';
import type { WidgetProps } from '@rjsf/utils';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

/**
 * Numeric score widget for RJSF forms.
 * Renders as a number input with " / {maxValue}" suffix.
 */
export function NumericScoreWidget(props: WidgetProps) {
  const { value, required, disabled, readonly, onChange, label, schema, rawErrors } = props;

  const maxValue = schema.maximum ?? 10;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <TextField
          type="number"
          value={value ?? ''}
          onChange={(e) => {
            const val = e.target.value === '' ? undefined : Number(e.target.value);
            onChange(val);
          }}
          size="small"
          required={required}
          disabled={disabled || readonly}
          inputProps={{
            min: 0,
            max: maxValue,
            step: 0.1,
            style: { fontFamily, fontSize: 14, textAlign: 'right', width: 80 },
          }}
          sx={{
            width: 100,
            '& .MuiOutlinedInput-root': {
              fontFamily,
              borderRadius: '8px',
            },
          }}
        />
        <Typography
          sx={{
            fontFamily,
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--ls-color-muted)',
            whiteSpace: 'nowrap',
          }}
        >
          / {maxValue}
        </Typography>
      </Box>

      {rawErrors && rawErrors.length > 0 && (
        <FormHelperText error sx={{ fontFamily, fontSize: 12 }}>
          {rawErrors[0]}
        </FormHelperText>
      )}
    </Box>
  );
}
```

- [ ] **Step 2: Register the widget**

In `apps/dashboard/components/forms/widgets/index.ts`, add the import and registration:

```typescript
import { NumericScoreWidget } from './NumericScoreWidget';

// In customWidgets:
export const customWidgets: RegistryWidgetsType = {
  signature: SignatureWidget,
  ratingScale: RatingScaleWidget,
  data_select: DataSelectWidget,
  file: FileUploadWidget,
  numeric_score: NumericScoreWidget,
};
```

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/components/forms/widgets/NumericScoreWidget.tsx apps/dashboard/components/forms/widgets/index.ts
git commit -m "feat(forms): add NumericScoreWidget for scored numeric input"
```

---

## Chunk 2: Editor UI Overhaul

### Task 5: Update EditorCanvas — Universal Section Containers

**Files:**
- Modify: `apps/dashboard/components/forms/editor/EditorCanvas.tsx`

This is the most complex task. The canvas currently has two rendering paths: eval-grouped (sections) and flat (non-eval). We're merging them into one path that always supports sections.

- [ ] **Step 1: Update EditorCanvasProps — remove eval-specific props**

```typescript
interface EditorCanvasProps {
  fields: FormField[];
  selectedFieldId: string | null;
  onSelectField: (id: string | null) => void;
  onDeleteField: (id: string) => void;
  onUpdateField?: (id: string, updates: Partial<FormField>) => void;
  formType?: string;
}
```

Remove: `evaluationSections`, `evaluationQuestions`, `onUpdateEvaluationQuestion`.

- [ ] **Step 2: Derive sections and structure from the fields array**

Replace the current `isEvalGrouped` branching with a universal approach. Sections are fields with `type === 'section'`. Children are tracked in `field.children[]`.

```typescript
export function EditorCanvas({
  fields,
  selectedFieldId,
  onSelectField,
  onDeleteField,
  onUpdateField,
  formType,
}: EditorCanvasProps) {
  // ... droppable setup, collapsedSections state ...

  // Identify sections and build structure from the fields array
  const sectionFields = React.useMemo(
    () => fields.filter((f) => f.type === 'section'),
    [fields]
  );

  const hasSections = sectionFields.length > 0;

  // Build a set of all field IDs that are children of a section
  const childFieldIds = React.useMemo(() => {
    const set = new Set<string>();
    for (const section of sectionFields) {
      for (const childId of section.children || []) {
        set.add(childId);
      }
    }
    return set;
  }, [sectionFields]);

  // Top-level fields (not inside any section, and not sections themselves)
  const topLevelFields = React.useMemo(
    () => fields.filter((f) => f.type !== 'section' && !childFieldIds.has(f.id)),
    [fields, childFieldIds]
  );

  // Build fieldIds in visual order for SortableContext
  const fieldIds = React.useMemo(() => {
    if (!hasSections) return fields.map((f) => f.id);

    const ordered: string[] = [];
    // Process fields in array order: top-level and sections interleaved
    for (const field of fields) {
      if (field.type === 'section') {
        // Don't add section itself to sortable — it's rendered as a container
        for (const childId of field.children || []) {
          ordered.push(childId);
        }
      } else if (!childFieldIds.has(field.id)) {
        ordered.push(field.id);
      }
    }
    return ordered;
  }, [fields, hasSections, childFieldIds]);

  // Section stats: field count and total weight from scored children
  const sectionStats = React.useMemo(() => {
    const stats = new Map<string, { fieldCount: number; totalWeight: number }>();
    const fieldMap = new Map(fields.map((f) => [f.id, f]));

    for (const section of sectionFields) {
      let fieldCount = 0;
      let totalWeight = 0;
      for (const childId of section.children || []) {
        const child = fieldMap.get(childId);
        if (child) {
          fieldCount++;
          if (child.settings.scored && child.settings.weight) {
            totalWeight += child.settings.weight;
          }
        }
      }
      stats.set(section.id, { fieldCount, totalWeight });
    }
    return stats;
  }, [fields, sectionFields]);

  // Total weight across ALL scored fields (in sections + top-level)
  const totalWeight = React.useMemo(() => {
    return fields
      .filter((f) => f.settings.scored && f.settings.weight)
      .reduce((sum, f) => sum + (f.settings.weight || 0), 0);
  }, [fields]);

  const hasScoredFields = totalWeight > 0;
```

- [ ] **Step 3: Update the rendering — always show section containers when sections exist**

Replace the three-way rendering (`empty` / `isEvalGrouped` / `flat`) with a two-way (`empty` / `universal`):

The universal path renders fields in array order. When it encounters a section, it renders the section container with its children. Non-section fields at the top level render normally.

```typescript
// In the render return, replace the isEvalGrouped ternary:
{fields.length === 0 ? (
  // ... empty state unchanged ...
) : (
  <SortableContext items={fieldIds} strategy={verticalListSortingStrategy}>
    <div className={sty.fieldList}>
      {fields.map((field) => {
        if (field.type === 'section') {
          const childFields = (field.children || [])
            .map((id) => fields.find((f) => f.id === id))
            .filter(Boolean) as FormField[];
          const stats = sectionStats.get(field.id) || { fieldCount: 0, totalWeight: 0 };
          const isCollapsed = collapsedSections.has(field.id);

          return (
            <React.Fragment key={`section-${field.id}`}>
              <div className={sty.sectionContainer}>
                <div
                  className={`${sty.sectionHeader} ${isCollapsed ? sty.sectionHeaderCollapsed : ''}`}
                  onClick={() => toggleSection(field.id)}
                >
                  {isCollapsed ? (
                    <KeyboardArrowRightIcon sx={{ fontSize: 18, color: 'var(--ls-color-muted)' }} />
                  ) : (
                    <KeyboardArrowDownIcon sx={{ fontSize: 18, color: 'var(--ls-color-muted)' }} />
                  )}
                  <span className={sty.sectionName}>
                    {field.settings.sectionName || field.label}
                  </span>
                  <div className={sty.sectionMeta}>
                    <span className={sty.sectionFieldCount}>
                      {stats.fieldCount} field{stats.fieldCount !== 1 ? 's' : ''}
                    </span>
                    {stats.totalWeight > 0 && (
                      <span className={sty.sectionWeight}>
                        {stats.totalWeight}pts
                      </span>
                    )}
                  </div>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteField(field.id);
                    }}
                    sx={{
                      padding: '2px',
                      opacity: 0.4,
                      '&:hover': { opacity: 1, color: 'var(--ls-color-destructive)' },
                    }}
                  >
                    <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </div>
                {!isCollapsed && (
                  <DroppableSectionBody
                    sectionId={field.id}
                    isEmpty={childFields.length === 0}
                    fieldIds={childFields.map((f) => f.id)}
                  >
                    {childFields.map((f) => renderFieldCard(f))}
                  </DroppableSectionBody>
                )}
              </div>
              <SectionGapDropzone
                key={`gap-after-${field.id}`}
                gapId={`section-gap-after-${field.id}`}
                afterSectionId={field.id}
              />
            </React.Fragment>
          );
        }

        // Skip fields that are children of a section (rendered inside their section above)
        if (childFieldIds.has(field.id)) return null;

        // Top-level field
        return renderFieldCard(field);
      })}

      {/* Weight total bar — only show when there are scored fields */}
      {hasScoredFields && (
        <div className={sty.weightTotalBar}>
          <span className={sty.weightTotalText}>
            Total: {totalWeight} pts
          </span>
        </div>
      )}

Note: Remove the old `sty.weightBalanced` / `sty.weightUnbalanced` CSS classes from `EditorCanvas.module.css` — they enforced the /100 constraint which no longer applies.
    </div>
  </SortableContext>
)}
```

- [ ] **Step 4: Update renderFieldCard — remove evaluationQuestion dependency**

```typescript
const renderFieldCard = (field: FormField) => (
  <EditorFieldCard
    key={field.id}
    field={field}
    isSelected={selectedFieldId === field.id}
    onSelect={() => onSelectField(field.id)}
    onDelete={() => onDeleteField(field.id)}
    onUpdateField={onUpdateField}
    formType={formType}
  />
);
```

Remove the `evaluationQuestion` and `onUpdateWeight` props — scoring is now read from `field.settings` directly by EditorFieldCard.

- [ ] **Step 5: Update DroppableSectionBody empty text**

Change the empty section text from "Drag fields here to score them" to "Drag fields here":

```typescript
{isEmpty && !isOver && (
  <span className={sty.sectionFieldsEmptyText}>Drag fields here</span>
)}
```

- [ ] **Step 6: Add DeleteOutlineIcon import and IconButton import**

Add at the top of the file:
```typescript
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { IconButton } from '@mui/material';
```

- [ ] **Step 7: Commit**

```bash
git add apps/dashboard/components/forms/editor/EditorCanvas.tsx
git commit -m "refactor(forms): universal section containers in EditorCanvas"
```

---

### Task 6: Update EditorFieldCard — Scoring from Field Settings

**Files:**
- Modify: `apps/dashboard/components/forms/editor/EditorFieldCard.tsx`

- [ ] **Step 1: Remove evaluationQuestion prop, derive scoring from field.settings**

Update the interface:

```typescript
interface EditorFieldCardProps {
  field: FormField;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onUpdateField?: (id: string, updates: Partial<FormField>) => void;
  isOverlay?: boolean;
  formType?: string;
  disableSortTransform?: boolean;
}
```

Remove: `evaluationQuestion`, `onUpdateWeight`.

- [ ] **Step 2: Update the scoring controls render**

Replace the `evaluationQuestion && evaluationQuestion.section_id` block with:

```typescript
{field.settings.scored && field.settings.weight != null && (
  <div className={sty.scoringControls}>
    <Chip
      label={SCORING_TYPES[field.type]?.label || '?'}
      size="small"
      sx={{
        fontFamily,
        fontSize: 10,
        fontWeight: 700,
        height: 20,
        minWidth: 32,
        borderRadius: '4px',
        backgroundColor: SCORING_TYPES[field.type]?.color || 'var(--ls-color-brand)',
        color: '#fff',
        '& .MuiChip-label': { padding: '0 5px' },
      }}
    />
    <input
      type="number"
      className={sty.weightInput}
      value={field.settings.weight}
      min={0}
      aria-label={`Weight for ${field.label}`}
      onChange={(e) => {
        const val = Math.max(0, Number(e.target.value) || 0);
        onUpdateField?.(field.id, {
          settings: { ...field.settings, weight: val },
        });
      }}
      onClick={(e) => e.stopPropagation()}
    />
  </div>
)}
```

- [ ] **Step 3: Update SCORING_TYPES map to use field types as keys**

```typescript
const SCORING_TYPES: Record<string, { label: string; color: string }> = {
  rating_1_3: { label: '1-3', color: 'var(--ls-color-brand)' },
  rating_1_5: { label: '1-5', color: 'var(--ls-color-brand)' },
  true_false: { label: 'T/F', color: '#6366F1' },
  numeric_score: { label: '#', color: '#D97706' },
};
```

- [ ] **Step 4: Don't render field cards for section-type fields**

Section fields are rendered as containers by EditorCanvas, so if a section field somehow gets passed to EditorFieldCard, hide it. Add at the top of the component:

```typescript
if (field.type === 'section') return null;
```

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/components/forms/editor/EditorFieldCard.tsx
git commit -m "refactor(forms): EditorFieldCard reads scoring from field.settings"
```

---

### Task 7: Update FieldConfigPanel — Scored Toggle, Remove Dropdowns

**Files:**
- Modify: `apps/dashboard/components/forms/editor/FieldConfigPanel.tsx`

- [ ] **Step 1: Update props — remove eval-specific props**

```typescript
interface FieldConfigPanelProps {
  field: FormField | null;
  onUpdateField: (id: string, updates: Partial<FormField>) => void;
  formType?: string;
}
```

Remove: `isEvaluation`, `evaluationSections`, `evaluationQuestion`, `onAssignSection`.

- [ ] **Step 2: Add isScorable import**

```typescript
import { isScorable } from '@/lib/forms/scoring';
```

- [ ] **Step 3: Remove the SCORING_TYPES constant and the old scoring UI**

Delete the `SCORING_TYPES` array (lines 66-71).

- [ ] **Step 4: Remove the section assignment dropdown**

Delete the entire "Evaluation section assignment" block (currently lines 473-498).

- [ ] **Step 5: Replace the scoring settings block with scored toggle + weight**

Replace the "Evaluation scoring settings" block (currently lines 500-557) with:

```typescript
{/* Scored toggle — only for scorable field types */}
{isScorable(field.type) && (
  <>
    <Divider sx={{ margin: '8px 0' }} />
    <div className={sty.configSection}>
      <span className={sty.sectionLabel}>Scoring</span>
      <FormControlLabel
        control={
          <Switch
            checked={!!field.settings.scored}
            onChange={(e) => {
              const scored = e.target.checked;
              onUpdateField(field.id, {
                settings: {
                  ...field.settings,
                  scored,
                  weight: scored ? (field.settings.weight || 10) : undefined,
                },
              });
            }}
            size="small"
            sx={{
              '& .MuiSwitch-switchBase.Mui-checked': {
                color: 'var(--ls-color-brand)',
              },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                backgroundColor: 'var(--ls-color-brand)',
              },
            }}
          />
        }
        label={
          <span style={{ fontFamily, fontSize: 13 }}>Scored</span>
        }
      />

      {field.settings.scored && (
        <StyledTextField
          label="Weight (points)"
          type="number"
          value={field.settings.weight ?? 10}
          onChange={(e) => handleSettingsChange('weight', Math.max(0, Number(e.target.value)))}
          size="small"
          slotProps={{ htmlInput: { min: 0, step: 1 } }}
        />
      )}

      {field.settings.scored && field.settings.connectedTo !== undefined && (
        <>
          <Divider sx={{ margin: '8px 0' }} />
          <div className={sty.configSection}>
            <span className={sty.sectionLabel}>Data Connection</span>
            <ConnectedQuestionPicker
              connectedTo={field.settings.connectedTo}
              connectorParams={field.settings.connectorParams}
              onChange={(connectedTo, params) => {
                onUpdateField(field.id, {
                  settings: {
                    ...field.settings,
                    connectedTo,
                    connectorParams: params,
                  },
                });
              }}
            />
          </div>
        </>
      )}
    </div>
  </>
)}
```

- [ ] **Step 6: Add maxValue setting for numeric_score**

In the number range section (currently checking `fieldDef?.hasRange`), add handling for numeric_score's maxValue:

```typescript
{field.type === 'numeric_score' && (
  <>
    <Divider sx={{ margin: '8px 0' }} />
    <div className={sty.configSection}>
      <span className={sty.sectionLabel}>Max Value</span>
      <StyledTextField
        label="Maximum score value"
        type="number"
        value={field.settings.maxValue ?? 10}
        onChange={(e) => handleSettingsChange('maxValue', Math.max(0.1, Number(e.target.value)))}
        size="small"
        slotProps={{ htmlInput: { min: 0.1, step: 0.5 } }}
        helperText="The denominator shown as ___ / max"
      />
    </div>
  </>
)}
```

- [ ] **Step 7: Update section field config — show section name fields**

When a section field is selected, the config panel should show section name editing. The existing label fields are already shown. Make sure the section name syncs with the label:

Already handled: section fields show label fields. The `sectionName` in settings should be synced from the label. Add to handleLabelChange:

```typescript
const handleLabelChange = (value: string) => {
  const updates: Partial<FormField> = { label: value };
  // Sync section name with label
  if (field.type === 'section') {
    updates.settings = { ...field.settings, sectionName: value };
  }
  onUpdateField(field.id, updates);
};

const handleLabelEsChange = (value: string) => {
  const updates: Partial<FormField> = { labelEs: value };
  if (field.type === 'section') {
    updates.settings = { ...field.settings, sectionNameEs: value };
  }
  onUpdateField(field.id, updates);
};
```

- [ ] **Step 8: Commit**

```bash
git add apps/dashboard/components/forms/editor/FieldConfigPanel.tsx
git commit -m "refactor(forms): scored toggle in field config, remove section/scoring dropdowns"
```

---

### Task 8: Update FormEditorPanel — Remove Eval-Specific Plumbing

**Files:**
- Modify: `apps/dashboard/components/forms/editor/FormEditorPanel.tsx`

- [ ] **Step 1: Remove eval-specific state and plumbing**

Delete:
- `DEFAULT_EVAL_SECTIONS` constant (lines 33-38)
- `evaluationSections` useMemo (lines 59-65)
- `serverQuestions` and `serverQuestionsRef` (lines 66-80)
- `localQuestionOverrides` state (lines 69-71)
- `evaluationQuestions` merged memo (lines 83-90)
- `evalQuestionsRef` (lines 96-97)
- `handleEvalQuestionUpdate` callback (lines 162-180)

- [ ] **Step 2: Add legacy migration in field initialization**

In the `useEffect` that initializes fields from template schema (currently lines 183-191), add the legacy migration call:

```typescript
React.useEffect(() => {
  if (fieldsInitialized.current) return;

  if (template.schema && Object.keys(template.schema).length > 0) {
    let restored = jsonSchemaToFields(template.schema, template.ui_schema || {});

    // Migrate legacy evaluation forms: reconstruct sections and scoring
    // from template.settings.evaluation into the fields array
    if (template.settings?.evaluation) {
      const { migrateEvaluationToFields } = require('@/lib/forms/schema-builder');
      restored = migrateEvaluationToFields(restored, template.settings.evaluation);
    }

    setFields(restored);
  }
  fieldsInitialized.current = true;
}, [template]);
```

Add `migrateEvaluationToFields` to the import from schema-builder at the top of the file.

- [ ] **Step 3: Simplify collision detection**

Replace the complex eval-specific collision detection with a simpler universal version that handles:
1. Section body droppables (dropping into a section)
2. Section gap droppables (removing from section)
3. Regular field-to-field reordering

```typescript
const collisionDetection = React.useMemo<CollisionDetection>(() => {
  return (args) => {
    const nonCanvas = args.droppableContainers.filter((c) => c.id !== 'editor-canvas');

    if (nonCanvas.length > 0) {
      const hits = pointerWithin({ ...args, droppableContainers: nonCanvas });

      if (hits.length > 0) {
        // 1. Gap droppables — highest priority
        const gapHit = hits.find((h) => String(h.id).startsWith('section-gap-'));
        if (gapHit) return [gapHit];

        // 2. Section body droppable
        const sectionHit = hits.find((h) => String(h.id).startsWith('section-drop-'));
        if (sectionHit) return [sectionHit];

        // 3. Field reorder
        return [hits[0]];
      }
    }

    return pointerWithin(args);
  };
}, []);
```

- [ ] **Step 3: Update handleDragEnd — section management via children array**

Replace the section-related logic in handleDragEnd. When a field is dropped into a section, add its ID to that section's `children` array. When dropped into a gap, remove it from any section's children.

```typescript
const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;
  setDraggedField(null);
  if (!over) return;

  const activeData = active.data.current;
  const overData = over.data.current;

  // Dropping from palette onto canvas
  if (activeData?.type === 'palette') {
    const newField = createFieldFromType(activeData.fieldType);

    if (overData?.type === 'section') {
      // Dropped into a section — add to section's children
      const targetSectionId = overData.sectionId as string;
      updateFields((prev) => {
        const next = [...prev, newField];
        return next.map((f) =>
          f.id === targetSectionId
            ? { ...f, children: [...(f.children || []), newField.id] }
            : f
        );
      });
    } else if (over.id !== 'editor-canvas') {
      // Dropped over a field — insert after it
      updateFields((prev) => {
        const overIndex = prev.findIndex((f) => f.id === over.id);
        if (overIndex >= 0) {
          const next = [...prev];
          next.splice(overIndex + 1, 0, newField);
          return next;
        }
        return [...prev, newField];
      });
    } else {
      // Dropped on canvas background — append
      updateFields((prev) => [...prev, newField]);
    }

    setSelectedFieldId(newField.id);
    return;
  }

  // Dropping a field into a section
  if (activeData?.type === 'canvas-field' && overData?.type === 'section') {
    const fieldId = active.id as string;
    const targetSectionId = overData.sectionId as string;

    updateFields((prev) =>
      prev.map((f) => {
        // Remove from any current section's children
        if (f.type === 'section' && f.children?.includes(fieldId)) {
          return { ...f, children: f.children.filter((id) => id !== fieldId) };
        }
        // Add to target section's children
        if (f.id === targetSectionId) {
          return { ...f, children: [...(f.children || []).filter((id) => id !== fieldId), fieldId] };
        }
        return f;
      })
    );
    return;
  }

  // Dropping a field into a gap (between sections) — remove from section
  if (activeData?.type === 'canvas-field' && overData?.type === 'section-gap') {
    const fieldId = active.id as string;
    updateFields((prev) =>
      prev.map((f) => {
        if (f.type === 'section' && f.children?.includes(fieldId)) {
          return { ...f, children: f.children.filter((id) => id !== fieldId) };
        }
        return f;
      })
    );
    return;
  }

  // Reordering within canvas (includes within-section reordering)
  if (activeData?.type === 'canvas-field' && active.id !== over.id) {
    const fieldId = active.id as string;
    const overId = over.id as string;

    updateFields((prev) => {
      // Check if both fields are in the same section — reorder children array
      const parentSection = prev.find(
        (f) => f.type === 'section' && f.children?.includes(fieldId) && f.children?.includes(overId)
      );

      if (parentSection && parentSection.children) {
        // Reorder within the section's children array
        const oldIdx = parentSection.children.indexOf(fieldId);
        const newIdx = parentSection.children.indexOf(overId);
        if (oldIdx >= 0 && newIdx >= 0) {
          const newChildren = [...parentSection.children];
          newChildren.splice(oldIdx, 1);
          newChildren.splice(newIdx, 0, fieldId);
          return prev.map((f) =>
            f.id === parentSection.id ? { ...f, children: newChildren } : f
          );
        }
      }

      // Top-level reorder
      const oldIndex = prev.findIndex((f) => f.id === active.id);
      const newIndex = prev.findIndex((f) => f.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }
};
```

- [ ] **Step 5: Update handleDeleteField — clean up section children references**

When deleting a field, also remove it from any section's children array. When deleting a section, remove all its children references (but keep the child fields at top level):

```typescript
const handleDeleteField = React.useCallback(
  (id: string) => {
    if (selectedFieldId === id) {
      setSelectedFieldId(null);
    }
    updateFields((prev) => {
      // Remove the field
      const filtered = prev.filter((f) => f.id !== id);
      // Clean up any section children references to this field
      return filtered.map((f) => {
        if (f.type === 'section' && f.children?.includes(id)) {
          return { ...f, children: f.children.filter((childId) => childId !== id) };
        }
        return f;
      });
    });
  },
  [selectedFieldId, updateFields]
);
```

- [ ] **Step 6: Update EditorCanvas and FieldConfigPanel prop passing**

Remove eval-specific props from the EditorCanvas usage:

```typescript
<EditorCanvas
  fields={fields}
  selectedFieldId={readOnly ? null : selectedFieldId}
  onSelectField={readOnly ? () => {} : setSelectedFieldId}
  onDeleteField={readOnly ? () => {} : handleDeleteField}
  onUpdateField={readOnly ? undefined : handleUpdateField}
  formType={template.form_type}
/>
```

Update FieldConfigPanel:

```typescript
<FieldConfigPanel
  field={selectedField}
  onUpdateField={handleUpdateField}
  formType={template.form_type}
/>
```

- [ ] **Step 7: Remove onSaveSettings from props**

Update the interface — remove `onSaveSettings`:

```typescript
interface FormEditorPanelProps {
  template: FormTemplate;
  onSave: (schema: Record<string, any>, uiSchema: Record<string, any>) => Promise<void>;
  readOnly?: boolean;
}
```

- [ ] **Step 8: Commit**

```bash
git add apps/dashboard/components/forms/editor/FormEditorPanel.tsx
git commit -m "refactor(forms): remove eval-specific plumbing from FormEditorPanel"
```

---

## Chunk 3: Page Integration, API, and Cleanup

### Task 9: Update FormDetailPage — Remove Evaluation Settings Modal

**Files:**
- Modify: `apps/dashboard/components/pages/FormDetailPage.tsx`

- [ ] **Step 1: Remove EvaluationSettingsModal import and usage**

Remove the import:
```typescript
// DELETE: import { EvaluationSettingsModal } from '@/components/forms/evaluation/EvaluationSettingsModal';
```

Remove the state:
```typescript
// DELETE: const [settingsModalOpen, setSettingsModalOpen] = React.useState(false);
```

Remove the gear icon button (lines 420-439).

Remove the modal component (lines 532-541).

Remove `handleSaveEvaluationSettings` callback (lines 236-269).

- [ ] **Step 2: Update FormEditorPanel usage — remove onSaveSettings**

```typescript
{activeTabKey === 'editor' && (
  <FormEditorPanel
    template={template}
    onSave={handleSaveSchema}
    readOnly={isSystem}
  />
)}
```

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/components/pages/FormDetailPage.tsx
git commit -m "refactor(forms): remove EvaluationSettingsModal from FormDetailPage"
```

---

### Task 10: Update Submissions API — New Scoring Format

**Files:**
- Modify: `apps/dashboard/pages/api/forms/submissions.ts`

- [ ] **Step 1: Update scoring calculation in POST handler**

The submission scoring needs to work with both the new field-based format and the legacy `template.settings.evaluation` format.

Find the scoring block (around line 158-195) and update:

```typescript
if (template.form_type === 'evaluation') {
  let scoringData = { ...response_data };

  // Check for new format: scoring data in schema/uiSchema fields
  const { jsonSchemaToFields } = await import('@/lib/forms/schema-builder');
  const { calculateEvaluationScore, calculateEvaluationScoreLegacy } = await import('@/lib/forms/scoring');

  const fields = jsonSchemaToFields(template.schema, template.ui_schema);
  const hasScoredFields = fields.some((f) => f.settings.scored);

  if (hasScoredFields) {
    // New format: scoring from fields
    // Resolve connected questions if any
    const connectedFields = fields.filter((f) => f.settings.connectedTo);
    if (connectedFields.length > 0 && employee_id) {
      const { resolveConnectedQuestions } = await import('@/lib/forms/connectors-resolver');
      const connectorInputs = connectedFields.map((f) => ({
        fieldId: f.id,
        key: f.settings.connectedTo!,
        params: f.settings.connectorParams || {},
      }));
      const resolved = await resolveConnectedQuestions(supabase, employee_id, orgId, connectorInputs);
      for (const cq of connectorInputs) {
        if (resolved[cq.key] !== undefined) {
          scoringData[cq.fieldId] = resolved[cq.key];
        }
      }
    }

    const result = calculateEvaluationScore(fields, scoringData);
    score = result.overallPercentage;
    metadata.section_scores = result.sections.map((s) => ({
      sectionId: s.sectionId,
      sectionName: s.sectionName,
      earnedPoints: s.earnedPoints,
      maxPoints: s.maxPoints,
      percentage: s.percentage,
    }));
  } else if (template.settings?.evaluation) {
    // Legacy format: scoring from template.settings.evaluation
    const evalSettings = template.settings.evaluation;
    // ... keep existing legacy scoring code ...
    const connectedQuestions = Object.entries(evalSettings.questions || {})
      .filter(([, q]: [string, any]) => q.connected_to)
      .map(([fieldId, q]: [string, any]) => ({
        fieldId,
        key: q.connected_to,
        params: q.connector_params || {},
      }));

    if (connectedQuestions.length > 0 && employee_id) {
      const { resolveConnectedQuestions } = await import('@/lib/forms/connectors-resolver');
      const resolved = await resolveConnectedQuestions(supabase, employee_id, orgId, connectedQuestions);
      for (const cq of connectedQuestions) {
        if (resolved[cq.key] !== undefined) {
          scoringData[cq.fieldId] = resolved[cq.key];
        }
      }
    }

    const result = calculateEvaluationScoreLegacy(scoringData, evalSettings);
    score = result.overallPercentage;
    metadata.section_scores = result.sections.map((s) => ({
      sectionId: s.sectionId,
      sectionName: s.sectionName,
      earnedPoints: s.earnedPoints,
      maxPoints: s.maxPoints,
      percentage: s.percentage,
    }));
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/dashboard/pages/api/forms/submissions.ts
git commit -m "feat(forms): support new field-based scoring in submissions API"
```

---

### Task 11: Update EvaluationScoreDisplay

**Files:**
- Modify: `apps/dashboard/components/forms/evaluation/EvaluationScoreDisplay.tsx`

- [ ] **Step 1: Verify compatibility**

The `EvaluationScoreDisplay` component receives score data from `calculateEvaluationScore` output, which is stored in `submission.metadata.section_scores`. The new scoring output has the same shape (`sectionId`, `sectionName`, `earnedPoints`, `maxPoints`, `percentage`), so this component should work without changes.

However, there is a new `unscoredQuestions` array. If there are scored questions NOT in any section, they should appear. Add an "Other" section at the bottom if `unscoredQuestions` exist:

Read the file, check if changes are needed, and add unsectioned scored question display if needed.

- [ ] **Step 2: Commit if changed**

```bash
git add apps/dashboard/components/forms/evaluation/EvaluationScoreDisplay.tsx
git commit -m "feat(forms): show unsectioned scored questions in EvaluationScoreDisplay"
```

---

### Task 12: Update Import Prompt

**Files:**
- Modify: `apps/dashboard/lib/forms/import-prompt.ts`

- [ ] **Step 1: Replace percentage references with numeric_score**

In `FIELD_TYPE_DESCRIPTIONS`:
```
- **numeric_score**: Numeric input with a configurable maximum. Use for scores where the answer is a number out of a max value (e.g., 3.5 / 5). Set settings.maxValue to define the denominator.
```

In the tool schema `type` enum, replace `'percentage'` with `'numeric_score'`.

In the `settings.properties`, replace `scoringType` with:
```typescript
scored: { type: 'boolean', description: 'Whether this field contributes to the evaluation score' },
maxValue: { type: 'number', description: 'Maximum input value for numeric_score fields (the denominator)' },
```

Remove `scoringType` from the schema.

Update `ParsedFormField.settings` interface: remove `scoringType`, add `scored?: boolean` and `maxValue?: number`.

In the scoring extraction section of the system prompt, update the instructions to use `scored: true` and `weight` instead of `scoringType`.

- [ ] **Step 2: Commit**

```bash
git add apps/dashboard/lib/forms/import-prompt.ts
git commit -m "refactor(forms): update import prompt for numeric_score and scored toggle"
```

---

### Task 13: Build Verification and Cleanup

- [ ] **Step 1: Run typecheck**

```bash
pnpm typecheck 2>&1 | tail -30
```

Fix any type errors. Common issues:
- References to old `percentage` type
- References to old `evaluationQuestions` or `scoringType`
- Missing props from removed interfaces

- [ ] **Step 2: Run build**

```bash
pnpm --filter dashboard build 2>&1 | tail -30
```

- [ ] **Step 3: Test in browser**

1. Open an existing evaluation form → editor tab
2. Verify sections display as containers
3. Drag a field into a section
4. Drag a field out of a section
5. Add a new section from the palette
6. Select a rating_1_3 field → verify "Scored" toggle appears
7. Toggle scored on → verify weight input appears
8. Check preview tab → verify sections render as headers
9. Check total points display at bottom of editor

- [ ] **Step 4: Delete unused evaluation files (optional)**

If the EvaluationSettingsModal and SectionManager are no longer referenced:

```bash
# Check for remaining references first
grep -r "EvaluationSettingsModal\|SectionManager" apps/dashboard/components/ apps/dashboard/pages/ --include="*.tsx" --include="*.ts"
```

If no references remain, delete:
- `apps/dashboard/components/forms/evaluation/EvaluationSettingsModal.tsx`
- `apps/dashboard/components/forms/evaluation/EvaluationSettingsModal.module.css`
- `apps/dashboard/components/forms/evaluation/SectionManager.tsx`

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore(forms): cleanup unused evaluation settings components"
```
