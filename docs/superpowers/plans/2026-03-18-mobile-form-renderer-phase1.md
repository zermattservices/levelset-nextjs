# Mobile Native Form Renderer + Evaluation Submission — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a native React Native form renderer that reads JSON Schema + UI Schema from form templates and renders native mobile components, then wire it into an evaluation submission flow with a GlassModal template picker.

**Architecture:** The `NativeFormRenderer` mirrors the dashboard's `FormRenderer` (`apps/dashboard/components/forms/FormRenderer.tsx`). It takes a form template, parses `schema.properties` ordered by `ui_schema['ui:order']`, and renders native RN components per field type. Field type is determined from `ui:fieldMeta.fieldType` (falling back to schema inference via the same logic as `apps/dashboard/lib/forms/schema-builder.ts:inferFieldType`). The evaluation flow adds a GlassModal picker for selecting which template to fill, then navigates to a conduct screen rendered as a formSheet that loads the template and renders it via the renderer.

**Tech Stack:** React Native, Expo Router (formSheet presentation), Reanimated, Levelset mobile design system (`useColors`, `typography`, `spacing`, `haptics`), existing components (`AutocompleteDropdown`, `DatePickerField`, `SignatureCanvas`, `RadioButtonGroup`, `GlassModal`, `GlassCard`)

**Spec:** `docs/superpowers/specs/2026-03-18-mobile-form-renderer-evaluations-design.md`

**Key codebase references:**
- Dashboard FormRenderer: `apps/dashboard/components/forms/FormRenderer.tsx`
- Dashboard schema builder: `apps/dashboard/lib/forms/schema-builder.ts` (field type inference, `jsonSchemaToFields`)
- Dashboard field palette: `apps/dashboard/lib/forms/field-palette.ts` (all field type definitions)
- Mobile API client: `apps/mobile/src/lib/api.ts` (uses `API_BASE_URL`, `authHeaders()`, `handleResponse()`, cache pattern)
- Mobile form components: `apps/mobile/src/components/forms/` (AutocompleteDropdown, DatePickerField, RadioButtonGroup, SignatureCanvas)
- Mobile glass components: `apps/mobile/src/components/glass/` (GlassModal, GlassCard)
- Mobile contexts: AuthContext (`session.access_token`), LocationContext (`selectedLocation.org_id`), FormsContext (`completeSubmission()`, `language`)
- Mobile theme: `apps/mobile/src/lib/theme.ts` (spacing, borderRadius, haptics), `apps/mobile/src/lib/fonts.ts` (typography), `apps/mobile/src/lib/colors.ts` (useColors)

---

### Task 1: API Functions for Form Templates

**Files:**
- Modify: `apps/mobile/src/lib/api.ts`

Add API functions for fetching form templates, widget data, and generic form submission. Follow existing patterns exactly: use `API_BASE_URL`, `authHeaders()`, `handleResponse<T>()`, `encodeURIComponent()`, and the cache system.

- [ ] **Step 1: Add `fetchEvaluationTemplatesAuth`**

Place after existing form-related functions (around line 900, before cache helpers). Use `TEMPLATE_CACHE_TTL` (10 min) for caching.

```typescript
export async function fetchEvaluationTemplatesAuth(
  accessToken: string,
  orgId: string
): Promise<any[]> {
  const cacheKey = `eval_templates_${orgId}`;
  const cached = getCached<any[]>(cacheKey);
  if (cached && isFresh(cacheKey)) return cached;

  const res = await fetch(
    `${API_BASE_URL}/api/forms?org_id=${encodeURIComponent(orgId)}&form_type=evaluation`,
    { headers: authHeaders(accessToken) }
  );
  const data = await handleResponse<any>(res);
  const templates = Array.isArray(data) ? data : (data as any).templates ?? [];
  setCache(cacheKey, templates);
  return templates;
}
```

- [ ] **Step 2: Add `fetchFormTemplateAuth`**

Single template fetch with template-level caching:

```typescript
export async function fetchFormTemplateAuth(
  accessToken: string,
  templateId: string,
  orgId: string
): Promise<any> {
  const cacheKey = `form_template_${templateId}`;
  const cached = getCached<any>(cacheKey);
  if (cached && isFresh(cacheKey)) return cached;

  const res = await fetch(
    `${API_BASE_URL}/api/forms/${encodeURIComponent(templateId)}?org_id=${encodeURIComponent(orgId)}`,
    { headers: authHeaders(accessToken) }
  );
  const data = await handleResponse<any>(res);
  setCache(cacheKey, data);
  return data;
}
```

- [ ] **Step 3: Add `fetchWidgetDataAuth`**

For data_select fields. Reuses existing `fetchPositionalDataAuth` for employee/leader data sources, falls back to `/api/forms/widget-data` for others:

```typescript
export async function fetchWidgetDataAuth(
  accessToken: string,
  orgId: string,
  locationId: string,
  dataSource: string
): Promise<{ value: string; label: string; subtitle?: string; group?: string }[]> {
  if (dataSource === 'employees' || dataSource === 'leaders') {
    const data = await fetchPositionalDataAuth(accessToken, locationId);
    const list = dataSource === 'leaders' ? data.leaders : data.employees;
    return (list || []).map((e: any) => ({
      value: e.id,
      label: e.full_name || e.name || `${e.first_name} ${e.last_name}`,
      subtitle: e.role || '',
    }));
  }
  const res = await fetch(
    `${API_BASE_URL}/api/forms/widget-data?type=${encodeURIComponent(dataSource)}&org_id=${encodeURIComponent(orgId)}`,
    { headers: authHeaders(accessToken) }
  );
  const data = await handleResponse<any>(res);
  return Array.isArray(data) ? data : data.options ?? [];
}
```

- [ ] **Step 4: Add `submitFormAuth`**

Generic form submission matching the existing `submitRatingsAuth` pattern:

```typescript
export async function submitFormAuth(
  accessToken: string,
  orgId: string,
  payload: {
    template_id: string;
    location_id?: string;
    employee_id?: string;
    response_data: Record<string, any>;
  }
): Promise<{ id: string }> {
  const res = await fetch(`${API_BASE_URL}/api/forms/submissions`, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ org_id: orgId, ...payload }),
  });
  return handleResponse<{ id: string }>(res);
}
```

- [ ] **Step 5: Commit**

```bash
cd apps/mobile && git add src/lib/api.ts
git commit -m "feat(mobile): add API functions for form templates and generic form submission"
```

---

### Task 2: Field Components — Display-Only (SectionHeader, TextBlockDisplay)

**Files:**
- Create: `apps/mobile/src/components/forms/fields/SectionHeader.tsx`
- Create: `apps/mobile/src/components/forms/fields/TextBlockDisplay.tsx`

Non-input display components. Use `useColors()` for theming, `typography` from `fonts.ts`, `spacing` from `theme.ts`.

- [ ] **Step 1: Create `SectionHeader`**

Renders a section divider with bold uppercase title and colored bottom border. Supports EN/ES via language prop. Matches the dashboard's `FormObjectFieldTemplate` section rendering.

Props: `{ name: string; nameEs?: string; language?: string }`

- [ ] **Step 2: Create `TextBlockDisplay`**

Renders HTML content as plain styled text (strip tags for v1). Supports EN/ES content.

Props: `{ content: string; contentEs?: string; language?: string }`

Helper: `stripHtml(html: string): string` — removes HTML tags and `&nbsp;`.

- [ ] **Step 3: Commit**

```bash
git add src/components/forms/fields/
git commit -m "feat(mobile): add SectionHeader and TextBlockDisplay field components"
```

---

### Task 3: Field Components — Input Types (YesNoSwitch, NumericScoreField, CheckboxGroup, TextField, FilePickerField)

**Files:**
- Create: `apps/mobile/src/components/forms/fields/YesNoSwitch.tsx`
- Create: `apps/mobile/src/components/forms/fields/NumericScoreField.tsx`
- Create: `apps/mobile/src/components/forms/fields/CheckboxGroup.tsx`
- Create: `apps/mobile/src/components/forms/fields/TextField.tsx`
- Create: `apps/mobile/src/components/forms/fields/FilePickerField.tsx`
- Create: `apps/mobile/src/components/forms/fields/index.ts`

**Reuse note:** `RatingScaleField` is NOT needed — reuse existing `RadioButtonGroup` component directly. It already supports numeric values and custom `RadioOption[]` arrays. For 1-3 scale, use existing `getRatingOptions(colors)`. For 1-5 scale, create a `getRating5Options(colors)` helper that returns 5 `RadioOption` entries with appropriate colors.

**Reuse note:** `AutocompleteDropdown` is used directly for `select` and `data_select` fields. Its `DropdownOption` interface (`{ value: string; label: string; subtitle?: string; group?: string }`) matches the widget data API response shape.

**Reuse note:** `DatePickerField` is used directly for `date` fields. For `defaultToCurrentDate`, the renderer passes today's date as the initial value.

**Reuse note:** `SignatureCanvas` is used directly for `signature` fields.

- [ ] **Step 1: Create `YesNoSwitch`**

Matches dashboard's `YesNoSwitch` widget — red "No", green "Yes", Switch between. Defaults to `false` on mount if value is undefined. Uses `Switch` from RN with `trackColor` for red/green.

Props: `{ label, value, onChange, required?, error?, disabled? }`

- [ ] **Step 2: Create `NumericScoreField`**

Numeric `TextInput` with "X / {maxValue}" display. `keyboardType="decimal-pad"`.

Props: `{ label, value, onChange, maxValue, required?, error?, disabled? }`

- [ ] **Step 3: Create `CheckboxGroup`**

Multi-select checkboxes. Each option has a checkbox + label. Selected state uses `colors.primary`. Uses `haptics.selection()` on toggle.

Props: `{ label, options: {value, label}[], value: string[], onChange, required?, error?, disabled? }`

- [ ] **Step 4: Create `TextField`**

Wraps RN `TextInput` for text, textarea, and number types. Supports `multiline`, `numberOfLines`, `keyboardType`.

Props: `{ label, value, onChange, required?, error?, disabled?, multiline?, numberOfLines?, keyboardType?, placeholder? }`

- [ ] **Step 5: Create `FilePickerField`**

File picker using `expo-image-picker` (lazy-loaded). Stores URI string. Shows preview thumbnail when file selected, X button to remove.

Props: `{ label, value, onChange, required?, error?, disabled? }`

- [ ] **Step 6: Create barrel export `fields/index.ts`**

```typescript
export { SectionHeader } from './SectionHeader';
export { TextBlockDisplay } from './TextBlockDisplay';
export { TextField } from './TextField';
export { YesNoSwitch } from './YesNoSwitch';
export { NumericScoreField } from './NumericScoreField';
export { CheckboxGroup } from './CheckboxGroup';
export { FilePickerField } from './FilePickerField';
```

- [ ] **Step 7: Commit**

```bash
git add src/components/forms/fields/
git commit -m "feat(mobile): add input field components for native form renderer"
```

---

### Task 4: NativeFormRenderer — Core Orchestrator

**Files:**
- Create: `apps/mobile/src/components/forms/NativeFormRenderer.tsx`
- Modify: `apps/mobile/src/components/forms/index.ts` (add export)

The mobile equivalent of `apps/dashboard/components/forms/FormRenderer.tsx`. Same props interface, same schema parsing, same boolean patching, but renders native RN components instead of RJSF/MUI.

- [ ] **Step 1: Define types and props**

```typescript
interface NativeFormRendererProps {
  template: {
    schema: Record<string, any>;
    ui_schema: Record<string, any>;
    org_id: string;
    form_type?: string;
  };
  initialData?: Record<string, any>;
  onSubmit: (formData: Record<string, any>) => void;
  submitting?: boolean;
  submitLabel?: string;
  readOnly?: boolean;
}

interface ParsedField {
  id: string;
  fieldType: string;
  title: string;
  titleEs: string;
  description?: string;
  descriptionEs?: string;
  required: boolean;
  meta: Record<string, any>;
  schemaProps: Record<string, any>;
  children?: string[];  // For section fields
}
```

- [ ] **Step 2: Implement `parseFields` function**

Reads `schema.properties` ordered by `ui_schema['ui:order']`. For each field:
- Gets `fieldType` from `ui:fieldMeta.fieldType`, falling back to inference from schema (same logic as `apps/dashboard/lib/forms/schema-builder.ts:inferFieldType`)
- Extracts title, titleEs, description, required status, meta, schema props
- For sections: captures `children` array from meta

```typescript
function parseFields(schema: any, uiSchema: any): ParsedField[]
```

- [ ] **Step 3: Implement `patchBooleanDefaults`**

Same as dashboard's `FormRenderer` lines 42-53. For any `type: 'boolean'` property without a `default`, add `default: false`.

- [ ] **Step 4: Implement `renderField` function**

Switch on `fieldType` to render the correct component:

| fieldType | Component | Notes |
|---|---|---|
| `section` | `SectionHeader` | Pass `name`, `nameEs`, `language` from FormsContext |
| `text_block` | `TextBlockDisplay` | Pass `content`/`contentEs` from `ui:options` |
| `text` | `TextField` | Single line |
| `textarea` | `TextField` | `multiline=true`, `numberOfLines` from meta |
| `number` | `TextField` | `keyboardType="numeric"` |
| `date` | `DatePickerField` (existing) | If `meta.defaultToCurrentDate` and no initial value, prefill today |
| `select` (custom) | `AutocompleteDropdown` (existing) | Options from `schema.enum`/`enumNames` → `DropdownOption[]` |
| `select` (data source) | `AutocompleteDropdown` (existing) | Options fetched via `fetchWidgetDataAuth` |
| `radio` | `RadioButtonGroup` (existing) | Options from `schema.enum`/`enumNames` → `RadioOption[]` |
| `checkbox` | `CheckboxGroup` (new) | Options from `schema.items.enum` |
| `true_false` | `YesNoSwitch` (new) | Auto-defaults to `false` |
| `rating_1_3` | `RadioButtonGroup` (existing) | Use `getRatingOptions(colors)` helper |
| `rating_1_5` | `RadioButtonGroup` (existing) | Custom 5-option `RadioOption[]` with gradient colors |
| `numeric_score` | `NumericScoreField` (new) | `maxValue` from `meta.maxValue` |
| `signature` | `SignatureCanvas` (existing) | |
| `file_upload` | `FilePickerField` (new) | |

- [ ] **Step 5: Implement validation**

```typescript
function validate(formData: Record<string, any>, fields: ParsedField[]): Record<string, string> | null
```

- Check required fields: value is not `null`, `undefined`, or empty string
- Boolean fields: `false` is valid (not empty)
- Returns `{ [fieldId]: 'This field is required' }` or `null` if valid

- [ ] **Step 6: Implement the component**

Main structure:
```
ScrollView (ref for scroll-to-error)
  ├── Error banner (if validation errors exist) — red box with count
  ├── For each field in parseFields():
  │   ├── If section: SectionHeader + render children
  │   ├── If text_block: TextBlockDisplay
  │   └── Else: renderField() with value/onChange/error from state
  └── Submit button (Pressable, brand green, disabled when submitting)
```

State management:
- `formData: Record<string, any>` — initialized from `initialData` + boolean defaults + date defaults
- `errors: Record<string, string>` — populated on submit attempt
- `fieldRefs: Record<string, number>` — y positions for scroll-to-error (via `onLayout`)

Data source loading:
- For `data_select` fields, fetch options on mount via `fetchWidgetDataAuth`
- Store in `dataSourceOptions: Record<string, DropdownOption[]>`
- Show loading indicator in dropdown while fetching

Language:
- Get `language` from `useForms().language` (FormsContext)
- Pass to field components for EN/ES label selection

- [ ] **Step 7: Add export to forms barrel**

Add to `apps/mobile/src/components/forms/index.ts`:
```typescript
export { NativeFormRenderer } from './NativeFormRenderer';
```

- [ ] **Step 8: Commit**

```bash
git add src/components/forms/NativeFormRenderer.tsx src/components/forms/index.ts
git commit -m "feat(mobile): add NativeFormRenderer — native form rendering engine mirroring dashboard FormRenderer"
```

---

### Task 5: Evaluation Picker Modal

**Files:**
- Create: `apps/mobile/src/components/forms/EvaluationPickerModal.tsx`
- Modify: `apps/mobile/app/(tabs)/(iforms)/index.tsx`

- [ ] **Step 1: Create `EvaluationPickerModal`**

Uses existing `GlassModal` (not a drawer). Shows evaluation template cards using `GlassCard`. Fetches templates via `fetchEvaluationTemplatesAuth`. On card tap: close modal, navigate to `forms/evaluations/${template.id}`.

Props: `{ visible: boolean; onClose: () => void; orgId: string }`

Key details:
- Get token from `useAuth().session.access_token`
- Navigation via `useRouter().push(`/forms/evaluations/${template.id}`)`
- Loading: `ActivityIndicator` centered
- Empty: "No evaluation forms available" text
- Error: error message text
- Cards: `GlassCard` with icon (use `ClipboardCheck` from lucide-react-native) + template name + description + chevron.right
- `haptics.medium()` on card tap

- [ ] **Step 2: Add evaluation card + modal to forms hub**

In `apps/mobile/app/(tabs)/(iforms)/index.tsx`:

Add imports:
```typescript
import { useState } from 'react';
import { ClipboardCheck } from 'lucide-react-native';
import { EvaluationPickerModal } from '../../../src/components/forms/EvaluationPickerModal';
import { useAuth } from '../../../src/context/AuthContext';
```

Add state:
```typescript
const [evalPickerVisible, setEvalPickerVisible] = useState(false);
const { session } = useAuth();
```

Get orgId:
```typescript
const orgId = selectedLocation?.org_id;
```

Note: `selectedLocation` comes from `useLocation()` which is already imported in this file. Access `org_id` from `selectedLocation` (it's a `LocationRecord` which has `org_id: string`).

Add third GlassCard after the infractions card (with `FadeIn.delay(160)`):
- Icon: `ClipboardCheck` from lucide, `colors.primary`, in `primaryTransparent` background
- Title: "Evaluations"
- Description: "Complete team performance evaluations"
- onPress: `setEvalPickerVisible(true)`

Add modal before closing `</View>`:
```tsx
{orgId && (
  <EvaluationPickerModal
    visible={evalPickerVisible}
    onClose={() => setEvalPickerVisible(false)}
    orgId={orgId}
  />
)}
```

- [ ] **Step 3: Export from forms barrel**

Add to `apps/mobile/src/components/forms/index.ts`:
```typescript
export { EvaluationPickerModal } from './EvaluationPickerModal';
```

- [ ] **Step 4: Commit**

```bash
git add src/components/forms/EvaluationPickerModal.tsx app/\(tabs\)/\(iforms\)/index.tsx src/components/forms/index.ts
git commit -m "feat(mobile): add evaluation picker modal and card on forms hub"
```

---

### Task 6: Register Evaluation Route + Conduct Screen

**Files:**
- Modify: `apps/mobile/app/forms/_layout.tsx` (register evaluations route)
- Create: `apps/mobile/app/forms/evaluations/[templateId].tsx` (conduct screen)

- [ ] **Step 1: Register route in forms layout**

In `apps/mobile/app/forms/_layout.tsx`, add the evaluations screen to the Stack:

```tsx
<Stack.Screen name="ratings" />
<Stack.Screen name="infractions" />
<Stack.Screen name="evaluations/[templateId]" />
```

This tells Expo Router to present the evaluation conduct screen as a formSheet (same as ratings/infractions).

- [ ] **Step 2: Create evaluation conduct screen**

`apps/mobile/app/forms/evaluations/[templateId].tsx`

Follows the exact same shell pattern as `app/forms/ratings.tsx`:
- ScrollView wrapper with `keyboardDismissMode="on-drag"`
- Header: glass back button + centered title + spacer
- Content: loads template then renders `NativeFormRenderer`

Key implementation details:
- Get `templateId` from `useLocalSearchParams<{ templateId: string }>()`
- Get `session.access_token` from `useAuth()`
- Get `selectedLocation` from `useLocation()` — orgId is `selectedLocation?.org_id`, locationId is `selectedLocation?.id`
- Get `completeSubmission` from `useForms()` for success recording
- Fetch template via `fetchFormTemplateAuth(token, templateId, orgId)` on mount
- Loading state: `ActivityIndicator` centered
- Error state: error text + back button hint
- Render `NativeFormRenderer` with template, `submitLabel="Submit Evaluation"`, `submitting` state

Submit handler:
```typescript
const handleSubmit = async (formData: Record<string, any>) => {
  // Extract employee_id from data_select employee field
  let employeeId: string | undefined;
  const uiSchema = template.ui_schema || {};
  for (const fieldId of Object.keys(uiSchema)) {
    const meta = uiSchema[fieldId]?.['ui:fieldMeta'];
    if (meta?.dataSource === 'employees' && formData[fieldId]) {
      employeeId = formData[fieldId];
      break;
    }
  }

  await submitFormAuth(session.access_token, orgId, {
    template_id: template.id,
    location_id: selectedLocation?.id,
    employee_id: employeeId,
    response_data: formData,
  });

  haptics.success();
  completeSubmission({
    formType: 'evaluation',
    employeeName: '', // Resolved by success card if needed
    submittedAt: new Date(),
    details: {},
  });
  router.back();
};
```

Error handling: wrap in try/catch, `Alert.alert('Submission Failed', err.message)`, `setSubmitting(false)`.

- [ ] **Step 3: Commit**

```bash
git add app/forms/_layout.tsx app/forms/evaluations/
git commit -m "feat(mobile): add evaluation conduct screen with formSheet presentation"
```

---

### Task 7: Integration Testing & Polish

**Files:**
- Various (fixes discovered during testing)

- [ ] **Step 1: Test the full evaluation flow**

1. Open Expo Go, navigate to Forms tab
2. Verify "Evaluations" card appears with green ClipboardCheck icon
3. Tap it → GlassModal opens with template cards
4. Tap a template → formSheet slides up with the form
5. Verify all field types render correctly:
   - Section headers with colored border
   - Text blocks as italic instruction text
   - Employee name dropdown (data_select with employees)
   - Date picker (auto-fills today if `defaultToCurrentDate`)
   - Rating scales (1-3 colored pills)
   - Text/textarea inputs
   - Yes/No switches (red No, green Yes)
   - Signature canvas
6. Try submitting with missing required fields → error banner + red highlights + scroll to first error
7. Fill all required fields, tap Submit Evaluation
8. Verify success: haptic, navigate back, success card shows on forms hub
9. Verify on dashboard: submission appears in form management submissions AND evaluations completed tab

- [ ] **Step 2: Test edge cases**

- No evaluation templates in org → modal shows "No evaluation forms available"
- Network error on template fetch → error message in conduct screen
- Empty form template → "No Fields" empty state
- Boolean required fields → `false` is valid
- Rapid double-tap submit → submitting state prevents double submission
- Keyboard handling → dismiss on drag, inputs scroll into view

- [ ] **Step 3: Fix any issues found during testing**

Address bugs, styling mismatches, or missing error handling discovered during manual testing.

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat(mobile): complete evaluation submission flow — Phase 1"
```
