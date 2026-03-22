# Mobile Native Form Renderer + Evaluation Submission

**Date:** 2026-03-18
**Status:** Draft
**Scope:** Two-phase feature — universal form renderer for mobile, then migration of all form types to use it

---

## Problem

The mobile app currently hardcodes form layouts for ratings and infractions. These should be driven by the same form templates stored in `form_templates` (managed via the dashboard's Form Management page). Evaluations are a new form type that needs mobile submission support, and they have fully dynamic schemas — making hardcoded layouts impossible.

We need a native form renderer that reads JSON Schema + UI Schema from any form template and renders the appropriate native React Native components. This unlocks evaluations immediately and sets the foundation for all future custom forms.

---

## Phase 1: Native Form Renderer + Evaluation Submission

### 1.1 Native Form Renderer

**Purpose:** A React Native component that takes a `FormTemplate` (with `schema` and `ui_schema`) and renders a fully functional, submittable form using native components.

**Component:** `NativeFormRenderer`

**Props:**
```typescript
interface NativeFormRendererProps {
  template: FormTemplate;           // From /api/forms/[id] — contains schema, ui_schema, settings
  initialData?: Record<string, any>; // Prefill values keyed by field ID
  onSubmit: (formData: Record<string, any>) => void;
  submitting?: boolean;              // Disables form + shows spinner on submit button
  submitLabel?: string;              // Default: "Submit"
  readOnly?: boolean;                // View-only mode (completed evaluations)
}
```

**Rendering logic:**
1. Parse `template.schema.properties` and `template.ui_schema['ui:order']` to get ordered field list
2. For each field, read `ui_schema[fieldId]['ui:fieldMeta']` to determine `fieldType` and settings
3. Render the corresponding native component (see Field Type Map below)
4. Handle sections: render section headers, group child fields under them
5. Handle text blocks: render as styled read-only rich text
6. Track form state in a `Record<string, any>` via `useState`
7. On submit: validate required fields, call `onSubmit` with form data

**Field Type Map:**

| Field Type | Native Component | Notes |
|---|---|---|
| `text` | `TextInput` (single line) | Standard RN TextInput with Levelset styling |
| `textarea` | `TextInput` (multiline) | Uses `numberOfLines` from ui_schema rows setting |
| `number` | `TextInput` (numeric keyboard) | `keyboardType="numeric"` |
| `date` | `DatePickerField` | Existing component. Reads `defaultToCurrentDate` from meta |
| `select` (custom) | `AutocompleteDropdown` | Existing component. Options from schema `enum`/`enumNames` |
| `select` (data source) | `AutocompleteDropdown` | Fetches options from `/api/forms/widget-data` or `/api/native/forms/positional-data` based on `meta.dataSource` |
| `radio` | `RadioButtonGroup` | Renders horizontal/vertical radio options from schema enum |
| `checkbox` | `CheckboxGroup` (new) | Multi-select checkboxes from schema items.enum |
| `true_false` | `YesNoSwitch` (new) | Matches dashboard Yes/No switch — red No, green Yes |
| `rating_1_3` | `RatingScaleField` (new) | 3-option rating with colored indicators (1=red, 2=yellow, 3=green) |
| `rating_1_5` | `RatingScaleField` | 5-option variant |
| `numeric_score` | `TextInput` (numeric) + label | Shows "X / {maxValue}" with score context |
| `signature` | `SignatureCanvas` | Existing component |
| `file_upload` | `FilePickerField` (new) | Camera/gallery/document picker, reuses infraction file logic |
| `section` | `SectionHeader` (new) | Styled divider with section name |
| `text_block` | `TextBlockDisplay` (new) | Renders HTML content as styled text (strip tags or use simple markdown) |

**Existing components to reuse:**
- `AutocompleteDropdown` — already handles search, groups, subtitles
- `DatePickerField` — already styled with Levelset theme
- `SignatureCanvas` — touch-drawing signature pad
- `RadioButtonGroup` — used in ratings for 1-3 scale (needs to be generalized)

**New components to build:**
- `NativeFormRenderer` — orchestrator
- `SectionHeader` — section divider with title
- `TextBlockDisplay` — read-only rich text display
- `YesNoSwitch` — Yes/No toggle matching dashboard
- `RatingScaleField` — configurable 1-3 or 1-5 rating scale
- `CheckboxGroup` — multi-select checkboxes
- `FilePickerField` — file attachment (extract from infraction form)
- `NumericScoreField` — numeric input with max value display

**Validation:**
- Required fields: check for `null`/`undefined`/empty string
- Boolean fields with `default: false` in schema: `false` is a valid value (not empty)
- On validation failure: scroll to first error field, highlight with red border
- Error messages: "This field is required" below the field

**Data source fetching:**
- Employee select: fetch from `/api/native/forms/positional-data?location_id=X` (reuse existing)
- Position select: fetch from `/api/forms/widget-data?type=positions&org_id=X`
- Other data sources: fetch from `/api/forms/widget-data?type={dataSource}&org_id=X`
- Cache responses for 2 minutes (match existing api.ts cache pattern)

**System fields:**
- Fields with `meta.isSystemField === true` render normally but cannot be cleared by the user if required
- Employee name field (`dataSource: 'employees'`): prefilled via `initialData` when coming from evaluations flow
- Date field with `defaultToCurrentDate`: auto-fills today's date on mount

### 1.2 Evaluation Selection Flow

**Entry point:** New "Submit Evaluation" button on the forms hub screen (`app/(tabs)/(iforms)/index.tsx`)

**Flow:**
1. User taps "Submit Evaluation" on the forms hub
2. **GlassModal opens** showing evaluation template cards
3. User taps a card → navigates to the evaluation conduct screen
4. Conduct screen loads the full template and renders via `NativeFormRenderer`
5. User fills out the form and taps Submit
6. Submission POSTs to `/api/forms/submissions` with the template data
7. Success: haptic feedback, navigate back to forms hub

**Evaluation template picker (GlassModal):**
- Fetch active evaluation templates: `GET /api/forms?org_id=X&form_type=evaluation`
- Auth: Bearer token from `useAuth().session.access_token`
- Display as cards with: template name, description (if any)
- Empty state: "No evaluation forms available" with muted text
- Loading state: skeleton cards

**Evaluation conduct screen:**
- Route: `/forms/evaluations/[templateId].tsx` (Expo Router dynamic route)
- Loads template via `GET /api/forms/[templateId]?org_id=X`
- Renders `NativeFormRenderer` with the template
- Submit button at bottom: "Submit Evaluation"
- Back button (glass circular) in header
- On submit: POST to `/api/forms/submissions` with `{ template_id, org_id, employee_id, response_data }`
- `employee_id`: extracted from the employee name data_select field value in `response_data`

### 1.3 API Layer

**New functions in `api.ts`:**

```typescript
// Fetch active evaluation templates for the org
fetchEvaluationTemplatesAuth(accessToken: string, orgId: string): Promise<FormTemplate[]>

// Fetch a single template by ID (for the conduct screen)
fetchFormTemplateAuth(accessToken: string, templateId: string, orgId: string): Promise<FormTemplate>

// Fetch widget data for data_select fields
fetchWidgetDataAuth(accessToken: string, orgId: string, dataSource: string): Promise<WidgetOption[]>

// Submit an evaluation (or any form)
submitFormAuth(accessToken: string, orgId: string, payload: {
  template_id: string;
  location_id?: string;
  employee_id?: string;
  response_data: Record<string, any>;
}): Promise<SubmissionResult>
```

**Dashboard API endpoints used:**
- `GET /api/forms?org_id=X&form_type=evaluation` — list templates (existing, needs Bearer auth)
- `GET /api/forms/[id]?org_id=X` — get single template (existing)
- `GET /api/forms/widget-data?type=X&org_id=X` — data source options (existing)
- `POST /api/forms/submissions` — submit form (existing)

### 1.4 Files to Create (Phase 1)

```
apps/mobile/
├── app/forms/
│   ├── evaluations/
│   │   └── [templateId].tsx          # Evaluation conduct screen (route wrapper)
│   └── (unchanged: ratings.tsx, infractions.tsx)
├── src/components/forms/
│   ├── NativeFormRenderer.tsx         # Main renderer orchestrator
│   ├── fields/
│   │   ├── SectionHeader.tsx          # Section divider
│   │   ├── TextBlockDisplay.tsx       # Read-only rich text
│   │   ├── YesNoSwitch.tsx            # Boolean Yes/No toggle
│   │   ├── RatingScaleField.tsx       # 1-3 or 1-5 rating scale
│   │   ├── CheckboxGroup.tsx          # Multi-select checkboxes
│   │   ├── NumericScoreField.tsx      # Score input with max
│   │   ├── FilePickerField.tsx        # File upload (extracted from infraction form)
│   │   └── TextField.tsx              # Text/textarea/number input wrapper
│   └── EvaluationPickerModal.tsx      # Glass modal with template cards
└── src/lib/
    └── api.ts                         # New functions added (not a new file)
```

### 1.5 Styling

- All field components use `useColors()` hook for dark/light mode
- Match existing form component styling (padding, border radius, fonts from `typography.ts`)
- Error states: red border + red helper text below field
- Section headers: bold text with colored bottom border (match dashboard)
- Rating scale: colored indicators (1=red, 2=yellow, 3=green for 1-3; gradient for 1-5)
- Glass modal: uses existing `GlassModal` component

---

## Phase 2: Migrate Ratings & Infractions to Form Renderer

### 2.1 Goal

Replace `PositionalRatingsForm.tsx` (~820 lines) and `DisciplineInfractionForm.tsx` (~910 lines) with `NativeFormRenderer` reading from the org's system form templates.

### 2.2 Ratings Migration

**Current flow:**
1. Hardcoded fields: leader, employee, position, 5 rating criteria, notes
2. Fetches positional data via custom endpoint
3. Builds response data via `buildRatingResponseData()` field mapping
4. Submits to `/api/forms/submissions`

**New flow:**
1. Fetch the org's system rating template (`form_type: 'rating'`, `is_system: true`)
2. Render via `NativeFormRenderer` with `initialData` for auto-filled leader
3. Submit via the same `submitFormAuth()` function
4. No field mapping needed — the renderer uses field IDs from the schema directly

**Challenges:**
- **Position-dependent labels:** Rating criteria labels change based on the selected position. The current form calls `fetchPositionLabelsAuth()` on position change. The renderer needs a hook for dynamic field updates — when the position field changes, re-fetch labels and update the schema.
- **Auto-fill leader:** Current form auto-fills the acting leader from auth context. Pass as `initialData` to the renderer.
- **Zone support:** Some orgs have FOH/BOH zone filtering on positions. The position data_select field needs to support this filtering.

**Approach:**
- Add an `onFieldChange` callback to `NativeFormRenderer` that fires when any field value changes
- The ratings screen listens for position field changes and dynamically updates rating label schema
- Or: handle this at the template level with connected fields (the `connectedTo` / `connectorParams` system already exists in the schema builder)

### 2.3 Infractions Migration

**Current flow:**
1. Hardcoded fields: leader, employee, infraction (grouped dropdown), date, acknowledged, notes, files, signatures
2. Fetches infraction data via custom endpoint
3. Complex file upload flow (up to 5 files, camera/gallery/PDF)
4. Conditional signature requirement based on infraction config
5. Submits to `/api/forms/submissions`, then uploads files separately

**New flow:**
1. Fetch the org's system discipline template (`form_type: 'discipline'`, `is_system: true`)
2. Render via `NativeFormRenderer`
3. File upload handled by `FilePickerField` component (extracted in Phase 1)
4. Post-submission file upload remains a separate step

**Challenges:**
- **File uploads:** The renderer's `onSubmit` returns form data, but file uploads happen AFTER submission (need the submission ID). The infraction screen needs to handle this two-step flow.
- **Conditional signature:** The team member signature field is conditionally required based on the selected infraction's `require_employee_signature` config. The renderer needs to support dynamic required state.
- **Infraction grouping:** The infraction dropdown groups items by point value. The `AutocompleteDropdown` already supports groups, but the data needs to be structured correctly from the API.

**Approach:**
- The conduct screen wraps `NativeFormRenderer` and handles post-submit file uploads
- Dynamic required fields: add a `dynamicRequired` map to the renderer that can override schema-level required based on form state
- Or: handle conditional requirements in the field's validation logic based on connected field values

### 2.4 Files Modified (Phase 2)

```
apps/mobile/
├── app/forms/
│   ├── ratings.tsx                    # Simplified to load template + render
│   └── infractions.tsx                # Simplified to load template + render + handle files
├── src/components/forms/
│   ├── PositionalRatingsForm.tsx      # DELETE or gut to thin wrapper
│   ├── DisciplineInfractionForm.tsx   # DELETE or gut to thin wrapper
│   └── NativeFormRenderer.tsx         # Add onFieldChange, dynamicRequired support
└── src/lib/
    ├── api.ts                         # Add fetchSystemTemplateAuth()
    └── form-mapping.ts               # May be deprecated if renderer uses field IDs directly
```

### 2.5 Backward Compatibility

- The dashboard form templates for ratings and discipline are system templates (`is_system: true`)
- They already exist in every org (seeded during onboarding)
- The mobile app fetches these templates by `form_type` + `is_system` flag
- If a template is missing (shouldn't happen), fall back to an error state with "Contact support"
- Existing submissions are unaffected — they already use the same `form_submissions` table

---

## Shared Concerns

### Error Handling
- Network failures: show inline error banner with retry button
- Template load failure: show error state, back button to return
- Submission failure: show error toast, keep form data intact for retry
- Validation errors: scroll to first error, red highlight + message

### Offline Support
- Not in scope for initial build
- Form data is lost if app is backgrounded/killed before submission
- Future: cache form state in AsyncStorage for recovery

### i18n
- All field labels support EN/ES via `ui:fieldMeta.labelEs`
- The renderer checks `i18n.language` and uses the ES label when available
- Section names: `ui:options.sectionNameEs`
- Text blocks: `ui:options.contentEs`

### Performance
- Template fetch is cached for 10 minutes (match existing pattern)
- Widget data (employees, positions) cached for 2 minutes
- Large forms (30+ fields): use `FlatList` or `FlashList` instead of `ScrollView` for field rendering to avoid memory issues
- Signature canvases are lazy-loaded (only mount when visible)

### Testing
- The renderer should be testable with mock templates
- Snapshot tests for each field type with sample schema
- Integration test: render a complete evaluation template, fill fields, verify onSubmit payload
