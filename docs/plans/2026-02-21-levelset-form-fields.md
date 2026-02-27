# Improved Levelset Form Fields — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve Levelset form fields with context-aware leader role filtering and descriptive editor UI so users understand what each field connects to.

**Architecture:** Add a `type=leaders` handler to the existing widget-data API that applies role filtering server-side based on form_type. Thread `formType` through the editor component tree so EditorFieldCard and FieldConfigPanel can show context-specific descriptions and Org Settings links for each Levelset field.

**Tech Stack:** Next.js Pages Router, MUI v7, Supabase (service role), React JSON Schema Form

---

### Task 1: Add `type=leaders` to widget-data API

**Files:**
- Modify: `apps/dashboard/pages/api/forms/widget-data.ts`

**Step 1: Add the `leaders` case to the switch statement**

The new case accepts `org_id`, `location_id`, and `form_type` query params. It determines which roles are "leaders" based on the form type, then returns matching employees.

Add after the `disc_actions` case (before `default:`) in `widget-data.ts`:

```typescript
case 'leaders': {
  const { location_id: lid, form_type: ft } = req.query;
  if (!lid || typeof lid !== 'string') {
    return res.status(400).json({ error: 'location_id is required for leaders' });
  }
  const formType = typeof ft === 'string' ? ft : 'custom';

  // 1. Get org_roles for this org
  const { data: orgRoles } = await supabase
    .from('org_roles')
    .select('role_name, hierarchy_level')
    .eq('org_id', org_id);

  // 2. Determine allowed roles based on form_type
  const allowedRoles = new Set<string>();

  if (formType === 'rating') {
    // PE: use position_role_permissions
    const { data: perms } = await supabase
      .from('position_role_permissions')
      .select('role_name, org_positions!inner(org_id)')
      .eq('org_positions.org_id', org_id);
    if (perms) {
      perms.forEach((p: any) => allowedRoles.add(p.role_name));
    }
    // Fallback: if no permissions configured, use hierarchy 0-2
    if (allowedRoles.size === 0 && orgRoles) {
      orgRoles.filter((r: any) => r.hierarchy_level <= 2).forEach((r: any) => allowedRoles.add(r.role_name));
    }
  } else if (formType === 'discipline') {
    // Discipline: use discipline_role_access
    const { data: access } = await supabase
      .from('discipline_role_access')
      .select('role_name, can_submit')
      .eq('org_id', org_id);
    const accessMap = new Map<string, boolean>();
    if (access) {
      access.forEach((a: any) => accessMap.set(a.role_name, a.can_submit));
    }
    // Apply same logic as DisciplineAccessTab: 0-1 forced, 2 default, 3+ explicit only
    if (orgRoles) {
      orgRoles.forEach((r: any) => {
        const explicit = accessMap.get(r.role_name);
        if (r.hierarchy_level <= 1) {
          allowedRoles.add(r.role_name);
        } else if (explicit !== undefined) {
          if (explicit) allowedRoles.add(r.role_name);
        } else if (r.hierarchy_level <= 2) {
          allowedRoles.add(r.role_name);
        }
      });
    }
  } else {
    // evaluation / custom: hierarchy 0-2
    if (orgRoles) {
      orgRoles.filter((r: any) => r.hierarchy_level <= 2).forEach((r: any) => allowedRoles.add(r.role_name));
    }
  }

  // 3. Fetch employees at this location filtered by allowed roles
  let query = supabase
    .from('employees')
    .select('id, full_name, first_name, last_name, role')
    .eq('location_id', lid)
    .eq('active', true)
    .order('full_name');

  if (allowedRoles.size > 0) {
    query = query.in('role', Array.from(allowedRoles));
  }

  const { data: employees, error: empError } = await query;

  if (empError) {
    console.error('widget-data leaders error:', empError);
    return res.status(500).json({ error: 'Failed to fetch leaders' });
  }

  const result = (employees || []).map((e: any) => ({
    id: e.id,
    full_name: e.full_name?.trim() || `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim() || 'Unnamed',
    role: e.role ?? null,
  }));

  return res.status(200).json({ data: result });
}
```

Also update the JSDoc at the top of the file to include `leaders` in the type list and document the additional params:

```typescript
/**
 * Query params:
 *   type        — 'positions' | 'infractions' | 'disc_actions' | 'leaders'
 *   org_id      — required
 *   location_id — required for leaders
 *   form_type   — optional for leaders ('rating' | 'discipline' | 'evaluation' | 'custom')
 */
```

**Step 2: Verify the API route compiles**

Run: `pnpm typecheck`
Expected: No new errors from widget-data.ts

**Step 3: Commit**

```bash
git add apps/dashboard/pages/api/forms/widget-data.ts
git commit -m "feat: add leaders type to widget-data API with form-type-aware role filtering"
```

---

### Task 2: Rewrite LeaderSelectWidget to use new API

**Files:**
- Modify: `apps/dashboard/components/forms/widgets/LeaderSelectWidget.tsx`

**Step 1: Replace the widget implementation**

Replace the entire file content. The new version:
- Calls `/api/forms/widget-data?type=leaders&org_id=X&location_id=Y&form_type=Z` instead of `/api/employees`
- Gets `formType` from `formContext.formType` (which we'll thread through in Task 5)
- Removes the `isLeaderRole()` helper and all client-side filtering
- Keeps the same Autocomplete UI

```typescript
import * as React from 'react';
import { Autocomplete, TextField, FormControl, FormHelperText } from '@mui/material';
import type { WidgetProps } from '@rjsf/utils';
import { useAuth } from '@/lib/providers/AuthProvider';

const fontFamily = '"Satoshi", sans-serif';

interface LeaderOption {
  id: string;
  full_name: string;
  role: string | null;
}

/**
 * Leader/manager select widget for RJSF forms.
 * Fetches leaders via /api/forms/widget-data?type=leaders with org-configured
 * role filtering based on form_type (rating, discipline, evaluation, custom).
 * Stores the employee ID as the field value.
 */
export function LeaderSelectWidget(props: WidgetProps) {
  const { id, value, required, disabled, readonly, onChange, label, rawErrors, formContext } = props;
  const auth = useAuth();
  const org_id = formContext?.orgId || auth.org_id;
  const location_id = formContext?.locationId || auth.location_id;
  const formType = formContext?.formType || 'custom';
  const [leaders, setLeaders] = React.useState<LeaderOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!org_id || !location_id) return;
    let cancelled = false;

    const fetchLeaders = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          type: 'leaders',
          org_id,
          location_id,
          form_type: formType,
        });
        const res = await fetch(`/api/forms/widget-data?${params}`);
        const json = await res.json();

        if (!cancelled && json.data) {
          setLeaders(
            json.data.map((e: any) => ({
              id: e.id,
              full_name: e.full_name,
              role: e.role ?? null,
            }))
          );
        }
      } catch (err) {
        console.error('LeaderSelectWidget: load failed', err);
        if (!cancelled) setLoadError('Failed to load leaders');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchLeaders();
    return () => { cancelled = true; };
  }, [org_id, location_id, formType]);

  const selectedOption = leaders.find((e) => e.id === value) || null;
  const isDisabled = disabled || readonly;

  return (
    <FormControl
      required={required}
      error={rawErrors && rawErrors.length > 0}
      sx={{ width: '100%' }}
    >
      <Autocomplete
        id={id}
        options={leaders}
        loading={loading}
        disabled={isDisabled}
        value={selectedOption}
        onChange={(_, option) => onChange(option?.id ?? undefined)}
        getOptionLabel={(option) => option.full_name}
        renderOption={(optionProps, option) => (
          <li {...optionProps} key={option.id}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontFamily, fontSize: 13 }}>{option.full_name}</span>
              {option.role && (
                <span style={{ fontFamily, fontSize: 11, color: 'var(--ls-color-muted)' }}>
                  {option.role}
                </span>
              )}
            </div>
          </li>
        )}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label || 'Leader'}
            required={required}
            error={rawErrors && rawErrors.length > 0}
            sx={{
              '& .MuiInputBase-root': { fontFamily, fontSize: 14 },
              '& .MuiInputLabel-root': { fontFamily, fontSize: 14 },
            }}
          />
        )}
      />
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

**Step 2: Verify it compiles**

Run: `pnpm typecheck`
Expected: No new errors

**Step 3: Commit**

```bash
git add apps/dashboard/components/forms/widgets/LeaderSelectWidget.tsx
git commit -m "feat: rewrite LeaderSelectWidget to use server-side org-configured role filtering"
```

---

### Task 3: Add Levelset field description metadata to field-palette

**Files:**
- Modify: `apps/dashboard/lib/forms/field-palette.ts`

**Step 1: Add `description` and `configLink` to `FieldTypeDefinition`**

Add two optional properties to the interface and a helper function that returns the correct description/link given a form type:

```typescript
// Add to FieldTypeDefinition interface:
/** Short description shown on editor canvas for Levelset fields */
description?: string;
/** Returns context-specific description and config link for a Levelset field */
```

Add a new exported helper after `getFieldTypesByCategory()`:

```typescript
interface LevelsetFieldInfo {
  description: string;
  configLink?: string;
  configLinkLabel?: string;
}

/**
 * Get context-specific description and config link for a Levelset field
 * based on the form's form_type.
 */
export function getLevelsetFieldInfo(
  fieldType: string,
  formType?: string
): LevelsetFieldInfo | null {
  switch (fieldType) {
    case 'employee_select':
      return {
        description: 'All active team members at this location',
      };
    case 'leader_select': {
      if (formType === 'rating') {
        return {
          description: 'These options are displayed dynamically based on Positional Excellence role mappings.',
          configLink: '/org-settings?tab=positional-excellence&subtab=role-mapping',
          configLinkLabel: 'Configure role mappings',
        };
      }
      if (formType === 'discipline') {
        return {
          description: 'These options are displayed dynamically based on Discipline access roles.',
          configLink: '/org-settings?tab=discipline&subtab=access',
          configLinkLabel: 'Configure discipline access',
        };
      }
      return {
        description: 'Shows employees with leadership roles (hierarchy level 0-2).',
        configLink: '/org-settings?tab=positional-excellence&subtab=role-mapping',
        configLinkLabel: 'Configure roles',
      };
    }
    case 'position_select':
      return {
        description: 'Positions configured for this organization.',
        configLink: '/org-settings?tab=positional-excellence&subtab=positions',
        configLinkLabel: 'Manage positions',
      };
    case 'infraction_select':
      return {
        description: 'Infraction types from the discipline rubric.',
        configLink: '/org-settings?tab=discipline&subtab=infractions',
        configLinkLabel: 'Manage infractions',
      };
    case 'disc_action_select':
      return {
        description: 'Discipline actions from the discipline rubric.',
        configLink: '/org-settings?tab=discipline&subtab=actions',
        configLinkLabel: 'Manage actions',
      };
    default:
      return null;
  }
}
```

**Step 2: Verify it compiles**

Run: `pnpm typecheck`
Expected: No new errors

**Step 3: Commit**

```bash
git add apps/dashboard/lib/forms/field-palette.ts
git commit -m "feat: add getLevelsetFieldInfo helper for context-specific field descriptions"
```

---

### Task 4: Update EditorFieldCard to show Levelset field descriptions

**Files:**
- Modify: `apps/dashboard/components/forms/editor/EditorFieldCard.tsx`
- Modify: `apps/dashboard/components/forms/editor/EditorFieldCard.module.css`

**Step 1: Add `formType` prop and Levelset description rendering**

Update `EditorFieldCardProps` to accept an optional `formType` string:

```typescript
interface EditorFieldCardProps {
  field: FormField;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  isOverlay?: boolean;
  formType?: string;
}
```

Import `getLevelsetFieldInfo`:

```typescript
import { FIELD_TYPES, getLevelsetFieldInfo } from '@/lib/forms/field-palette';
```

Inside the component, compute the Levelset info:

```typescript
const levelsetInfo = React.useMemo(
  () => getLevelsetFieldInfo(field.type, formType),
  [field.type, formType]
);
const isLevelset = levelsetInfo !== null;
```

In the JSX, after the existing `fieldDescription` span, add the Levelset description. Also add the `cardLevelset` class conditionally:

Change the card root className:
```typescript
className={`${sty.card} ${isSelected ? sty.cardSelected : ''} ${isSection ? sty.cardSection : ''} ${isLevelset ? sty.cardLevelset : ''} ${isOverlay ? sty.cardOverlay : ''}`}
```

After `{field.description && (<span className={sty.fieldDescription}>{field.description}</span>)}`, add:

```typescript
{levelsetInfo && (
  <span className={sty.levelsetDescription}>{levelsetInfo.description}</span>
)}
```

**Step 2: Add CSS for Levelset visual distinction**

Add to `EditorFieldCard.module.css`:

```css
.cardLevelset {
  border-left: 3px solid var(--ls-color-brand);
}

.levelsetDescription {
  font-family: "Satoshi", sans-serif;
  font-size: 11px;
  color: var(--ls-color-brand);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-style: italic;
}
```

**Step 3: Verify it compiles**

Run: `pnpm typecheck`
Expected: No new errors

**Step 4: Commit**

```bash
git add apps/dashboard/components/forms/editor/EditorFieldCard.tsx apps/dashboard/components/forms/editor/EditorFieldCard.module.css
git commit -m "feat: show Levelset field descriptions and visual distinction on editor canvas cards"
```

---

### Task 5: Thread `formType` through EditorCanvas and FormEditorPanel

**Files:**
- Modify: `apps/dashboard/components/forms/editor/EditorCanvas.tsx`
- Modify: `apps/dashboard/components/forms/editor/FormEditorPanel.tsx`

**Step 1: Pass `formType` through EditorCanvas to EditorFieldCard**

In `EditorCanvas.tsx`, add `formType` to the props interface:

```typescript
interface EditorCanvasProps {
  fields: FormField[];
  selectedFieldId: string | null;
  onSelectField: (id: string | null) => void;
  onDeleteField: (id: string) => void;
  formType?: string;
}
```

Pass it to each `EditorFieldCard`:

```typescript
<EditorFieldCard
  key={field.id}
  field={field}
  isSelected={selectedFieldId === field.id}
  onSelect={() => onSelectField(field.id)}
  onDelete={() => onDeleteField(field.id)}
  formType={formType}
/>
```

**Step 2: Pass `formType` from FormEditorPanel**

In `FormEditorPanel.tsx`, pass `template.form_type` to `EditorCanvas`:

```typescript
<EditorCanvas
  fields={fields}
  selectedFieldId={readOnly ? null : selectedFieldId}
  onSelectField={readOnly ? () => {} : setSelectedFieldId}
  onDeleteField={readOnly ? () => {} : handleDeleteField}
  formType={template.form_type}
/>
```

Also pass it to `FieldConfigPanel`:

```typescript
<FieldConfigPanel
  field={selectedField}
  onUpdateField={handleUpdateField}
  isEvaluation={template.form_type === 'evaluation'}
  formType={template.form_type}
/>
```

And to the `DragOverlay` `EditorFieldCard`:

```typescript
<EditorFieldCard
  field={draggedField}
  isSelected={false}
  onSelect={() => {}}
  onDelete={() => {}}
  isOverlay
  formType={template.form_type}
/>
```

**Step 3: Verify it compiles**

Run: `pnpm typecheck`
Expected: No new errors

**Step 4: Commit**

```bash
git add apps/dashboard/components/forms/editor/EditorCanvas.tsx apps/dashboard/components/forms/editor/FormEditorPanel.tsx
git commit -m "feat: thread formType through editor component tree for context-aware Levelset fields"
```

---

### Task 6: Add Levelset info section to FieldConfigPanel

**Files:**
- Modify: `apps/dashboard/components/forms/editor/FieldConfigPanel.tsx`
- Modify: `apps/dashboard/components/forms/editor/FieldConfigPanel.module.css`

**Step 1: Add `formType` prop and Levelset info rendering**

Add `formType` to the props interface:

```typescript
interface FieldConfigPanelProps {
  field: FormField | null;
  onUpdateField: (id: string, updates: Partial<FormField>) => void;
  isEvaluation?: boolean;
  formType?: string;
}
```

Import the helper and an icon:

```typescript
import { FIELD_TYPES, getLevelsetFieldInfo } from '@/lib/forms/field-palette';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
```

Inside the component, compute Levelset info:

```typescript
const levelsetInfo = getLevelsetFieldInfo(field.type, formType);
```

After the `<span className={sty.fieldType}>` line and the first `<Divider>`, add the info section (before the Label section):

```typescript
{levelsetInfo && (
  <>
    <div className={sty.levelsetInfoCard}>
      <InfoOutlinedIcon sx={{ fontSize: 14, color: 'var(--ls-color-brand)', flexShrink: 0, mt: '1px' }} />
      <div className={sty.levelsetInfoContent}>
        <span className={sty.levelsetInfoText}>
          {levelsetInfo.description}
        </span>
        {levelsetInfo.configLink && (
          <a
            href={levelsetInfo.configLink}
            target="_blank"
            rel="noopener noreferrer"
            className={sty.levelsetConfigLink}
          >
            {levelsetInfo.configLinkLabel}
            <OpenInNewOutlinedIcon sx={{ fontSize: 12, ml: '2px' }} />
          </a>
        )}
      </div>
    </div>
    <Divider sx={{ margin: '8px 0' }} />
  </>
)}
```

**Step 2: Add CSS styles**

Add to `FieldConfigPanel.module.css`:

```css
.levelsetInfoCard {
  display: flex;
  flex-direction: row;
  gap: 8px;
  padding: 10px 12px;
  background: var(--ls-color-brand-soft, rgba(37, 99, 235, 0.06));
  border-radius: 8px;
  border: 1px solid var(--ls-color-brand-border, rgba(37, 99, 235, 0.15));
}

.levelsetInfoContent {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.levelsetInfoText {
  font-family: "Satoshi", sans-serif;
  font-size: 12px;
  color: var(--ls-color-text-primary);
  line-height: 1.4;
}

.levelsetConfigLink {
  display: inline-flex;
  align-items: center;
  font-family: "Satoshi", sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: var(--ls-color-brand);
  text-decoration: none;
  cursor: pointer;
}

.levelsetConfigLink:hover {
  text-decoration: underline;
}
```

**Step 3: Verify it compiles**

Run: `pnpm typecheck`
Expected: No new errors

**Step 4: Commit**

```bash
git add apps/dashboard/components/forms/editor/FieldConfigPanel.tsx apps/dashboard/components/forms/editor/FieldConfigPanel.module.css
git commit -m "feat: add Levelset info section with config links to FieldConfigPanel"
```

---

### Task 7: Pass `formType` through FormRenderer formContext

**Files:**
- Modify: `apps/dashboard/components/forms/FormRenderer.tsx`

**Step 1: Add `formType` to the formContext object**

This ensures the LeaderSelectWidget gets `formType` at runtime when forms are rendered (preview and live submission).

Change line 133:

```typescript
formContext={{ orgId: template.org_id, locationId: selectedLocationId, formType: template.form_type }}
```

**Step 2: Verify it compiles**

Run: `pnpm typecheck`
Expected: No new errors

**Step 3: Commit**

```bash
git add apps/dashboard/components/forms/FormRenderer.tsx
git commit -m "feat: pass formType through FormRenderer formContext for widget access"
```

---

### Task 8: Final verification — typecheck and build

**Step 1: Run typecheck**

Run: `pnpm typecheck`
Expected: All checks pass (only pre-existing errors in mobile app are acceptable)

**Step 2: Run dashboard build**

Run: `pnpm --filter dashboard build`
Expected: Build succeeds

**Step 3: Final commit with all changes if any were missed**

Only commit if there are unstaged changes.
