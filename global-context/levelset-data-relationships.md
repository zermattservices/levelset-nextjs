# Levelset Data Relationships

> Context document for Levi AI. Maps entity relationships, data chains, and tool-to-table mappings.

## Multi-Tenant Hierarchy

All tenant data flows from a strict hierarchy:

```
orgs (organization)
 ├── locations (physical sites, each with location_number)
 │    ├── employees (scoped by org_id AND location_id)
 │    ├── rating_thresholds (per-location green/yellow thresholds)
 │    └── location_role_hierarchy (optional location-specific role overrides)
 ├── org_roles (role definitions with hierarchy levels)
 ├── org_positions (position definitions with criteria)
 ├── org_feature_toggles (feature flags)
 ├── org_pay_config (per-role pay rule toggles)
 ├── org_pay_rates (actual hourly rate values)
 ├── infractions_rubric (infraction types + points, org-wide or per-location)
 ├── disc_actions_rubric (escalation thresholds)
 ├── form_groups → form_templates (form definitions)
 └── documents → document_digests (org-scoped documents)
```

Every query on tenant tables MUST include `org_id`. Location-scoped data additionally filters by `location_id`.

## Employee as Central Hub

The `employees` table is the central entity connecting all operational data:

```
employees
 ├── ratings (1:many) — individual rating submissions per position
 ├── daily_position_averages (1:many) — daily computed averages per position
 ├── infractions (1:many) — infraction records with points
 ├── disc_actions (1:many) — discipline actions taken
 ├── recommended_disc_actions (1:many) — auto-generated escalation recommendations
 ├── certification_audit (1:many) — daily certification status transitions
 ├── evaluations (1:many) — formal evaluation records
 └── form_submissions (1:many) — submitted forms linked to employee
```

## Rating Data Chain

```
org_positions (per-org position definitions)
 ├── position_criteria (up to 5 rating dimensions per position)
 └── ratings (submitted ratings per employee per position)
      ├── rating_1..rating_5 (individual criteria scores, 1.0-3.0)
      ├── rating_avg (average across criteria)
      └── daily_position_averages (daily rollup per employee)
           └── position_averages JSONB ({"iPOS": 2.85, "Drive-Thru": 2.40})

rating_thresholds (per-location)
 ├── green_threshold (default 2.75)
 └── yellow_threshold (default 1.75)
```

Ratings are submitted by leaders (`rater_user_id`) for employees at specific positions. The daily averages job computes rolling averages and stores them in JSONB for efficient bulk access.

## Discipline Data Chain

```
infractions_rubric (per-org infraction types + point values)
 └── infractions (submitted infraction records)
      ├── points (from rubric)
      ├── infraction_date (for 90-day window calculation)
      ├── ack_bool (employee acknowledgement)
      ├── leader_name (documenting leader)
      └── infraction_documents (attached files/evidence)

disc_actions_rubric (per-org escalation ladder)
 └── recommended_disc_actions (auto-generated at point thresholds)
      ├── recommended_action (e.g., "Written Warning")
      ├── points_when_recommended
      ├── action_taken (boolean — has a leader acted?)
      └── action_taken_at

disc_actions (actual discipline actions taken by leaders)
 ├── action (type of action taken)
 ├── action_date
 ├── leader_name
 └── notes
```

Current points = sum of infraction points where `infraction_date >= 90 days ago`. Archived points are older infractions that no longer count toward escalation.

## Auth & Permissions Chain

```
auth.users (Supabase auth)
 └── app_users (Levelset user profiles)
      ├── auth_user_id (FK to auth.users)
      ├── org_id (FK to orgs)
      ├── role ('Levelset Admin' bypasses all permission checks)
      └── permission_profile_id (FK to permission_profiles)
           └── permission_profiles
                └── permission_profile_access (1:many)
                     └── permission_sub_items (FK)
                          └── permission_modules (FK)
```

Two-tier model: Levelset Admins bypass all checks. Regular users have granular boolean flags via their permission profile.

## Configuration Chain

```
orgs
 ├── org_feature_toggles
 │    ├── enable_certified_status
 │    ├── enable_evaluations
 │    ├── enable_pip_logic
 │    └── custom_roles
 ├── org_features (key-value feature access matrix)
 ├── org_roles (role_name, hierarchy_level, is_leader, is_trainer)
 ├── org_positions (name, zone, scheduling_enabled)
 │    └── position_criteria (name — the rating dimensions)
 ├── org_pay_config (per-role: has_availability_rules, has_zone_rules, has_certification_rules)
 │    └── org_pay_rates (hourly_rate per role+zone+availability+certification combo)
 ├── infractions_rubric (action, points — org-wide or per-location)
 ├── disc_actions_rubric (action, points_threshold)
 └── levi_config (enabled boolean for Levi AI)
```

## Form Chain

```
form_groups (organizational containers, per-org)
 └── form_templates (JSON Schema definitions)
      ├── form_type: rating | discipline | evaluation | custom
      ├── schema (JSONB — field definitions)
      ├── ui_schema (JSONB — display configuration)
      ├── settings (JSONB — behavioral settings)
      └── form_submissions (submitted data per employee)
           ├── response_data (JSONB — actual form values)
           ├── schema_snapshot (frozen schema at submission time)
           ├── score (computed result)
           └── status: submitted | approved | rejected | draft

form_connectors (global library — not org-scoped)
 ├── key: no_discipline_30d, avg_rating_gte, certified_status, etc.
 ├── return_type: boolean | number | percentage
 └── params (JSONB — connector configuration)
```

## Document Chain

```
Org-scoped:
document_folders (hierarchical folders per org)
 └── documents (uploaded files or URLs)
      ├── source_type: file | url
      ├── storage_path (Supabase storage: org_documents bucket)
      └── document_digests (extracted content for RAG)
           ├── content_md (extracted markdown text)
           ├── content_hash (SHA256 for change detection)
           ├── extraction_method: text_extract | pdf_extract | docx_extract | ocr | web_scrape
           ├── extraction_status: pending | processing | completed | failed
           └── metadata JSONB (word_count, source_title, etc.)
      └── document_versions (history when files are replaced)

Global (cross-org, Levelset Admin only):
global_document_folders → global_documents → global_document_digests → global_document_versions
 └── Same structure, no org_id scoping
 └── Categories: cfa_general, cfa_design_system, levelset_general, etc.
 └── global_documents.raw_content (TEXT — for text-type documents)
```

## Levi Tool-to-Table Map

Each of Levi's 7 data tools maps to specific tables and joins:

| Tool | Primary Table | Joins / Related | Key Filters |
|------|--------------|-----------------|-------------|
| `lookup_employee` | `employees` | — | org_id, active, name ILIKE, optional role filter |
| `list_employees` | `employees` | — | org_id, location_id, active, is_leader, is_foh, is_boh, role |
| `get_employee_ratings` | `ratings` | — | employee_id, org_id, location_id, ordered by created_at DESC |
| `get_employee_infractions` | `infractions` | — | employee_id, org_id, location_id, ordered by infraction_date DESC |
| `get_employee_profile` | `employees` | `ratings`, `infractions`, `disc_actions` (parallel) | employee_id, org_id; computes current/archived points, rating trend |
| `get_team_overview` | `employees` | `infractions` (90-day window) | org_id, location_id, zone filter; computes role/zone/cert breakdowns |
| `get_discipline_summary` | `employees` or `infractions` | `disc_actions`, `recommended_disc_actions` | Per-employee or location-wide; 90-day point calculation |
| `get_position_rankings` | `daily_position_averages` | `employees` (for names/roles) | org_id, location_id, position name; fallback to `ratings` aggregate |

All tools receive `(args, orgId, locationId?)` and use `tenantCache` for caching with TTL tiers (ORG_CONFIG: 10min, TEAM: 5min, PROFILE: 5min, DYNAMIC: 2min).

## AI & Chat Tables

```
ai_conversations
 ├── org_id, user_id, location_id
 ├── title, status (active | archived)
 └── ai_messages (1:many)
      ├── role: user | assistant | system
      ├── content (text)
      ├── ui_blocks (JSONB — visual card data for mobile)
      └── metadata (JSONB — model info, token counts)

levi_usage_log (per-org usage tracking)
 ├── org_id, user_id, conversation_id
 ├── model, input_tokens, output_tokens
 └── cost_estimate

levi_config (per-org AI enablement)
 └── enabled (boolean)
```
