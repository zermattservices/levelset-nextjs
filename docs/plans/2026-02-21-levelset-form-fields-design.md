# Improved Levelset Form Fields

## Problem

Levelset fields in the form editor lack context. Users can't tell what data each field connects to, and the Leader field uses hardcoded role keywords instead of the org's configured role system.

## Changes

### 1. Leader Widget — Context-Aware Role Filtering

Replace client-side keyword matching with server-side org-configured role filtering.

**New API**: Extend `/api/forms/widget-data` to support `type=leaders` with params `org_id`, `location_id`, `form_type`.

| Form Type | Role Source | Filter Logic |
|-----------|-----------|------|
| `rating` | `position_role_permissions` | Roles that have permission for any position |
| `discipline` | `discipline_role_access` | Roles with `can_submit = true` |
| `evaluation` / `custom` | `org_roles` hierarchy | Levels 0-2 |

The widget calls this endpoint instead of `/api/employees` with client-side filtering.

### 2. Editor Canvas Cards — Levelset Field Descriptions

Add a description subtitle to `EditorFieldCard` for Levelset fields:

| Field Type | Description |
|-----------|-------------|
| `employee_select` | "All active team members at this location" |
| `leader_select` (rating) | "Leaders filtered by PE role mappings" |
| `leader_select` (discipline) | "Leaders filtered by discipline access roles" |
| `leader_select` (other) | "Leaders filtered by org role hierarchy" |
| `position_select` | "Positions configured for this organization" |
| `infraction_select` | "Infraction types from the discipline rubric" |
| `disc_action_select` | "Discipline actions from the discipline rubric" |

Levelset fields get a subtle visual distinction (colored left border or badge).

### 3. Config Panel — Levelset Field Info & Links

When a Levelset field is selected, show an info card with a description of the data source and a link to configure it in Org Settings:

- **Leader (PE)**: Link to `/org-settings?tab=positional-excellence&subtab=role-mapping`
- **Leader (Discipline)**: Link to `/org-settings?tab=discipline&subtab=access`
- **Position**: Link to `/org-settings?tab=positional-excellence&subtab=positions`
- **Infraction Type**: Link to `/org-settings?tab=discipline&subtab=infractions`
- **Discipline Action**: Link to `/org-settings?tab=discipline&subtab=actions`
- **Employee**: No link needed — shows all active employees

## Files Affected

- `apps/dashboard/pages/api/forms/widget-data.ts` — add `type=leaders` handler
- `apps/dashboard/components/forms/widgets/LeaderSelectWidget.tsx` — rewrite to use new API
- `apps/dashboard/components/forms/editor/EditorFieldCard.tsx` — add Levelset descriptions
- `apps/dashboard/components/forms/editor/FieldConfigPanel.tsx` — add Levelset info section
- `apps/dashboard/components/forms/editor/FormEditorPanel.tsx` — pass `formType` to child components
- `apps/dashboard/lib/forms/field-palette.ts` — add description metadata to field definitions
