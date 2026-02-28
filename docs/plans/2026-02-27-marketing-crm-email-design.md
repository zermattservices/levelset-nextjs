# Marketing CRM & Email System — Full Design

## Context

Levelset needs a marketing CRM built into the admin mode dashboard to track leads from first page view through conversion. Currently, waitlist/contact form submissions go into a basic `waitlist` table with no pipeline tracking, engagement scoring, or email automation. The marketing site has Facebook Pixel tracking but no server-side page view attribution tied to individual leads.

**Goal**: A complete in-house CRM in admin mode with lead pipeline management, page view attribution, engagement scoring, value tracking, and automated email sequences — all built on the existing Supabase + Resend + admin mode infrastructure.

---

## Database Schema

### New Tables

**`leads`** — replaces `waitlist` as the primary lead record

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| email | TEXT NOT NULL UNIQUE | |
| first_name | TEXT | Lead's first name (the person who submitted) |
| last_name | TEXT | Lead's last name |
| operator_name | TEXT | Restaurant operator name (may differ from lead person, can be looked up by store_number) |
| store_number | TEXT | Used for deduplication + restaurant grouping |
| is_multi_unit | BOOLEAN DEFAULT false | |
| message | TEXT | |
| source | TEXT DEFAULT 'waitlist' | waitlist, contact, manual |
| metadata | JSONB DEFAULT '{}' | UTM params, user agent, etc. |
| pipeline_stage | TEXT DEFAULT 'new' | new, contacted, trial, onboarded, converted, lost |
| stage_changed_at | TIMESTAMPTZ | |
| engagement_score | INTEGER DEFAULT 0 | Computed, updated on events |
| estimated_value_cents | INTEGER DEFAULT 0 | $2,739/store × 100 |
| visitor_id | TEXT | Links to anonymous page views |
| org_id | UUID NULLABLE FK→orgs | Set when lead creates org/trial |
| admin_notes | TEXT | |
| contacted_at | TIMESTAMPTZ | |
| trial_started_at | TIMESTAMPTZ | |
| onboarded_at | TIMESTAMPTZ | |
| converted_at | TIMESTAMPTZ | |
| lost_at | TIMESTAMPTZ | |
| lost_reason | TEXT | |
| created_at | TIMESTAMPTZ DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ DEFAULT NOW() | |

Indexes: email, store_number, pipeline_stage, visitor_id, created_at DESC

**`lead_events`** — unified timeline for every lead interaction

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| lead_id | UUID FK→leads | |
| event_type | TEXT | page_view, form_submit, email_sent, email_opened, email_clicked, email_bounced, stage_change, note_added |
| event_data | JSONB | Type-specific payload (url, template_slug, old_stage→new_stage, etc.) |
| created_at | TIMESTAMPTZ DEFAULT NOW() | |

Index: lead_id + created_at DESC

**`page_views`** — anonymous visitor tracking, linked to leads on form submission

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| visitor_id | TEXT NOT NULL | Cookie-generated ID |
| lead_id | UUID NULLABLE FK→leads | Linked retroactively |
| url | TEXT NOT NULL | |
| referrer | TEXT | |
| utm_source | TEXT | |
| utm_medium | TEXT | |
| utm_campaign | TEXT | |
| created_at | TIMESTAMPTZ DEFAULT NOW() | |

Indexes: visitor_id, lead_id, created_at DESC

**`email_templates`** — metadata registry for React Email templates

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| slug | TEXT UNIQUE NOT NULL | Maps to React Email component filename |
| name | TEXT NOT NULL | Human-readable name |
| subject | TEXT NOT NULL | Email subject line |
| description | TEXT | What this template is for |
| category | TEXT | drip, transactional |
| preview_text | TEXT | Email preview/preheader text |
| active | BOOLEAN DEFAULT true | |
| created_at | TIMESTAMPTZ DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ DEFAULT NOW() | |

**`email_sequences`** — automated drip campaigns

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | TEXT NOT NULL | |
| trigger_event | TEXT NOT NULL | form_submitted, trial_started, onboarded |
| active | BOOLEAN DEFAULT true | |
| created_at | TIMESTAMPTZ DEFAULT NOW() | |

**`email_sequence_steps`** — ordered steps within a sequence

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| sequence_id | UUID FK→email_sequences | |
| template_slug | TEXT FK→email_templates(slug) | |
| delay_hours | INTEGER NOT NULL | Hours after trigger (or previous step) |
| step_order | INTEGER NOT NULL | |
| active | BOOLEAN DEFAULT true | |

**`email_sends`** — every email sent, with delivery tracking

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| lead_id | UUID FK→leads | |
| template_slug | TEXT | |
| sequence_id | UUID NULLABLE FK→email_sequences | NULL if manual/transactional |
| resend_message_id | TEXT | For webhook matching |
| status | TEXT DEFAULT 'sent' | sent, delivered, opened, clicked, bounced |
| sent_at | TIMESTAMPTZ DEFAULT NOW() | |
| delivered_at | TIMESTAMPTZ | |
| opened_at | TIMESTAMPTZ | |
| clicked_at | TIMESTAMPTZ | |
| bounced_at | TIMESTAMPTZ | |

Index: lead_id, resend_message_id

### Data Migration

Migrate existing `waitlist` rows into `leads` table. Keep `waitlist` table as-is (no breaking changes). Update the marketing site API route to insert into `leads` instead.

---

## Marketing Site Changes

### Visitor Tracking

Add a lightweight tracking script to the marketing site layout:

1. On first visit, generate a `visitor_id` (UUID), store in a cookie (1 year expiry)
2. On each page navigation, POST to `/api/tracking/pageview` with:
   - `visitor_id`, `url`, `referrer`, `utm_source`, `utm_medium`, `utm_campaign`
3. On form submission (waitlist/contact), include `visitor_id` in the payload
4. Backend links all existing `page_views` for that `visitor_id` to the new lead

### New API Routes (Marketing)

**`POST /api/tracking/pageview`** — Record anonymous page view
- Receives visitor_id, url, referrer, UTMs
- Inserts into `page_views` table
- No auth required (public endpoint, rate-limited)

**Updated `POST /api/waitlist`** — Now also creates lead
- Insert into `leads` table (not just `waitlist`)
- Set `visitor_id` from request
- Link existing `page_views` with matching `visitor_id` to the new lead_id
- Create `form_submit` event in `lead_events`
- Trigger any email sequences with `form_submitted` trigger
- Continue sending notification to team@levelset.io

---

## Dashboard Admin Mode — New Pages

### Admin Sidebar Addition

New group **"Marketing"** in `AdminModeSidebar.tsx` menu:
- **Leads** — main CRM table
- **Pipeline** — analytics dashboard
- **Email Templates** — template list + preview
- **Email Sequences** — drip campaign management

### Leads Page

DataGrid Pro table with columns:
- Name (first_name + last_name), Email, Store #, Operator, Stage (chip/badge), Engagement Score, Est. Value, Source, Created

Features:
- Filter by pipeline_stage, source, date range
- Search by email/name/store#
- Bulk stage update
- Click row → opens Lead Detail panel

### Lead Detail Panel

Side panel (drawer) showing:
- **Header**: Name, email, stage selector dropdown, engagement score badge, value
- **Info Section**: Store #, multi-unit, source, created date, org link (if exists)
- **Timeline**: Chronological list of all `lead_events` — page views, emails, stage changes, notes. Each event type has its own icon and formatted display.
- **Related Leads**: Other leads with the same `store_number`
- **Admin Notes**: Text area for notes (creates `note_added` event on save)
- **Actions**: Change stage, add note

### Pipeline Analytics Page

- **Funnel chart**: Count of leads at each stage (New → Contacted → Trial → Onboarded → Converted)
- **Conversion rates**: % moving between each stage
- **Pipeline value**: Sum of `estimated_value_cents` by stage
- **Total pipeline value**: Sum across all non-Lost stages
- **Trends**: Leads created per week, conversions per week
- **Lost reasons**: Breakdown of `lost_reason` values

### Email Templates Page

- Table of all templates from `email_templates` table
- Each row: name, subject, category, active status
- Click → preview panel showing rendered React Email template in an iframe
- Edit metadata (name, subject, preview_text) — template code changes require code deploys for now

### Email Sequences Page

- List of sequences with trigger event, step count, active toggle
- Click → detail view showing ordered steps
- Each step: template name, delay (hours), active toggle
- Create/edit sequence: name, trigger event, add/reorder steps

---

## Email System

### React Email Setup

- Install `react-email` and `@react-email/components` in dashboard
- Create templates in `apps/dashboard/lib/emails/templates/` as React components
- Each template exports a React component that accepts props (lead name, etc.)
- `react-email` dev server for local preview during development

### Initial Templates

1. **waitlist-welcome** — Sent immediately on form submission. "Thanks for joining, here's what to expect"
2. **waitlist-followup** — 3 days later. Value prop reinforcement
3. **trial-nudge** — 7 days after signup if no trial started. "Ready to try Levelset?"

### Resend Webhook

New API route: `POST /api/webhooks/resend`
- Receives delivery/open/click/bounce events from Resend
- Matches by `resend_message_id` to update `email_sends` status
- Creates corresponding `lead_events` entries
- Updates lead `engagement_score`

### Sequence Processing

Cron job (Vercel cron, daily or hourly):
- Query `email_sequences` for active sequences
- For each sequence, find leads that match the trigger but haven't received the next step
- Check if enough time has elapsed since trigger/previous step
- Send email via Resend, create `email_sends` record

---

## Engagement Scoring

Point-based, recalculated on each new event:

| Event | Points |
|-------|--------|
| Form submission | 10 |
| Unique page view | 1 (cap 20 total) |
| Email opened | 3 |
| Email link clicked | 5 |
| Return site visit (new session) | 2 |

**Multiplier**: If multiple leads share the same `store_number`, apply 1.5x multiplier to all of them (signals organizational interest).

**Decay**: Score halves for events older than 30 days (applied on recalculation).

Stored as integer on `leads.engagement_score`, updated via a function called on new events.

---

## Value Calculation

- **Per-store annual value**: $249/month × 11 months (minus free trial month) = **$2,739**
- **Lead value**: $2,739 × number of stores (1 for single-unit, `store_number` count for multi-unit)
- **Deduplication**: If two leads share the same `store_number`, only one contributes that store's value to the pipeline total. The lead with the most advanced pipeline stage "owns" the store value.
- **Pipeline total**: Sum of unique store values across non-Lost leads

---

## Key Files to Create/Modify

### New Files
- `supabase/migrations/YYYYMMDD_create_crm_tables.sql` — All new tables
- `apps/marketing/src/lib/tracking.ts` — Visitor ID generation + page view tracking
- `apps/marketing/src/app/api/tracking/pageview/route.ts` — Page view API
- `apps/dashboard/components/AdminMode/LeadsPage.tsx` — Main CRM table
- `apps/dashboard/components/AdminMode/LeadDetailPanel.tsx` — Lead detail drawer
- `apps/dashboard/components/AdminMode/PipelinePage.tsx` — Pipeline analytics
- `apps/dashboard/components/AdminMode/EmailTemplatesPage.tsx` — Template management
- `apps/dashboard/components/AdminMode/EmailSequencesPage.tsx` — Sequence management
- `apps/dashboard/pages/api/leads/index.ts` — CRUD for leads
- `apps/dashboard/pages/api/leads/[id]/events.ts` — Lead events timeline
- `apps/dashboard/pages/api/leads/[id]/stage.ts` — Stage updates
- `apps/dashboard/pages/api/leads/analytics.ts` — Pipeline analytics data
- `apps/dashboard/pages/api/webhooks/resend.ts` — Resend delivery webhooks
- `apps/dashboard/pages/api/email-sequences/index.ts` — Sequence CRUD
- `apps/dashboard/pages/api/email-sequences/process.ts` — Cron endpoint for sequence processing
- `apps/dashboard/lib/emails/templates/` — React Email template components
- `apps/dashboard/lib/crm/engagement.ts` — Engagement score calculation
- `apps/dashboard/lib/crm/value.ts` — Pipeline value calculation

### Modified Files
- `apps/marketing/src/app/api/waitlist/route.ts` — Also insert into leads, include visitor_id
- `apps/marketing/src/app/layout.tsx` — Add tracking script
- `apps/dashboard/components/AdminMode/AdminModeSidebar.tsx` — Add Marketing group
- `apps/dashboard/components/pages/AdminModePage.tsx` — Add new page components
- `apps/dashboard/vercel.json` — Add cron for email sequence processing

---

## Implementation Phases

### Phase 1: Database + Data Foundation
1. Create all CRM tables (single migration)
2. Migrate existing waitlist data into leads table
3. Update marketing site waitlist API to also create leads

### Phase 2: Visitor Tracking
4. Add visitor ID cookie generation to marketing site
5. Create page view tracking API endpoint
6. Add tracking calls to marketing site pages
7. Link page views to leads on form submission

### Phase 3: Admin CRM UI
8. Add "Marketing" group to admin sidebar
9. Build Leads page (DataGrid Pro table with filters)
10. Build Lead Detail panel (drawer with timeline)
11. Build lead API routes (CRUD, events, stage changes)
12. Implement engagement scoring
13. Implement value calculation with deduplication

### Phase 4: Pipeline Analytics
14. Build Pipeline page with funnel chart, conversion rates, value totals
15. Build analytics API endpoint

### Phase 5: Email System
16. Set up React Email in the project
17. Create initial email templates (waitlist-welcome, followup, trial-nudge)
18. Build Email Templates page in admin (list + preview)
19. Set up Resend webhook for delivery tracking
20. Build email_sends tracking

### Phase 6: Email Sequences
21. Build Email Sequences page in admin (CRUD)
22. Build sequence processing cron job
23. Wire up sequence triggers (form_submitted, trial_started)

---

## Verification

- Create a test lead via the marketing site waitlist form → verify it appears in admin Leads table
- Change lead stage → verify timeline event appears
- Visit multiple marketing pages → submit form → verify page views are linked to lead
- Check pipeline analytics → verify value calculations ($2,739/store, deduplicated)
- Send test email → verify Resend webhook updates delivery status
- Enable a drip sequence → verify emails are sent on schedule
- Verify engagement score updates on each event type
