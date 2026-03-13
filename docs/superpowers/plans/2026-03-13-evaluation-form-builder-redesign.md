# Evaluation Form Builder Redesign

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the disconnected evaluation editor extension with an integrated section-based form builder and a settings modal for role/notification config.

**Architecture:** The flat field list becomes a section-grouped canvas where evaluation sections act as collapsible containers with inline scoring. The separate EvaluationEditorExtension is removed entirely. A new settings modal (opened via gear button) handles role applicability, notifications config, and section management. Data model changes: `role_level` (number) → `applicable_roles` (string[]), new `notifications` object.

**Tech Stack:** React, MUI v7, CSS Modules, @dnd-kit, Supabase (org_roles query)

---

## UI/UX Design Guidelines

These rules apply to ALL code in this plan. Violations should be caught during review.

### Interaction
- All clickable elements must have `cursor: pointer`
- Hover states must provide clear visual feedback with smooth transitions (150–300ms, `ease-out`)
- Buttons must be disabled + show loading state during async operations (no double-clicks)
- Focus states must be visible for keyboard navigation (never remove outlines without replacement)
- Touch targets minimum 44x44px for icon buttons

### Animation
- Use `ease-out` for enter animations, `ease-in` for exit
- Collapse/expand sections: `200ms ease-out` on max-height or use `@keyframes`
- Never use `linear` for UI transitions
- Respect `prefers-reduced-motion` — disable animations when set

### Feedback
- Show loading spinners for async operations > 300ms (role fetch, save)
- Show success/error feedback after save operations (existing Snackbar pattern)
- Skeleton or CircularProgress while roles load in modal

### Typography & Color
- Use existing Satoshi font family — never introduce new fonts
- Use existing CSS variables (`--ls-color-*`) — never hardcode hex values except in SCORING_TYPES chip colors (which are intentionally distinct from the design token palette)
- Maintain 4.5:1 contrast ratio for all text
- Section headers: uppercase, 0.3px letter-spacing, 13px, weight 700 (matches existing `.sectionLabel` pattern)

### Layout
- Section containers must not cause horizontal scroll at any viewport width
- Weight inputs: 48px wide, centered text, border-radius 6px
- Consistent 8px gap between field cards within sections
- Canvas max-width 600px centered (existing pattern)

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `components/forms/evaluation/EvaluationSettingsModal.tsx` | **Create** | Modal: applicable roles (checkboxes from org_roles), notifications (toggle + placeholder), section manager |
| `components/forms/evaluation/EvaluationSettingsModal.module.css` | **Create** | Styles for modal content sections |
| `components/forms/editor/EditorCanvas.tsx` | **Modify** | For evaluation forms: group fields by section, render section containers, unscored area |
| `components/forms/editor/EditorCanvas.module.css` | **Modify** | Section container styles, unscored area, weight total bar |
| `components/forms/editor/EditorFieldCard.tsx` | **Modify** | Show inline weight input + scoring chip when field is inside an evaluation section |
| `components/forms/editor/EditorFieldCard.module.css` | **Modify** | Inline scoring controls layout |
| `components/forms/editor/FormEditorPanel.tsx` | **Modify** | Remove EvaluationEditorExtension, pass section data to canvas, handle eval question updates |
| `components/pages/FormDetailPage.tsx` | **Modify** | Add settings icon button in header for evaluation forms, manage modal open state |
| `components/forms/evaluation/SectionManager.tsx` | **Modify** | Remove role level dimming logic (concept is gone) |
| `components/forms/editor/FieldConfigPanel.tsx` | **Modify** | Add section assignment dropdown for evaluation forms |
| `components/forms/evaluation/EvaluationEditorExtension.tsx` | **Delete** | Replaced by settings modal + integrated canvas |
| `components/forms/evaluation/EvaluationEditorExtension.module.css` | **Delete** | No longer needed |
| `components/forms/evaluation/QuestionWeightEditor.tsx` | **Delete** | Weights are now inline on field cards |

**Files kept as-is:**
- `components/forms/evaluation/ConnectedQuestionPicker.tsx` — still used in FieldConfigPanel
- `lib/forms/schema-builder.ts` — no changes needed (sectionId already exists on FormField)
- `lib/forms/types.ts` — no changes needed (settings is `Record<string, any>`)
- `components/forms/dialogStyles.ts` — reused for modal styling

---

## Chunk 1: Evaluation Settings Modal

### Task 1: Create EvaluationSettingsModal component

**Files:**
- Create: `apps/dashboard/components/forms/evaluation/EvaluationSettingsModal.tsx`
- Create: `apps/dashboard/components/forms/evaluation/EvaluationSettingsModal.module.css`

- [ ] **Step 1: Create the modal CSS module**

```css
/* EvaluationSettingsModal.module.css */

.modalSection {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modalSectionTitle {
  font-family: "Satoshi", sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--ls-color-text-primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0;
}

.modalSectionDescription {
  font-family: "Satoshi", sans-serif;
  font-size: 13px;
  color: var(--ls-color-muted);
  margin: 0;
  line-height: 1.5;
}

.rolesGrid {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.roleRow {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
}

.roleChip {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 4px;
  font-family: "Satoshi", sans-serif;
  font-size: 12px;
  font-weight: 600;
  cursor: default;
}

.notificationRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
}

.notificationLabel {
  font-family: "Satoshi", sans-serif;
  font-size: 13px;
  color: var(--ls-color-text-primary);
}

.notificationHint {
  font-family: "Satoshi", sans-serif;
  font-size: 12px;
  color: var(--ls-color-muted);
  font-style: italic;
}
```

- [ ] **Step 2: Create the modal component**

Create `EvaluationSettingsModal.tsx` with these behaviors:
- Fetches org roles from Supabase `org_roles` table on open
- Renders role checkboxes ordered by `hierarchy_level` (lowest level role always checked + disabled)
- "Notify on submission" toggle (UI only — not wired to backend yet)
- Embeds existing `SectionManager` component for scoring section CRUD
- Local draft state initialized from props on open — only persisted on Save click
- Save button disabled + shows spinner during async save

Key implementation details:
- Roles are fetched from `org_roles` filtered by `auth.org_id`, ordered by `hierarchy_level asc`
- The locked role is determined by `Math.min(hierarchy_level)` — this is always checked and disabled
- Uses `CircularProgress size={20}` while roles load (feedback for async > 300ms)
- Uses existing `dialogPaperSx`, `dialogTitleSx`, `dialogContentSx`, `dialogActionsSx` from `../dialogStyles`
- Close icon button in dialog title (44x44 touch target via MUI IconButton)
- `SectionManager` is passed without `roleLevel` (after Task 3 cleans it up; pass `roleLevel={999}` as temporary compat)

```tsx
import * as React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Checkbox,
  FormControlLabel,
  Switch,
  Divider,
  CircularProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { createSupabaseClient } from '@/util/supabase/component';
import { useAuth } from '@/lib/providers/AuthProvider';
import { getRoleColor, type OrgRole } from '@/lib/role-utils';
import { SectionManager } from './SectionManager';
import {
  fontFamily,
  dialogPaperSx,
  dialogTitleSx,
  dialogContentSx,
  dialogActionsSx,
  cancelButtonSx,
  primaryButtonSx,
} from '../dialogStyles';
import sty from './EvaluationSettingsModal.module.css';

interface EvaluationSection {
  id: string;
  name: string;
  name_es?: string;
  order: number;
  is_predefined: boolean;
  max_role_level?: number;
}

interface EvaluationSettings {
  applicable_roles?: string[];
  notifications?: {
    notify_on_submit?: boolean;
  };
  sections?: EvaluationSection[];
  questions?: Record<string, any>;
  role_level?: number;
}

interface EvaluationSettingsModalProps {
  open: boolean;
  onClose: () => void;
  evaluationSettings: EvaluationSettings;
  onSave: (settings: EvaluationSettings) => Promise<void>;
}

const DEFAULT_SECTIONS: EvaluationSection[] = [
  { id: 'sec_leadership', name: 'Leadership Culture', order: 0, is_predefined: true },
  { id: 'sec_execution', name: 'Execution of Core Strategy', order: 1, is_predefined: true },
  { id: 'sec_win', name: "What's Important Now", order: 2, is_predefined: true },
  { id: 'sec_results', name: 'Business Results', order: 3, is_predefined: true },
];

export function EvaluationSettingsModal({
  open,
  onClose,
  evaluationSettings,
  onSave,
}: EvaluationSettingsModalProps) {
  const auth = useAuth();
  const [roles, setRoles] = React.useState<OrgRole[]>([]);
  const [rolesLoading, setRolesLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [applicableRoles, setApplicableRoles] = React.useState<string[]>([]);
  const [notifyOnSubmit, setNotifyOnSubmit] = React.useState(false);
  const [sections, setSections] = React.useState<EvaluationSection[]>([]);

  React.useEffect(() => {
    if (!open || !auth.org_id) return;
    const fetchRoles = async () => {
      setRolesLoading(true);
      try {
        const supabase = createSupabaseClient();
        const { data } = await supabase
          .from('org_roles')
          .select('*')
          .eq('org_id', auth.org_id)
          .order('hierarchy_level', { ascending: true });
        if (data) setRoles(data as OrgRole[]);
      } catch {
        // silently handle
      } finally {
        setRolesLoading(false);
      }
    };
    fetchRoles();
  }, [open, auth.org_id]);

  React.useEffect(() => {
    if (open) {
      setApplicableRoles(evaluationSettings.applicable_roles || []);
      setNotifyOnSubmit(evaluationSettings.notifications?.notify_on_submit ?? false);
      setSections(
        evaluationSettings.sections?.length
          ? evaluationSettings.sections
          : DEFAULT_SECTIONS
      );
    }
  }, [open, evaluationSettings]);

  const lockedRoleId = React.useMemo(() => {
    if (roles.length === 0) return null;
    const sorted = [...roles].sort((a, b) => a.hierarchy_level - b.hierarchy_level);
    return sorted[0].id;
  }, [roles]);

  const handleRoleToggle = (roleId: string) => {
    if (roleId === lockedRoleId) return;
    setApplicableRoles((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const finalRoles = lockedRoleId && !applicableRoles.includes(lockedRoleId)
        ? [lockedRoleId, ...applicableRoles]
        : applicableRoles;
      await onSave({
        ...evaluationSettings,
        applicable_roles: finalRoles,
        notifications: { notify_on_submit: notifyOnSubmit },
        sections,
      });
      onClose();
    } catch {
      // error handled by parent snackbar
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: dialogPaperSx }}
    >
      <DialogTitle sx={dialogTitleSx}>
        Evaluation Settings
        <IconButton size="small" onClick={onClose} aria-label="Close settings">
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={dialogContentSx}>
        {/* Applicable Roles */}
        <div className={sty.modalSection}>
          <h4 className={sty.modalSectionTitle}>Applicable Roles</h4>
          <p className={sty.modalSectionDescription}>
            Select which roles this evaluation applies to.
          </p>
          {rolesLoading ? (
            <CircularProgress size={20} />
          ) : (
            <div className={sty.rolesGrid}>
              {roles.map((role) => {
                const isLocked = role.id === lockedRoleId;
                const isChecked = isLocked || applicableRoles.includes(role.id);
                const color = getRoleColor(role.color);
                return (
                  <div key={role.id} className={sty.roleRow}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={isChecked}
                          disabled={isLocked}
                          onChange={() => handleRoleToggle(role.id)}
                          size="small"
                          sx={{
                            '&.Mui-checked': { color: 'var(--ls-color-brand)' },
                          }}
                        />
                      }
                      label={
                        <span
                          className={sty.roleChip}
                          style={{ backgroundColor: color.bg, color: color.text }}
                        >
                          {role.role_name}
                        </span>
                      }
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Divider />

        {/* Notifications */}
        <div className={sty.modalSection}>
          <h4 className={sty.modalSectionTitle}>Notifications</h4>
          <div className={sty.notificationRow}>
            <span className={sty.notificationLabel}>Notify when evaluation is submitted</span>
            <Switch
              checked={notifyOnSubmit}
              onChange={(e) => setNotifyOnSubmit(e.target.checked)}
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
          </div>
          <span className={sty.notificationHint}>
            Recipient configuration coming soon
          </span>
        </div>

        <Divider />

        {/* Scoring Sections */}
        <div className={sty.modalSection}>
          <h4 className={sty.modalSectionTitle}>Scoring Sections</h4>
          <p className={sty.modalSectionDescription}>
            Manage the sections used to group and score evaluation questions.
          </p>
          <SectionManager
            sections={sections}
            onSectionsChange={setSections}
            roleLevel={999}
          />
        </div>
      </DialogContent>

      <DialogActions sx={dialogActionsSx}>
        <Button onClick={onClose} disabled={saving} sx={cancelButtonSx}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : null}
          sx={primaryButtonSx}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
```

- [ ] **Step 3: Verify build compiles**

Run: `pnpm dev:dashboard`
Verify no build errors (modal is not wired yet).

- [ ] **Step 4: Commit**

```bash
git add apps/dashboard/components/forms/evaluation/EvaluationSettingsModal.tsx apps/dashboard/components/forms/evaluation/EvaluationSettingsModal.module.css
git commit -m "feat(forms): add EvaluationSettingsModal with roles, notifications, and sections"
```

---

### Task 2: Wire settings modal into FormDetailPage

**Files:**
- Modify: `apps/dashboard/components/pages/FormDetailPage.tsx`

- [ ] **Step 1: Add settings modal state and gear button**

In `FormDetailPage.tsx`:

1. Add imports:
```tsx
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import { EvaluationSettingsModal } from '@/components/forms/evaluation/EvaluationSettingsModal';
```

2. Add state:
```tsx
const [settingsModalOpen, setSettingsModalOpen] = React.useState(false);
```

3. In the `pageHeader` div, add a right-side area with the settings button. Only show for evaluation forms that aren't system forms:
```tsx
<div className={sty.pageHeader}>
  <div className={sty.headerLeft}>
    {/* ...existing title and badges */}
  </div>
  {template.form_type === 'evaluation' && !isSystem && (
    <IconButton
      onClick={() => setSettingsModalOpen(true)}
      aria-label="Evaluation settings"
      sx={{
        border: '1px solid var(--ls-color-muted-border)',
        borderRadius: '8px',
        padding: '8px',
        color: 'var(--ls-color-muted)',
        transition: 'all 200ms ease-out',
        '&:hover': {
          color: 'var(--ls-color-brand)',
          borderColor: 'var(--ls-color-brand)',
          backgroundColor: 'var(--ls-color-brand-soft)',
        },
      }}
    >
      <TuneOutlinedIcon sx={{ fontSize: 20 }} />
    </IconButton>
  )}
</div>
```

4. Render the modal before the closing `</>`:
```tsx
{template.form_type === 'evaluation' && !isSystem && (
  <EvaluationSettingsModal
    open={settingsModalOpen}
    onClose={() => setSettingsModalOpen(false)}
    evaluationSettings={template.settings?.evaluation || {}}
    onSave={async (evalSettings) => {
      await handleSaveEvaluationSettings(evalSettings);
    }}
  />
)}
```

**UX notes:**
- Button has `aria-label` for accessibility
- 200ms ease-out transition on hover (per animation guidelines)
- Border + padding gives 36px touch target (adequate with 8px padding around 20px icon)
- Muted → brand color transition on hover gives clear interactive feedback

- [ ] **Step 2: Verify**

Navigate to an evaluation form. Verify:
- Settings button visible in header (right-aligned)
- Not visible on non-evaluation forms or system forms
- Clicking opens modal
- Roles load
- Save works (check Snackbar feedback)

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/components/pages/FormDetailPage.tsx
git commit -m "feat(forms): wire EvaluationSettingsModal into FormDetailPage header"
```

---

### Task 3: Clean up SectionManager — remove role level concept

**Files:**
- Modify: `apps/dashboard/components/forms/evaluation/SectionManager.tsx`

- [ ] **Step 1: Remove role level dimming logic**

The role level concept is gone. Clean up `SectionManager.tsx`:

**Remove:**
- The `roleLevel` prop from `SectionManagerProps` (or make optional with no behavior)
- The `isDimmed` function
- The `opacity` and dimmed `background` styling on section rows
- The `max_role_level` Chip rendering
- The dimmed explanatory text `<span>` ("Not applicable at role level...")

**Keep:**
- All section CRUD (add, delete, rename EN/ES, reorder up/down)
- Lock icon for predefined sections
- Move up/down arrow buttons
- The overall layout and styling

**After cleanup, the `SectionManagerProps` interface should be:**
```typescript
interface SectionManagerProps {
  sections: EvaluationSection[];
  onSectionsChange: (sections: EvaluationSection[]) => void;
}
```

Also remove `max_role_level` from the `EvaluationSection` interface in this file since it's no longer used.

- [ ] **Step 2: Update modal to not pass roleLevel**

In `EvaluationSettingsModal.tsx`, remove the `roleLevel={999}` prop from `<SectionManager>`.

- [ ] **Step 3: Verify**

Open settings modal → sections display, reorder, add, delete, rename all work.

- [ ] **Step 4: Commit**

```bash
git add apps/dashboard/components/forms/evaluation/SectionManager.tsx apps/dashboard/components/forms/evaluation/EvaluationSettingsModal.tsx
git commit -m "refactor(forms): remove role level concept from SectionManager"
```

---

## Chunk 2: Section-Grouped Editor Canvas

### Task 4: Update EditorCanvas to render section groups for evaluation forms

**Files:**
- Modify: `apps/dashboard/components/forms/editor/EditorCanvas.tsx`
- Modify: `apps/dashboard/components/forms/editor/EditorCanvas.module.css`

- [ ] **Step 1: Add section container and weight total styles**

Append to `EditorCanvas.module.css`:

```css
/* ── Evaluation section containers ─────────────────────────── */

.sectionContainer {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--ls-color-muted-border);
  border-radius: 10px;
  overflow: hidden;
  background: var(--ls-color-bg-card);
  transition: border-color 200ms ease-out;
}

.sectionContainer:hover {
  border-color: var(--ls-color-border);
}

.sectionHeader {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: var(--ls-color-neutral-foreground);
  border-bottom: 1px solid var(--ls-color-muted-border);
  cursor: pointer;
  user-select: none;
  transition: background-color 150ms ease-out;
}

.sectionHeader:hover {
  background: var(--ls-color-brand-soft);
}

.sectionHeaderCollapsed {
  border-bottom: none;
}

.sectionName {
  flex: 1;
  font-family: "Satoshi", sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: var(--ls-color-text-primary);
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.sectionMeta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sectionWeight {
  font-family: "Satoshi", sans-serif;
  font-size: 11px;
  font-weight: 600;
  color: var(--ls-color-muted);
  white-space: nowrap;
}

.sectionFieldCount {
  font-family: "Satoshi", sans-serif;
  font-size: 11px;
  color: var(--ls-color-muted);
  white-space: nowrap;
}

.sectionFields {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  min-height: 40px;
}

.sectionFieldsEmpty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 16px;
  font-family: "Satoshi", sans-serif;
  font-size: 12px;
  color: var(--ls-color-muted);
  font-style: italic;
  border: 1px dashed var(--ls-color-muted-border);
  border-radius: 6px;
  margin: 8px;
}

.unscoredArea {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.unscoredHeader {
  font-family: "Satoshi", sans-serif;
  font-size: 11px;
  font-weight: 600;
  color: var(--ls-color-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 4px 0;
}

.weightTotalBar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 10px 0 2px;
  border-top: 1px solid var(--ls-color-muted-border);
  margin-top: 4px;
}

.weightTotalText {
  font-family: "Satoshi", sans-serif;
  font-size: 12px;
  font-weight: 600;
}

.weightBalanced {
  color: var(--ls-color-success);
}

.weightUnbalanced {
  color: var(--ls-color-warning);
}

/* Collapse/expand animation */
.sectionFieldsCollapsible {
  overflow: hidden;
  transition: max-height 200ms ease-out, opacity 200ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .sectionFieldsCollapsible {
    transition: none;
  }
  .sectionHeader,
  .sectionContainer {
    transition: none;
  }
}
```

- [ ] **Step 2: Add evaluation props to EditorCanvas**

Add new props to `EditorCanvasProps`:

```typescript
interface EditorCanvasProps {
  fields: FormField[];
  selectedFieldId: string | null;
  onSelectField: (id: string | null) => void;
  onDeleteField: (id: string) => void;
  onUpdateField?: (id: string, updates: Partial<FormField>) => void;
  formType?: string;
  /** Evaluation-specific: scoring sections to group fields into */
  evaluationSections?: Array<{ id: string; name: string }>;
  /** Evaluation-specific: question config keyed by field ID */
  evaluationQuestions?: Record<string, { section_id: string; weight: number; scoring_type: string }>;
  /** Evaluation-specific: callback to update a question's section or weight */
  onUpdateEvaluationQuestion?: (fieldId: string, updates: Partial<{ section_id: string; weight: number }>) => void;
}
```

- [ ] **Step 3: Implement section-grouped rendering**

When `formType === 'evaluation'` and `evaluationSections` has items, change the canvas body to:

1. **Group fields** by `evaluationQuestions[field.id]?.section_id`. Fields with no match go to `__unscored__`.
2. **Collapse state**: `const [collapsedSections, setCollapsedSections] = React.useState<Set<string>>(new Set())`
3. **For each section**, render:
   - Section header with chevron (KeyboardArrowDown when expanded, KeyboardArrowRight when collapsed), section name, field count badge, total section weight
   - Collapsible fields area with the section's field cards
   - Empty state ("Drag fields here to score them") when section has no fields
   - Each section's fields area is a `useDroppable` with `id: 'section-${sectionId}'` and `data: { type: 'section-drop', sectionId }`
4. **After all sections**, render unscored fields area:
   - Header: "UNSCORED FIELDS"
   - The unscored droppable area with `id: 'section-unscored'` and `data: { type: 'section-drop', sectionId: '' }`
   - Field cards for unscored fields
5. **Weight total bar** at the bottom showing `Total: X / 100` (green if 100, warning otherwise)
6. **SortableContext** wraps ALL fields as a flat list — the visual grouping is presentation only. Sortable reorder still works within the flat list.

**For non-evaluation forms**, keep the existing flat `fieldList` rendering completely unchanged.

Import `KeyboardArrowDownIcon` and `KeyboardArrowRightIcon` from `@mui/icons-material`.

- [ ] **Step 4: Verify section groups render**

Run: `pnpm dev:dashboard`
- Open an evaluation form → sections render as collapsible containers
- Unassigned fields in "Unscored Fields" area
- Collapse/expand toggles work with smooth animation
- Non-evaluation forms unchanged
- Canvas doesn't cause horizontal scroll

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/components/forms/editor/EditorCanvas.tsx apps/dashboard/components/forms/editor/EditorCanvas.module.css
git commit -m "feat(forms): render section-grouped canvas for evaluation forms"
```

---

### Task 5: Add inline scoring controls to EditorFieldCard

**Files:**
- Modify: `apps/dashboard/components/forms/editor/EditorFieldCard.tsx`
- Modify: `apps/dashboard/components/forms/editor/EditorFieldCard.module.css`

- [ ] **Step 1: Add inline scoring styles**

Append to `EditorFieldCard.module.css`:

```css
/* ── Inline evaluation scoring ────────────────────────────── */

.scoringControls {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.weightInput {
  width: 48px;
  height: 24px;
  border: 1px solid var(--ls-color-muted-border);
  border-radius: 6px;
  text-align: center;
  font-family: "Satoshi", sans-serif;
  font-size: 12px;
  color: var(--ls-color-text-primary);
  background: var(--ls-color-bg-container);
  outline: none;
  transition: border-color 150ms ease-out;
}

.weightInput:focus {
  border-color: var(--ls-color-brand);
  box-shadow: 0 0 0 1px var(--ls-color-brand);
}

.weightInput:hover:not(:focus) {
  border-color: var(--ls-color-border);
}

/* Remove spinner arrows on number inputs */
.weightInput::-webkit-outer-spin-button,
.weightInput::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.weightInput[type="number"] {
  -moz-appearance: textfield;
}
```

- [ ] **Step 2: Add scoring props and inline controls**

Add to `EditorFieldCardProps`:
```typescript
interface EditorFieldCardProps {
  // ...existing
  /** Evaluation scoring info — show inline weight + type chip when present and assigned to a section */
  evaluationQuestion?: { section_id: string; weight: number; scoring_type: string };
  /** Callback when weight is changed inline */
  onUpdateWeight?: (weight: number) => void;
}
```

Add SCORING_TYPES lookup at top of file:
```typescript
const SCORING_TYPES: Record<string, { label: string; color: string }> = {
  rating_1_3: { label: '1–3', color: 'var(--ls-color-brand)' },
  rating_1_5: { label: '1–5', color: 'var(--ls-color-brand)' },
  true_false: { label: 'T/F', color: '#6366F1' },
  percentage: { label: '%', color: '#D97706' },
};
```

In the card JSX, after `<div className={sty.cardContent}>...</div>` and before the delete `<IconButton>`, add:

```tsx
{evaluationQuestion && evaluationQuestion.section_id && (
  <div className={sty.scoringControls}>
    <Chip
      label={SCORING_TYPES[evaluationQuestion.scoring_type]?.label || '?'}
      size="small"
      sx={{
        fontFamily,
        fontSize: 10,
        fontWeight: 700,
        height: 20,
        minWidth: 32,
        borderRadius: '4px',
        backgroundColor: SCORING_TYPES[evaluationQuestion.scoring_type]?.color || 'var(--ls-color-brand)',
        color: '#fff',
        '& .MuiChip-label': { padding: '0 5px' },
      }}
    />
    <input
      type="number"
      className={sty.weightInput}
      value={evaluationQuestion.weight}
      min={0}
      max={100}
      aria-label={`Weight for ${field.label}`}
      onChange={(e) => {
        const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
        onUpdateWeight?.(val);
      }}
      onClick={(e) => e.stopPropagation()}
    />
  </div>
)}
```

**UX notes:**
- `aria-label` on the weight input for accessibility
- `e.stopPropagation()` on click so clicking the input doesn't select/deselect the card
- Focus state: brand-colored border + box-shadow (visible focus ring)
- Spinner arrows hidden for cleaner appearance
- 150ms ease-out transition on border color hover/focus

- [ ] **Step 3: Wire from EditorCanvas**

In EditorCanvas, when rendering field cards inside sections, pass:
```tsx
evaluationQuestion={evaluationQuestions?.[field.id]}
onUpdateWeight={(weight) => onUpdateEvaluationQuestion?.(field.id, { weight })}
```

For fields in the unscored area, pass `evaluationQuestion` but it won't render controls since `section_id` will be empty.

- [ ] **Step 4: Verify**

Open evaluation form. Fields inside sections show scoring chip + weight input. Fields in unscored area don't show scoring controls. Weight changes trigger auto-save.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/components/forms/editor/EditorFieldCard.tsx apps/dashboard/components/forms/editor/EditorFieldCard.module.css apps/dashboard/components/forms/editor/EditorCanvas.tsx
git commit -m "feat(forms): add inline scoring controls to EditorFieldCard"
```

---

### Task 6: Wire everything together in FormEditorPanel

**Files:**
- Modify: `apps/dashboard/components/forms/editor/FormEditorPanel.tsx`

- [ ] **Step 1: Remove EvaluationEditorExtension**

- Remove the import: `import { EvaluationEditorExtension } from '../evaluation/EvaluationEditorExtension';`
- Remove the JSX block (around lines 263-269):
```tsx
{/* Evaluation-specific extension */}
{!readOnly && template.form_type === 'evaluation' && onSaveSettings && (
  <EvaluationEditorExtension ... />
)}
```

- [ ] **Step 2: Add evaluation data plumbing**

After `const [saveStatus, setSaveStatus] = ...` add:

```tsx
const evalSettings = template.settings?.evaluation || {};
const evaluationSections = React.useMemo(
  () => (evalSettings.sections || []).map((s: any) => ({ id: s.id, name: s.name })),
  [evalSettings.sections]
);
const evaluationQuestions = evalSettings.questions || {};
```

Add the handler for evaluation question updates:
```tsx
const handleEvalQuestionUpdate = React.useCallback(
  (fieldId: string, updates: Partial<{ section_id: string; weight: number }>) => {
    if (!onSaveSettings) return;
    const currentEval = template.settings?.evaluation || {};
    const questions = currentEval.questions || {};
    const current = questions[fieldId] || { section_id: '', weight: 1, scoring_type: 'rating_1_5' };
    const updatedQuestions = { ...questions, [fieldId]: { ...current, ...updates } };
    onSaveSettings({
      ...template.settings,
      evaluation: { ...currentEval, questions: updatedQuestions },
    });
  },
  [template, onSaveSettings]
);
```

- [ ] **Step 3: Pass evaluation props to EditorCanvas**

```tsx
<EditorCanvas
  fields={fields}
  selectedFieldId={readOnly ? null : selectedFieldId}
  onSelectField={readOnly ? () => {} : setSelectedFieldId}
  onDeleteField={readOnly ? () => {} : handleDeleteField}
  onUpdateField={readOnly ? undefined : handleUpdateField}
  formType={template.form_type}
  evaluationSections={template.form_type === 'evaluation' ? evaluationSections : undefined}
  evaluationQuestions={template.form_type === 'evaluation' ? evaluationQuestions : undefined}
  onUpdateEvaluationQuestion={template.form_type === 'evaluation' ? handleEvalQuestionUpdate : undefined}
/>
```

- [ ] **Step 4: Handle drag-and-drop section assignment**

In `handleDragEnd`, after the existing palette-drop and reorder logic, add section-assignment detection:

```tsx
// Evaluation: detect cross-section drops
if (template.form_type === 'evaluation' && activeData?.type === 'canvas-field') {
  const overData = over.data.current;
  if (overData?.type === 'section-drop' && overData.sectionId !== undefined) {
    handleEvalQuestionUpdate(active.id as string, { section_id: overData.sectionId });
  }
}
```

This works because each section's droppable area in EditorCanvas has `data: { type: 'section-drop', sectionId }`. When a field is dropped over a section container, `over.data.current` will have this data.

- [ ] **Step 5: Verify full integration**

- Section-grouped canvas renders
- Inline weights editable
- Drag field between sections updates assignment
- Drag to unscored removes assignment
- Old EvaluationEditorExtension gone
- Non-evaluation forms unchanged

- [ ] **Step 6: Commit**

```bash
git add apps/dashboard/components/forms/editor/FormEditorPanel.tsx
git commit -m "feat(forms): wire section-grouped canvas and remove EvaluationEditorExtension"
```

---

### Task 7: Delete deprecated files

**Files:**
- Delete: `apps/dashboard/components/forms/evaluation/EvaluationEditorExtension.tsx`
- Delete: `apps/dashboard/components/forms/evaluation/EvaluationEditorExtension.module.css`
- Delete: `apps/dashboard/components/forms/evaluation/QuestionWeightEditor.tsx`

- [ ] **Step 1: Verify no remaining imports**

```bash
grep -r "EvaluationEditorExtension" apps/dashboard/
grep -r "QuestionWeightEditor" apps/dashboard/
```

Both should return zero results.

- [ ] **Step 2: Delete files**

```bash
rm apps/dashboard/components/forms/evaluation/EvaluationEditorExtension.tsx
rm apps/dashboard/components/forms/evaluation/EvaluationEditorExtension.module.css
rm apps/dashboard/components/forms/evaluation/QuestionWeightEditor.tsx
```

- [ ] **Step 3: Verify build**

```bash
pnpm --filter dashboard build
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(forms): delete deprecated EvaluationEditorExtension and QuestionWeightEditor"
```

---

## Chunk 3: Config Panel + Polish

### Task 8: Add section assignment dropdown to FieldConfigPanel

**Files:**
- Modify: `apps/dashboard/components/forms/editor/FieldConfigPanel.tsx`
- Modify: `apps/dashboard/components/forms/editor/FormEditorPanel.tsx`

- [ ] **Step 1: Add section dropdown to FieldConfigPanel**

Add new props:
```typescript
interface FieldConfigPanelProps {
  // ...existing
  /** Available evaluation sections for section assignment dropdown */
  evaluationSections?: Array<{ id: string; name: string }>;
  /** Current evaluation question config for the selected field */
  evaluationQuestion?: { section_id: string; weight: number; scoring_type: string };
  /** Callback to assign field to a section */
  onAssignSection?: (fieldId: string, sectionId: string) => void;
}
```

In the scoring section (when `isEvaluation && !isSection`), add a section assignment dropdown **above** the scoring type selector:

```tsx
{evaluationSections && evaluationSections.length > 0 && (
  <FormControl fullWidth size="small">
    <InputLabel sx={inputLabelSx}>Section</InputLabel>
    <StyledSelect
      value={evaluationQuestion?.section_id || ''}
      onChange={(e) => onAssignSection?.(field.id, e.target.value as string)}
      label="Section"
    >
      <MenuItem value="" sx={{ fontFamily, fontSize: 13 }}>
        <em>Unscored</em>
      </MenuItem>
      {evaluationSections.map((s) => (
        <MenuItem key={s.id} value={s.id} sx={{ fontFamily, fontSize: 13 }}>
          {s.name}
        </MenuItem>
      ))}
    </StyledSelect>
  </FormControl>
)}
```

- [ ] **Step 2: Pass new props from FormEditorPanel**

```tsx
<FieldConfigPanel
  field={selectedField}
  onUpdateField={handleUpdateField}
  isEvaluation={template.form_type === 'evaluation'}
  formType={template.form_type}
  evaluationSections={template.form_type === 'evaluation' ? evaluationSections : undefined}
  evaluationQuestion={
    template.form_type === 'evaluation' && selectedField
      ? evaluationQuestions[selectedField.id]
      : undefined
  }
  onAssignSection={
    template.form_type === 'evaluation'
      ? (fieldId, sectionId) => handleEvalQuestionUpdate(fieldId, { section_id: sectionId })
      : undefined
  }
/>
```

- [ ] **Step 3: Verify**

Select a field in an evaluation form. Config panel shows Section dropdown. Changing it moves the field to that section in the canvas immediately.

- [ ] **Step 4: Commit**

```bash
git add apps/dashboard/components/forms/editor/FieldConfigPanel.tsx apps/dashboard/components/forms/editor/FormEditorPanel.tsx
git commit -m "feat(forms): add section assignment dropdown to FieldConfigPanel"
```

---

### Task 9: Final verification and typecheck

- [ ] **Step 1: Run typecheck**

```bash
pnpm typecheck
```

Fix any errors.

- [ ] **Step 2: Run build**

```bash
pnpm --filter dashboard build
```

Fix any errors.

- [ ] **Step 3: Manual QA checklist**

Run `pnpm dev:dashboard` and verify:

**Settings modal:**
- [ ] Gear button appears for evaluation forms only (not system, not other types)
- [ ] Button has hover feedback (muted → brand color, 200ms transition)
- [ ] Modal opens with roles loaded from `org_roles`
- [ ] Loading spinner shows while roles fetch
- [ ] Lowest hierarchy role is always checked + disabled
- [ ] Other roles toggle on/off
- [ ] Notify on submit toggle works
- [ ] Sections CRUD works (add, delete, rename, reorder)
- [ ] Save button disables + shows spinner during save
- [ ] Snackbar shows success/error after save
- [ ] Cancel closes without saving

**Section-grouped canvas:**
- [ ] Fields grouped by assigned section in collapsible containers
- [ ] Unassigned fields in "Unscored Fields" area at bottom
- [ ] Section headers show: chevron, name, field count, total weight
- [ ] Collapse/expand animates smoothly (200ms ease-out)
- [ ] Animation respects `prefers-reduced-motion`
- [ ] Empty sections show dashed "Drag fields here" placeholder
- [ ] Total weight bar at bottom (green at 100, warning otherwise)
- [ ] No horizontal scroll at any viewport width

**Inline scoring:**
- [ ] Scoring chip (1–5, 1–3, T/F, %) visible on section fields
- [ ] Weight input has visible focus ring (brand color)
- [ ] Weight changes auto-save correctly
- [ ] Clicking weight input doesn't select/deselect the card
- [ ] Weight input has `aria-label`

**Config panel:**
- [ ] Section dropdown appears for evaluation fields
- [ ] Changing section immediately moves field in canvas
- [ ] "Unscored" option removes field from all sections
- [ ] Scoring type still configurable

**Non-evaluation forms:**
- [ ] Rating, discipline, custom forms render as flat field list (unchanged)
- [ ] No gear button visible
- [ ] No section containers or weight UI

**Drag and drop:**
- [ ] Drag from palette to canvas works
- [ ] Reorder within a section works
- [ ] Drag between sections updates assignment
- [ ] Drag to unscored area removes assignment

**Accessibility:**
- [ ] All icon buttons have `aria-label`
- [ ] Tab order follows visual order through sections
- [ ] Focus visible on all interactive elements
- [ ] Weight inputs accessible via keyboard

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix(forms): address typecheck and QA issues from evaluation builder redesign"
```
