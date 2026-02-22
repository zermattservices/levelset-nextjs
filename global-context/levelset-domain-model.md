# Levelset Domain Model

> Context document for Levi AI. Describes Levelset's configurable business systems.
> All systems described here are **per-organization configurable** unless stated otherwise.

## Rating System (Positional Excellence)

Every organization defines **positions** (`org_positions`) representing job functions (e.g., iPOS, Drive-Thru, Host). Each position has up to **5 rating criteria** (`position_criteria`) — sometimes called the "Big 5" — that define measurable performance dimensions.

Employees are rated on a **1.0 to 3.0 scale** per criterion. Individual ratings are stored in the `ratings` table with fields `rating_1` through `rating_5` plus `rating_avg` (the average across all criteria for that submission).

**Rolling averages** are computed daily and stored in `daily_position_averages` as a JSONB column `position_averages` mapping position names to averages (e.g., `{"iPOS": 2.85, "Drive-Thru": 2.40}`). This is the primary data source for rankings and certification logic.

**Color thresholds** are configurable per location via `rating_thresholds`:
- **Green** (meets expectations): average >= green_threshold (default 2.75)
- **Yellow** (needs improvement): average >= yellow_threshold (default 1.75)
- **Red** (below expectations): average < yellow_threshold

Positions are assigned a **zone** — FOH (Front of House), BOH (Back of House), or General. Positions can be flagged as `scheduling_enabled` for shift planning.

## Certification System (Optional)

Enabled per-org via `org_feature_toggles.enable_certified_status`. When enabled, employees progress through a certification lifecycle:

1. **Not Certified** — starting state for all employees
2. **Pending** — all position averages are above the green threshold; eligible for evaluation
3. **Certified** — passed an evaluation; may unlock higher pay rates
4. **PIP** (Performance Improvement Plan) — was Certified but fell below thresholds

Related feature toggles:
- `enable_evaluations` — enables formal evaluation forms
- `enable_pip_logic` — enables automatic PIP status when certified employees decline

The `certification_audit` table tracks daily status transitions with `status_before`, `status_after`, `all_positions_qualified`, and `position_averages` JSONB. Audit records are scoped by employee, org, and location.

Certification status affects pay when `org_pay_config.has_certification_rules = true`.

## Discipline System

Each organization defines its own **infraction rubric** (`infractions_rubric`) specifying infraction types and their point values. The rubric can be org-wide or location-specific (when `location_id` is set).

When an infraction is recorded in the `infractions` table, it includes the type, points, date, documenting leader, notes, and an acknowledgement flag (`ack_bool`). Infractions can also have supporting documents stored in `infraction_documents`.

**Points accumulate over a 90-day rolling window.** Points older than 90 days are "archived" — they still exist but don't count toward escalation thresholds.

The **discipline escalation ladder** is defined in `disc_actions_rubric` with point thresholds (e.g., 5 pts = Documented Warning, 10 pts = Written Warning, 15 pts = Suspension, 20 pts = Termination). When an employee's current points cross a threshold, a `recommended_disc_actions` record is auto-generated via database trigger.

Actual discipline actions taken by leaders are stored in `disc_actions` with the action type, date, leader name, and notes.

## Pay System

Pay configuration is per-role within each organization:

- `org_pay_config` defines which pay rules apply per role:
  - `has_availability_rules` — differentiate pay by Limited vs Available availability
  - `has_zone_rules` — differentiate pay by FOH vs BOH zone
  - `has_certification_rules` — differentiate pay by certified vs non-certified status

- `org_pay_rates` stores the actual hourly rates for each combination of (role, zone, availability, is_certified). For example, a Team Member in FOH with Available schedule and Certified status might earn $16.50/hr while the same role without certification earns $15.00/hr.

The `employees.calculated_pay` field is auto-computed by a database trigger whenever the relevant inputs change.

## Roles

Each organization defines roles in `org_roles` with:
- `role_name` — display name (e.g., Operator, Executive, Team Lead)
- `hierarchy_level` — numeric rank where **0 is the highest** (Operator/Owner level)
- `is_leader` — boolean flag indicating leadership roles
- `is_trainer` — boolean flag indicating training-eligible roles

Default role set (highest to lowest): Operator (0), Executive (1), Director (2), Team Lead (3), Trainer (4), Team Member (5), New Hire (6).

Organizations can customize names, add roles, and adjust hierarchy levels. The Operator role (level 0) is always the highest rank and there is exactly one per organization.

Location-specific role hierarchies can be defined via `location_role_hierarchy` which overrides the org-level defaults for a specific location.

## Positions

Defined in `org_positions` per organization:
- `name` — position name (e.g., iPOS, Drive-Thru, Dining Room, Kitchen)
- `zone` — FOH, BOH, or General
- `is_active` — whether the position is currently in use
- `scheduling_enabled` — whether the position participates in shift scheduling
- `display_order` — controls ordering in the UI

Each position has associated `position_criteria` records defining the rating dimensions (up to 5 per position).

## Forms System

The forms engine provides configurable data collection:

- **Form Groups** (`form_groups`) — organizational containers with slug identifiers, supporting EN/ES names
- **Form Templates** (`form_templates`) — definitions using JSON Schema (`schema` field) and UI Schema (`ui_schema` field). Types: `rating`, `discipline`, `evaluation`, `custom`
- **Form Submissions** (`form_submissions`) — submitted data with `response_data` JSONB, a `schema_snapshot` for auditability, optional `score`, and status tracking (submitted/approved/rejected/draft)
- **Form Connectors** (`form_connectors`) — a fixed library of Levelset data connectors used for conditional logic in forms. Examples: `no_discipline_30d` (boolean: no infraction points in last 30 days), `avg_rating_gte` (boolean: average rating meets threshold), `certified_status` (boolean: employee is Certified)

All form entities are org-scoped except form_connectors which are global.

## Employee Lifecycle

An employee record tracks the full employment journey:

1. **Hire** — `hire_date` set, status `active = true`
2. **Active** — rated across positions, assigned to shifts, may hold infraction points
3. **Certification** (when enabled) — progresses through Not Certified -> Pending -> Certified
4. **Discipline** — infractions accumulate points, escalation actions recommended
5. **Termination** — `termination_date` and `termination_reason` set, `active = false`

Key employee fields:
- Identity: `full_name`, `first_name`, `last_name`, `email`, `phone`, `employee_id`
- Role: `role`, `is_leader`, `is_trainer`, `hierarchy_level` (via role lookup)
- Zone: `is_foh`, `is_boh` (can be both)
- Availability: `availability` (Limited or Available)
- Performance: `certified_status`, `calculated_pay`, `last_points_total`
- Org scope: `org_id`, `location_id`

## Feature Configuration

Two tables control org-level feature access:

- **`org_feature_toggles`** — behavioral boolean toggles:
  - `enable_certified_status` — certification system
  - `enable_evaluations` — evaluation forms
  - `enable_pip_logic` — PIP auto-management
  - `custom_roles` — custom role definitions

- **`org_features`** — feature access matrix with key-value pairs for broader feature gating

- **`levi_config`** — Levi AI enablement per-org (`enabled` boolean)
