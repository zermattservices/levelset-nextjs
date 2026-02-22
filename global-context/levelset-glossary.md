# Levelset Glossary

> Context document for Levi AI. Terminology reference organized by domain.

## Ratings & Positional Excellence

| Term | Definition |
|------|-----------|
| **Positional Excellence (PE)** | The rating system. Employees are rated on position-specific criteria. Sometimes called "ratings." |
| **Position** | A job function (e.g., iPOS, Drive-Thru, Dining Room, Kitchen). Defined per-org in `org_positions`. |
| **Big 5** | The up to 5 rating criteria per position (stored in `position_criteria`). Each scored 1.0-3.0. |
| **Rating Average** | The mean of all criteria scores for a single rating submission (`rating_avg`). |
| **Rolling Average** | The cumulative average across all rating submissions for an employee at a specific position, computed daily. |
| **Daily Position Average** | Pre-computed rolling averages stored in `daily_position_averages` JSONB. Updated daily. |
| **Green** | Rating average >= green_threshold (default 2.75). Meets expectations. |
| **Yellow** | Rating average >= yellow_threshold but < green (default 1.75-2.74). Needs improvement. |
| **Red** | Rating average < yellow_threshold. Below expectations. |
| **Zone** | Position classification: FOH (Front of House), BOH (Back of House), or General. |

## Certification

| Term | Definition |
|------|-----------|
| **Not Certified** | Default starting status for all employees. |
| **Pending** | All position averages are at or above the green threshold. Eligible for evaluation. |
| **Certified** | Passed a formal evaluation. May unlock higher pay rates. |
| **PIP** | Performance Improvement Plan. Status assigned when a Certified employee's averages fall below green. |
| **Audit Day** | The day when the certification cron evaluates all employees' position averages and transitions statuses. |
| **Evaluation** | A formal assessment form submitted when an employee reaches Pending status. Passing leads to Certified. |

## Discipline

| Term | Definition |
|------|-----------|
| **Infraction** | A documented behavioral or performance incident. Carries a point value from the org's rubric. |
| **Points** | Numeric weight assigned to each infraction type. Accumulate over a 90-day rolling window. |
| **Current Points** | Sum of infraction points within the last 90 days. Used for escalation threshold comparison. |
| **Archived Points** | Infraction points older than 90 days. Still on record but don't trigger escalation. |
| **90-Day Rolling Window** | The active period for discipline point accumulation. Points outside this window are archived. |
| **Infraction Rubric** | Per-org configuration defining infraction types and their point values (`infractions_rubric`). |
| **Escalation Ladder** | The sequence of discipline actions triggered at point thresholds (e.g., 5pts=Warning, 10pts=Written). Defined in `disc_actions_rubric`. |
| **Recommended Action** | An auto-generated discipline recommendation when points cross a threshold (`recommended_disc_actions`). |
| **Discipline Action** | An actual disciplinary step taken by a leader (`disc_actions`). |
| **Acknowledgement** | Employee sign-off on an infraction (`ack_bool`). |

## Pay

| Term | Definition |
|------|-----------|
| **Calculated Pay** | Auto-computed hourly rate on `employees.calculated_pay`, derived from role + zone + availability + certification status. |
| **Availability** | Employee schedule classification: Limited (restricted hours) or Available (full availability). Affects pay when enabled. |
| **Zone Pay** | Pay differentiation by FOH vs BOH. Enabled per-role via `org_pay_config.has_zone_rules`. |
| **Certification Pay** | Pay premium for Certified employees. Enabled per-role via `org_pay_config.has_certification_rules`. |
| **Pay Config** | Per-role toggles (`org_pay_config`) controlling which pay rules apply. |
| **Pay Rates** | Actual hourly rates (`org_pay_rates`) for each combination of role, zone, availability, and certification. |

## Roles & Hierarchy

| Term | Definition |
|------|-----------|
| **Operator** | The highest-ranking role (hierarchy_level 0). One per organization. The franchise owner. |
| **Hierarchy Level** | Numeric rank where 0 = highest (Operator). Higher numbers = lower rank. |
| **Leader** | A role with `is_leader = true`. Leaders can submit ratings, document infractions, and take discipline actions. |
| **Trainer** | A role with `is_trainer = true`. Trainers can conduct training activities. |
| **Role Hierarchy** | The ordered sequence of roles from Operator (0) down to New Hire (highest number). |

## Platform

| Term | Definition |
|------|-----------|
| **Form Template** | A JSON Schema-based form definition (`form_templates`). Types: rating, discipline, evaluation, custom. |
| **Form Connector** | A Levelset data connector for conditional form logic (e.g., `no_discipline_30d`, `avg_rating_gte`). |
| **Form Submission** | A completed form response (`form_submissions`) with data, score, and status. |
| **Widget** | A dashboard UI component that displays aggregated data (e.g., rating trends, discipline overview). |
| **Setup Template** | A scheduling configuration defining required positions and headcounts per time block. |
| **Mobile Token** | A static per-location token (`location_mobile_token`) used to authenticate PWA kiosk submissions. |
| **Document Digest** | Extracted markdown content from an uploaded document (`document_digests`), used for RAG/indexing. |

## Organization Structure

| Term | Definition |
|------|-----------|
| **Organization (Org)** | A franchise or business entity. All data is scoped by `org_id`. |
| **Location** | A physical restaurant site within an org. Identified by `location_number`. |
| **Multi-Unit** | An organization with multiple locations. |
| **Location Number** | A short identifier for a location (e.g., "20001", "FSU-01"). |

## Feature Flags

| Term | Definition |
|------|-----------|
| **Feature Toggles** | Boolean flags in `org_feature_toggles` that enable/disable behavioral features per-org. |
| **Feature Access** | Key-value entries in `org_features` that gate broader feature access. |
| **Levi Config** | Per-org AI enablement via `levi_config.enabled`. |

## AI & Chat

| Term | Definition |
|------|-----------|
| **Levi** | The AI assistant powered by Levelset. Helps leaders manage their teams via natural language. |
| **Tool Call** | A structured function call made by Levi to query org data (e.g., `lookup_employee`, `get_team_overview`). |
| **UI Block** | A visual card rendered in the mobile chat interface showing structured data (employee cards, infraction lists). |
| **Conversation** | An AI chat session (`ai_conversations`) scoped to org + user + location. |
