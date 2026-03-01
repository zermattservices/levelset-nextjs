Form Management Module — Implementation PlanContext
Levelset needs a centralized form management system in the admin dashboard. Currently, rating and discipline forms are hardcoded in PWA components (components/mobile/forms/) with settings scattered across org_feature_toggles and infractions_rubric. There is no evaluation form system yet. This module creates a unified system where admins can view, configure, and create forms — and eventually build custom evaluation forms with scored sections and Levelset-connected auto-fill questions.
Library choice: RJSF (@rjsf/mui v6.3.1) — confirmed @mui/material: "^7.0.0" peer dependency, native MUI v7 support. Custom constrained editor built with @dnd-kit (already installed). Form schemas stored as JSONB in Supabase.
PWA forms are PRODUCTION — never touched. New forms are for the Expo mobile app and dashboard only.

Sprint 1: Foundation — Schema, Permissions, Navigation, Page Shell
Database Migration
supabase/migrations/20260220_create_form_management_tables.sql
Tables:

form_groups — Organizational containers (PE, Discipline, Evaluations, custom). Columns: id, org_id, name, name_es, description, description_es, slug (unique per org), is_system (true for predefined), icon, display_order, created_at, updated_at
form_templates — Form definitions. Columns: id, org_id, group_id (FK→form_groups), name, name_es, description, description_es, form_type (rating|discipline|evaluation|custom), schema (JSONB — JSON Schema), ui_schema (JSONB — RJSF ui schema), settings (JSONB — type-specific config), is_active, is_system, created_by, version, created_at, updated_at
form_submissions — Submitted forms. Columns: id, org_id, location_id, template_id, form_type, submitted_by, employee_id, response_data (JSONB), schema_snapshot (JSONB), score (numeric for evaluations), status (submitted|approved|rejected|draft), metadata (JSONB — linked rating_id, infraction_id, section scores), created_at, updated_at
form_connectors — Fixed library of Levelset data connectors. Columns: id, key (unique), name, name_es, description, description_es, category, return_type (boolean|number|percentage), params (JSONB), is_active

All tenant tables get RLS policies scoped by org_id via app_users.auth_user_id. form_connectors is globally readable. System form_groups/form_templates cannot be deleted via RLS (is_system = false check on DELETE).
supabase/migrations/20260220_seed_form_connectors.sql
Seeds 6 initial connectors: no_discipline_30d, no_discipline_60d, no_discipline_90d, avg_rating_gte, certified_status, no_unresolved_actions
Permission Module
Modify: apps/dashboard/lib/permissions/constants.ts
Add FORM_MANAGEMENT: 'form_management' to PERMISSION_MODULES, then add 6 keys to P:

FM_VIEW_FORMS, FM_CREATE_FORMS, FM_EDIT_FORMS, FM_DELETE_FORMS, FM_VIEW_SUBMISSIONS, FM_MANAGE_SUBMISSIONS

Add corresponding MODULE_METADATA and SUB_ITEM_METADATA entries.
Run npx tsx scripts/seed-permission-modules.ts to sync to DB.
Navigation
Modify: apps/dashboard/components/ui/NavSubmenu/NavSubmenu.tsx (lines 77-81)
Change the existing "Form Management" entry: remove disabled: true, add href: '/form-management'.
Page Shell
FilePurposepages/form-management.tsxThin wrapper (AppProviders → FormManagementPage)components/pages/FormManagementPage.tsxMain page componentcomponents/pages/FormManagementPage.module.cssStyles
Page behavior:

Uses useAuth() — redirects to login if unauthenticated
Levelset Admin check: if role !== 'Levelset Admin', show Coming Soon card (follow existing pattern from org-settings disabled features)
For admins: page title "Form Management", two MUI Tabs — "Forms" and "Submissions"
Empty states with placeholder content for both tabs

API Route Shells
FileMethodspages/api/forms/index.tsGET (list templates), POST (create template / create group)pages/api/forms/[id].tsGET / PATCH / DELETE for single templatepages/api/forms/groups.tsGET (list groups with template counts)
All use createServerSupabaseClient(), validate org_id from session.
Seeding Script
scripts/seed-form-groups.ts — Creates 3 system groups per org: "Positional Excellence" (positional_excellence), "Discipline" (discipline), "Evaluations" (evaluations) with is_system: true.
Type Definitions
apps/dashboard/lib/forms/types.ts — FormGroup, FormTemplate, FormSubmission, FormConnector interfaces
i18n
Add formManagement key block to both locales/en/common.json and locales/es/common.json (page title, tab labels, coming soon text, empty states)
Verification

pnpm typecheck passes
pnpm --filter dashboard build succeeds
Migration applies to Supabase project (pcplqsnilhrhupntibuv)
Navigation link shows in Operations dropdown
/form-management loads — non-admin sees Coming Soon, Levelset Admin sees shell with tabs
Seeding scripts run without errors


Sprint 2: Form Management Dashboard — List, Groups, Create/Edit
Components
FilePurposecomponents/forms/FormManagementToolbar.tsx + .module.cssSearch, type filter chips, "Create Form" / "Create Group" buttonscomponents/forms/FormGroupsList.tsx + .module.cssAccordion list of groups, each containing form cardscomponents/forms/FormTemplateCard.tsx + .module.cssCard per form: name, type badge, status, submission count, last updated. Click → detail page. Menu: edit, duplicate, archivecomponents/forms/CreateFormDialog.tsxMUI Dialog: name, description, group select, type select. Pre-applies default schema per typecomponents/forms/CreateGroupDialog.tsxMUI Dialog: name, description. Creates custom groupcomponents/forms/FormSettingsPanel.tsxSettings tab content: name (EN/ES), description (EN/ES), group, type (read-only for system), active toggle, archive/delete
Form Detail Page
FilePurposepages/form-management/[formId].tsxThin wrappercomponents/pages/FormDetailPage.tsx + .module.css4 tabs: Settings, Editor, Preview, Submissions. Sprint 2: only Settings is functional. Breadcrumb back to list
API Updates

pages/api/forms/index.ts — Full implementation: GET joins templates with groups, POST create_template applies default schemas per type, POST create_group validates unique slug
pages/api/forms/[id].ts — Full CRUD: PATCH updates metadata/settings, DELETE soft-archives (is_active=false, blocks for system forms)
pages/api/forms/groups.ts — GET returns groups with template_count, POST creates group, PATCH updates, DELETE only if custom + empty

Data Fetching Pattern
FormManagementPage fetches groups and templates via useEffect + useState (no React Query). Passes data down as props. Refetch function passed to dialogs for post-create refresh.
i18n
Add form type labels, dialog strings, settings panel labels to both locale files.
Verification

Groups list renders with 3 system groups (even if empty)
Create Form dialog → form appears in correct group
Create Group → new group appears in list
Click form card → navigates to /form-management/[formId]
Settings tab edits save via PATCH
System forms cannot be deleted, custom forms can be archived
Search and type filter work on toolbar


Sprint 3: Constrained Form Editor (Drag-and-Drop)
Package Install
bashpnpm --filter dashboard add @rjsf/core @rjsf/mui @rjsf/utils @rjsf/validator-ajv8
Library Utils
FilePurposelib/forms/field-palette.tsField type definitions: text, textarea, number, select, radio, checkbox, date, rating_1_3, rating_1_5, true_false, percentage, signature, employee_select, leader_select, position_select, section, file_upload. Each has type, label, icon, schema template, optional uiWidgetlib/forms/schema-builder.tsFormField interface (id, type, label, label_es, required, options, settings, section). fieldsToJsonSchema() and jsonSchemaToFields() converters between internal representation and JSON Schema + UI Schema
Editor Components
FilePurposecomponents/forms/editor/FormEditorPanel.tsx + .module.css3-column layout: left palette, center canvas, right config. Uses @dnd-kit/core DndContext + DragOverlay (pattern from SetupBoardView.tsx). Auto-save with 1s debounce, status indicatorcomponents/forms/editor/FieldPalette.tsx + .module.cssDraggable field type chips grouped by category (Basic, Selection, Advanced, Levelset). useDraggable from @dnd-kitcomponents/forms/editor/EditorCanvas.tsx + .module.cssDrop zone with SortableContext. Renders EditorFieldCard list. Drop indicator for new fieldscomponents/forms/editor/EditorFieldCard.tsx + .module.cssSingle field on canvas: icon, label, required badge, drag handle, delete button. Click → selects for config panelcomponents/forms/editor/FieldConfigPanel.tsx + .module.cssRight sidebar: label (EN/ES), description (EN/ES), required toggle. Per-type options: select/radio get options list editor, number gets min/max, etc.
FormDetailPage Update
Wire "Editor" tab to render FormEditorPanel. PATCH /api/forms/[id] with updated schema + ui_schema on save.
Verification

Field palette shows all field types in grouped categories
Drag field from palette → drops onto canvas
Canvas fields are sortable via drag
Clicking a field opens config panel with correct options
Config changes reflect immediately on canvas
Required toggle, options editor, label changes all work
Save persists schema to DB, reload restores state
Auto-save indicator shows Saved/Saving/Unsaved correctly
pnpm typecheck and build pass


Sprint 4: Form Rendering, Submission, Submissions Dashboard
RJSF Theme & Widgets
FilePurposelib/forms/rjsf-theme.tsCustom theme wrapping @rjsf/mui with Levelset styles (Satoshi font, design token colors, 8px radius)components/forms/widgets/SignatureWidget.tsxWraps existing SignatureCanvas (components/mobile/SignatureCanvas.tsx)components/forms/widgets/EmployeeSelectWidget.tsxAutocomplete employee selector (pattern from PositionalRatingsForm.tsx)components/forms/widgets/LeaderSelectWidget.tsxAutocomplete leader selectorcomponents/forms/widgets/PositionSelectWidget.tsxPosition selector with FOH/BOH groupingcomponents/forms/widgets/FileUploadWidget.tsxFile attachment (pattern from DisciplineInfractionForm.tsx)components/forms/widgets/RatingScaleWidget.tsx1-3 and 1-5 radio scales with color-coded labelscomponents/forms/widgets/index.tsWidget registry export
Form Renderer & Preview
FilePurposecomponents/forms/FormRenderer.tsxWraps RJSF Form with custom theme, widgets, @rjsf/validator-ajv8. Props: template, onSubmit, readOnly, initialDatacomponents/forms/FormPreviewPanel.tsxRenders FormRenderer in preview mode for "Preview" tab
Submissions
FilePurposecomponents/forms/FormSubmissionsTable.tsx + .module.cssDataGrid Pro table: submitted_by, employee, form name, type, status, score, date. Filters: type, status, date range. Row click → detail dialogcomponents/forms/SubmissionDetailDialog.tsxMUI Dialog: read-only FormRenderer with schema_snapshot + response_data. Shows metadata. Approve/Reject buttons for admins
API Routes
FilePurposepages/api/forms/submissions.tsGET (list with filters/pagination), POST (create submission — validates schema, stores snapshot, dual-writes to ratings/infractions tables for those form types)pages/api/forms/submissions/[id].tsGET (single), PATCH (approve/reject status)
Dual-Write Logic (Critical)
When a Rating or Discipline form is submitted via this system, the POST handler:

Inserts into form_submissions (with schema_snapshot)
Extracts mapped fields from response_data
Inserts into existing ratings or infractions table (same logic as /api/mobile/[token]/ratings and /api/mobile/[token]/infractions)
Stores the linked rating_id or infraction_id in form_submissions.metadata

This ensures existing PE and Discipline dashboards continue working.
FormDetailPage + FormManagementPage Updates

Wire "Preview" tab → FormPreviewPanel
Wire "Submissions" tab (detail page) → FormSubmissionsTable filtered by template_id
Wire "Submissions" tab (main page) → FormSubmissionsTable for all org submissions

i18n
Add submission-related strings to both locale files (status labels, column headers, empty state, approve/reject).
Verification

Form preview renders correctly from stored schema
All custom widgets render: signature, employee/leader/position selects, file upload, rating scales
Validation works (required fields, value ranges)
Submitting a form creates form_submissions record
Rating form submission also creates a ratings record (verify in PE dashboard)
Discipline form submission also creates an infractions record (verify in Discipline page)
Submissions table loads, filters, paginates correctly
Submission detail dialog shows read-only form with submitted data
Approve/Reject updates status


Sprint 5: Evaluation-Specific Features
Scoring Engine
lib/forms/scoring.ts
Types: ScoredQuestion, SectionScore, EvaluationScore
Scoring rules:

1-3 scale: (answer / 3) × weight
1-5 scale: (answer / 5) × weight
T/F: True = 100% of weight, False = 0%
Percentage: (answer / 100) × weight
Section score: sum(earned) / sum(weights) for questions in section → percentage
Overall: sum(all earned) / sum(all weights) → percentage

Connected Questions Resolver
lib/forms/connectors-resolver.ts
Server-side resolveConnectedQuestions(supabase, employeeId, orgId, locationId, connectors[]) → Record<string, any>. Each connector key maps to a specific query:

no_discipline_30d/60d/90d → query infractions for points in timeframe
avg_rating_gte → query ratings/daily_position_averages for average
certified_status → query employees.certified_status
no_unresolved_actions → query recommended_disc_actions for unresolved

Evaluation Editor Components
FilePurposecomponents/forms/evaluation/EvaluationEditorExtension.tsx + .module.cssExtension panel in editor when form_type === 'evaluation'. Adds section management, role level selectorcomponents/forms/evaluation/SectionManager.tsxSortable section list. Predefined defaults: "Leadership Culture" (levels 1-3 only), "Execution of Core Strategy", "What's Important Now", "Business Results". Custom sections allowed. Min 1, max 10components/forms/evaluation/QuestionWeightEditor.tsxInline numeric input per question for point weight. Running total displaycomponents/forms/evaluation/ConnectedQuestionPicker.tsx + .module.cssToggle "Levelset Connected" on question → shows connector picker from form_connectors table with parameter configcomponents/forms/evaluation/EvaluationScoreDisplay.tsx + .module.cssCircular progress for overall %, section breakdown bars, per-question details. Used in SubmissionDetailDialog for evaluation submissions
Schema Convention for Evaluations
Stored in form_templates.settings.evaluation:
json{
  "role_level": 2,
  "sections": [
    { "id": "uuid", "name": "Leadership Culture", "name_es": "...", "order": 1, "is_predefined": true, "max_role_level": 3 }
  ],
  "questions": {
    "field_uuid": {
      "section_id": "uuid",
      "weight": 10,
      "scoring_type": "1-3",
      "connected_to": "no_discipline_30d",
      "connector_params": { "days": 30 }
    }
  }
}
API Updates

pages/api/forms/connectors.ts — GET list connectors, POST resolve intent to resolve values for an employee
pages/api/forms/submissions.ts — For evaluation submissions: resolve connected questions, calculate scores via calculateEvaluationScore(), store score and section scores in metadata

FormEditorPanel Update
When form_type === 'evaluation', render EvaluationEditorExtension. FieldConfigPanel gains scoring_type selector, weight input, and connected question toggle for evaluation questions.
i18n
Add evaluation section names, scoring labels, connector names to both locale files.
Verification

Evaluation editor shows section management with 4 predefined sections
Custom sections can be added (up to max 10 total)
Sections are sortable
Question weight editor works, running total updates
Connected question toggle shows connector picker
Score calculation correct for all types (1-3, 1-5, T/F, %)
Section scores aggregate correctly
Overall score aggregates correctly
Connected questions resolve during submission (verify with real employee data)
form_submissions.score stores the overall percentage
Score display renders in submission detail dialog
Role level assignment persists correctly


Key Files Reference
PurposeFile PathPermission constants (modify)apps/dashboard/lib/permissions/constants.tsNavigation menu (modify)apps/dashboard/components/ui/NavSubmenu/NavSubmenu.tsxRating form referenceapps/dashboard/components/mobile/forms/PositionalRatingsForm.tsxDiscipline form referenceapps/dashboard/components/mobile/forms/DisciplineInfractionForm.tsxSignature canvas (reuse)apps/dashboard/components/mobile/SignatureCanvas.tsxDnD pattern referenceapps/dashboard/components/scheduling/setup/SetupBoardView.tsxPermission middleware (reuse)apps/dashboard/lib/permissions/middleware.tsSupabase server client (reuse)apps/dashboard/lib/supabase-server.tsSupabase component client (reuse)apps/dashboard/util/supabase/component.tsPage pattern referenceapps/dashboard/pages/discipline.tsx + components/pages/DisciplinePage.tsxDataGrid pattern referenceapps/dashboard/components/CodeComponents/DisciplineTable.tsxModal pattern referenceapps/dashboard/components/CodeComponents/AddInfractionModal.tsxDesign tokens CSSpackages/design-tokens/src/css/variables.css