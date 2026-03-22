# Migrate Ratings & Infractions to NativeFormRenderer — Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded `PositionalRatingsForm` (~820 lines) and `DisciplineInfractionForm` (~910 lines) with the `NativeFormRenderer` reading from system form templates, eliminating ~1700 lines of form-specific UI code.

**Architecture:** Both forms currently use `field_mappings` in template settings to map semantic names to field IDs, then build `response_data` manually. After migration, the `NativeFormRenderer` renders the template schema directly — field IDs are the schema property keys, no mapping layer needed. The renderer needs two new capabilities: `onFieldChange` callbacks (for dynamic position labels in ratings) and `schemaOverrides` (for updating field titles at runtime). The form screens become thin wrappers that fetch the system template, configure initial data, handle post-submit actions, and render the `NativeFormRenderer`.

**Tech Stack:** React Native, Expo Router (formSheet presentation), `NativeFormRenderer` (built in Phase 1), existing mobile form components, system form templates from dashboard Form Management

**Spec:** `docs/superpowers/specs/2026-03-18-mobile-form-renderer-evaluations-design.md` (Phase 2 section)

**Key Phase 1 components already built:**
- `NativeFormRenderer` at `apps/mobile/src/components/forms/NativeFormRenderer.tsx` — core renderer with props: `template`, `initialData`, `onSubmit`, `submitting`, `submitLabel`, `readOnly`, `scrollRef`, `onScrollEnabledChange`
- `RatingPills` at `apps/mobile/src/components/forms/fields/RatingPills.tsx` — matches dashboard RatingScaleWidget exactly (MUI radio style, label above circle)
- `SignatureCanvas` at `apps/mobile/src/components/forms/SignatureCanvas.tsx` — SVG-based (no WebView), gesture handler for scroll conflict resolution
- `submitFormAuth` at `apps/mobile/src/lib/api.ts` — generic form submission
- `fetchSystemTemplate` at `apps/mobile/src/lib/api.ts` — fetches template by slug via `/api/forms/template-by-slug`
- `fetchWidgetDataAuth` at `apps/mobile/src/lib/api.ts` — fetches data source options with role filtering
- Conduct screen pattern: `apps/mobile/app/forms/evaluations/[templateId].tsx` — header + ScrollView + NativeFormRenderer + onScrollEnabledChange

**Key codebase references:**
- Current ratings form: `apps/mobile/src/components/forms/PositionalRatingsForm.tsx`
- Current infractions form: `apps/mobile/src/components/forms/DisciplineInfractionForm.tsx`
- Field mapping utilities: `apps/mobile/src/lib/form-mapping.ts`
- System templates: `positional-excellence-rating` and `discipline-infraction` slugs
- Position labels API: `fetchPositionLabelsAuth(accessToken, locationId, position, zone)` in api.ts

---

### Task 1: Add `onFieldChange` and `schemaOverrides` to NativeFormRenderer

**Files:**
- Modify: `apps/mobile/src/components/forms/NativeFormRenderer.tsx`

- [ ] **Step 1: Add `onFieldChange` prop**

Add to `NativeFormRendererProps`:
```typescript
/** Called when any field value changes. Allows parent to react (e.g., fetch position labels). */
onFieldChange?: (fieldId: string, value: any, formData: Record<string, any>) => void;
```

In the `setFieldValue` callback, after updating state and clearing errors, call:
```typescript
onFieldChange?.(fieldId, value, next);
```

Note: call inside the `setFormData` updater so `next` reflects the new state.

- [ ] **Step 2: Add `schemaOverrides` prop**

Add to `NativeFormRendererProps`:
```typescript
/** Runtime overrides for schema.properties — merged before parsing fields. Used for dynamic labels. */
schemaOverrides?: Record<string, any>;
```

In the `parseFields` useMemo, merge before parsing:
```typescript
const fields = useMemo(() => {
  const schema = { ...template.schema };
  if (schemaOverrides && Object.keys(schemaOverrides).length > 0) {
    schema.properties = { ...schema.properties, ...schemaOverrides };
  }
  return parseFields(schema, template.ui_schema);
}, [template.schema, template.ui_schema, schemaOverrides]);
```

Add `schemaOverrides` to the destructured props and the `useEffect` that applies defaults (since fields change when overrides change).

- [ ] **Step 3: Commit**

```bash
git add src/components/forms/NativeFormRenderer.tsx
git commit -m "feat(mobile): add onFieldChange and schemaOverrides props to NativeFormRenderer"
```

---

### Task 2: Migrate Ratings Form

**Files:**
- Rewrite: `apps/mobile/app/forms/ratings.tsx`
- Create: `apps/mobile/src/components/forms/RatingsFormScreen.tsx`
- Modify: `apps/mobile/src/components/forms/index.ts`

The existing `fetchSystemTemplate(accessToken, 'positional-excellence-rating')` returns the full template with schema, ui_schema, and settings (including `field_mappings`). The renderer reads the schema directly — no field_mappings needed.

- [ ] **Step 1: Create `RatingsFormScreen` component**

Follow the same pattern as the evaluation conduct screen (`apps/mobile/app/forms/evaluations/[templateId].tsx`):

```
View (flex: 1, background)
  ├── ScrollView (scrollEnabled state, onScrollEnabledChange callback)
  │   └── View (content padding)
  │       ├── Loading state / Error state
  │       └── NativeFormRenderer (template, initialData, schemaOverrides, onFieldChange, onSubmit, onScrollEnabledChange)
```

Key logic:
- **Fetch template**: `fetchSystemTemplate(accessToken, 'positional-excellence-rating')` on mount
- **Auto-fill leader**: After template loads, identify the leader field (data_select with `dataSource: 'leaders'`) and set `initialData` with the authenticated user's `employeeId`
- **Position-dependent labels**:
  - Identify position field (`dataSource: 'positions'`) and rating fields (`fieldType: 'rating_1_3'`) from template ui_schema
  - On `onFieldChange`, when the position field changes, call `fetchPositionLabelsAuth(accessToken, locationId, positionName, zone)`
  - Build `schemaOverrides` with updated `title` and `description` for each rating field
- **Submit**: Call `submitFormAuth()`, then `completeSubmission()`, then `router.back()` or navigate to employee overview

- [ ] **Step 2: Update `ratings.tsx` wrapper**

Simplify to the same thin wrapper pattern. The header (glass back button + title) stays in the wrapper, the form content is `<RatingsFormScreen />`.

- [ ] **Step 3: Test**

1. Open Forms → Positional Ratings
2. Verify leader auto-fills
3. Select employee, position — verify labels update
4. Rate all criteria
5. Submit — verify on dashboard

- [ ] **Step 4: Commit**

```bash
git add src/components/forms/RatingsFormScreen.tsx app/forms/ratings.tsx src/components/forms/index.ts
git commit -m "feat(mobile): migrate ratings form to NativeFormRenderer"
```

---

### Task 3: Migrate Infractions Form

**Files:**
- Rewrite: `apps/mobile/app/forms/infractions.tsx`
- Create: `apps/mobile/src/components/forms/InfractionsFormScreen.tsx`
- Create: `apps/mobile/src/components/forms/FileAttachmentStrip.tsx`
- Modify: `apps/mobile/src/components/forms/index.ts`

More complex than ratings due to:
1. **Multi-file uploads** (up to 5, camera/gallery/PDF, uploaded AFTER submission)
2. **Conditional signature** (team member sig required based on infraction config + acknowledged state)
3. **Grouped infraction dropdown** (grouped by point value — AutocompleteDropdown already supports `groupBy`)

- [ ] **Step 1: Extract `FileAttachmentStrip` from DisciplineInfractionForm**

Extract the file management UI (horizontal thumbnail strip, add button, camera/gallery/PDF picker ActionSheet, remove buttons) into a standalone component. This component is NOT part of the renderer — it renders below/beside the form because file uploads happen post-submit.

Props:
```typescript
interface FileAttachmentStripProps {
  files: { uri: string; name: string; type: string }[];
  onAdd: (file: { uri: string; name: string; type: string }) => void;
  onRemove: (index: number) => void;
  maxFiles?: number;
  disabled?: boolean;
}
```

Copy the exact styling and picker logic from `DisciplineInfractionForm.tsx` lines 575-630 (file section).

- [ ] **Step 2: Create `InfractionsFormScreen` component**

Same conduct screen pattern. Key logic:
- **Fetch template**: `fetchSystemTemplate(accessToken, 'discipline-infraction')`
- **Auto-fill leader**: Same as ratings
- **File management**: Local state `attachedFiles[]`, rendered via `FileAttachmentStrip` OUTSIDE the NativeFormRenderer
- **Conditional signature**: Use `onFieldChange` to watch:
  - Infraction field changes → look up `require_tm_signature` from infraction data
  - Acknowledged toggle changes → check if true
  - When either condition requires team sig, modify the template's `required` array to include the team signature field ID
- **Submit flow**:
  1. `submitFormAuth()` → get `{ id: submissionId }`
  2. For each attached file: `uploadInfractionDocumentAuth(token, locationId, submissionId, file, { isSubmissionId: true })`
  3. Failures on file upload are caught and logged (don't block submission)
  4. Navigate back or to employee overview

- [ ] **Step 3: Handle conditional signature requirement**

The renderer respects the `required` array in `template.schema.required`. To make a field dynamically required:
```typescript
// In InfractionsFormScreen:
const [templateWithDynamicRequired, setTemplateWithDynamicRequired] = useState(null);

// When condition changes, clone template and modify required array:
const updated = { ...template, schema: { ...template.schema, required: [...(template.schema.required || [])] } };
if (needsTeamSig && !updated.schema.required.includes(teamSigFieldId)) {
  updated.schema.required.push(teamSigFieldId);
}
setTemplateWithDynamicRequired(updated);
// Pass templateWithDynamicRequired to NativeFormRenderer
```

- [ ] **Step 4: Update `infractions.tsx` wrapper**

Same thin wrapper pattern with glass header.

- [ ] **Step 5: Test**

1. Select employee, infraction (grouped), date
2. Toggle acknowledged → team sig becomes required
3. Attach files (camera, gallery)
4. Sign both signatures
5. Submit → verify submission + files on dashboard

- [ ] **Step 6: Commit**

```bash
git add src/components/forms/InfractionsFormScreen.tsx src/components/forms/FileAttachmentStrip.tsx app/forms/infractions.tsx src/components/forms/index.ts
git commit -m "feat(mobile): migrate infractions form to NativeFormRenderer"
```

---

### Task 4: Clean Up Legacy Code

**Files:**
- Delete: `apps/mobile/src/components/forms/PositionalRatingsForm.tsx`
- Delete: `apps/mobile/src/components/forms/DisciplineInfractionForm.tsx`
- Modify: `apps/mobile/src/lib/form-mapping.ts` (remove unused functions or delete file)
- Modify: `apps/mobile/src/components/forms/index.ts`
- Modify: `apps/mobile/src/lib/api.ts` (deprecate old submission functions)

- [ ] **Step 1: Verify nothing imports old components**

```bash
grep -r "PositionalRatingsForm\|DisciplineInfractionForm\|buildRatingResponseData\|buildInfractionResponseData" apps/mobile/src/ apps/mobile/app/ --include="*.tsx" --include="*.ts" | grep -v "node_modules"
```

- [ ] **Step 2: Delete old files, update exports, deprecate old API functions**

- [ ] **Step 3: Commit**

```bash
git add -A apps/mobile/
git commit -m "chore(mobile): remove legacy hardcoded form components and field mappings"
```

---

### Task 5: Integration Testing

- [ ] **Step 1: Test ratings end-to-end** (submit, verify on dashboard, recent activity shows)
- [ ] **Step 2: Test infractions end-to-end** (submit with files + signatures, verify on dashboard)
- [ ] **Step 3: Test evaluations still work** (no regression from Phase 1)
- [ ] **Step 4: Test edge cases** (no template, network failure, dark mode, all field types)
- [ ] **Step 5: Test outgoing activity cards** (ratings/infractions/evaluations show in recent activity with outgoing tag)
- [ ] **Step 6: Fix any issues, final commit**

---

## Summary

| Metric | Before | After |
|--------|--------|-------|
| PositionalRatingsForm | ~820 lines | ~200 lines (RatingsFormScreen) |
| DisciplineInfractionForm | ~910 lines | ~250 lines (InfractionsFormScreen) |
| form-mapping.ts | ~150 lines | Deleted |
| Total form-specific code | ~1,880 lines | ~450 lines |
| Code reduction | — | ~76% |
| Form rendering engine | None (hardcoded) | NativeFormRenderer (shared) |
| Field types supported | Rating + Infraction only | All 16 types |
