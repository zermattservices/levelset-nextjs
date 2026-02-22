# Levelset Platform Architecture

> Context document for Levi AI. Describes the platform components and how they interconnect.

## Platform Overview

Levelset is a multi-platform workforce management system for restaurant organizations. It consists of 4 client applications, a shared database, and an AI agent — all connected through Supabase (Postgres + Auth + Storage).

## Dashboard (Web Application)

- **Stack:** Next.js 14 (Pages Router), MUI v7, TypeScript
- **URL:** app.levelset.io
- **Auth:** Supabase session-based auth via `@supabase/ssr`
- **Data fetching:** Client-side only (no SSR/SSG) — all queries happen in React components

The dashboard is the primary management interface used by managers, directors, and operators. It provides:
- Employee roster management (hire, edit, terminate, transfer)
- Rating submission and history viewing
- Discipline tracking (infractions, points, escalation, recommended actions)
- Certification status monitoring and audit history
- Pay configuration (role-based rules with zone/availability/certification modifiers)
- Scheduling (shifts, setup templates, break rules)
- Document management (upload, extract content, organize in folders)
- Permission management (profiles with granular module-level access)
- Form builder (JSON Schema-based templates for ratings, discipline, evaluations, custom)
- Google and Yelp review monitoring
- Impersonation (Levelset Admins can impersonate org users)

## Mobile App (React Native)

- **Stack:** Expo 54, React Native 0.81, Expo Router with NativeTabs
- **Auth:** Supabase JWT auth via `@supabase/supabase-js`
- **Design:** Dark mode support via ThemeContext, EN/ES internationalization

The mobile app is the leader field tool. It provides:
- **Levi AI chat** — streaming conversation with tool call visualizations (employee cards, infraction cards, lists)
- **Form submission** — rating and discipline forms submitted via native API routes
- **Employee lookup** — search and view employee profiles

Communication with the agent happens via SSE streaming to the Hono.js agent on Fly.io. The mobile app sends the user's JWT token for authentication.

## PWA Kiosks

- **Routes:** `/api/mobile/[token]/` in the dashboard's API routes
- **Auth:** Static `location_mobile_token` — no user identity, no JWT
- **Status:** LIVE IN PRODUCTION — never modify these routes

Tablet-based forms at physical restaurant locations. Workers use kiosk tablets to submit ratings and infractions. Authentication is a per-location static token stored in the `locations` table. These routes are unauthenticated and have no permission checks.

## Agent (Levi AI)

- **Stack:** Hono.js on Fly.io, TypeScript (strict mode)
- **URL:** levelset-agent.fly.dev (production), levelset-agent-dev.fly.dev (dev)
- **Auth:** JWT verification via middleware — requires Levelset Admin or authorized user

Levi is an AI assistant that helps restaurant leaders manage their teams. It processes natural language questions and uses structured data tools to query the database.

**LLM routing:**
- Primary model: MiniMax M2.5 (via OpenRouter) — handles ~85% of requests
- Escalation model: Claude Sonnet 4.5 (via OpenRouter) — complex tasks or primary failure
- Max 3 tool iterations per request

**7 data tools:** `lookup_employee`, `list_employees`, `get_employee_ratings`, `get_employee_infractions`, `get_employee_profile`, `get_team_overview`, `get_discipline_summary`, `get_position_rankings`

**Streaming:** Uses Vercel AI SDK's `createUIMessageStream` with SSE events: `data-tool-status` (tool call progress), `data-ui-block` (visual card data), and text deltas with 15ms word-by-word smoothing.

**Caching:** In-memory `TenantCache` scoped by org_id with TTL tiers (ORG_CONFIG: 10min, TEAM: 5min, PROFILE: 5min, DYNAMIC: 2min).

**System prompt:** 3-section structure — Identity & Guidelines (~100 tokens), Org Context (~200-400 tokens from parallel Supabase queries), User & Session (~30 tokens).

## Native vs PWA API Routes

Two parallel sets of form API routes serve different clients:

| | PWA Routes | Native Routes |
|---|---|---|
| **Path** | `/api/mobile/[token]/` | `/api/native/forms/` |
| **Auth** | Static location_mobile_token | Supabase JWT + permission checks |
| **Status** | LIVE IN PRODUCTION — DO NOT MODIFY | In development for mobile app |
| **Location** | Derived from token lookup | Passed as param, validated via `validateLocationAccess()` |

Both route sets perform the same business logic (creating ratings, infractions) but authentication and authorization differ completely.

## Forms Engine

The forms engine powers all structured data collection across the platform:

1. **Templates** — `form_templates` define form structure using JSON Schema + UI Schema. Types: rating, discipline, evaluation, custom.
2. **Submissions** — `form_submissions` store responses with a `schema_snapshot` for auditability.
3. **Connectors** — `form_connectors` provide Levelset-specific conditional logic (e.g., "no discipline points in last 30 days", "average rating meets threshold").
4. **Groups** — `form_groups` organize templates into categories (e.g., "Positional Excellence", "Discipline").

Templates are per-org with version tracking. Submissions are linked to employees and optionally scored.

## Documents Hub

Document management supports both org-scoped and global (cross-org) documents:

**Upload flow:**
1. Client requests a signed upload URL → uploads file directly to Supabase Storage
2. Document record created in `documents` (or `global_documents`)
3. Processing triggered → extracts content to markdown in `document_digests`

**Extraction methods:**
- `text_extract` — plain text files read directly
- `pdf_extract` — PDFs parsed via pdf-parse library
- `docx_extract` — Word documents via mammoth library
- `ocr` — images sent to GPT-4o Vision for text extraction
- `web_scrape` — URLs fetched and converted to markdown via Defuddle
- `raw_text` — direct text paste (global documents only)

**Storage:**
- Org documents: `org_documents` bucket, path `{org_id}/{document_id}/{filename}`
- Global documents: `global_documents` bucket, managed by Levelset Admins only

Extracted markdown in `content_md` is the foundation for RAG/indexing — it's the text that gets chunked and embedded for AI retrieval.

## Interconnections

```
Dashboard ──API routes──> Supabase (Postgres + Storage + Auth)
                              ↑
Mobile App ──JWT──> Agent (Fly.io) ──service_role──> Supabase
                              ↑
PWA Kiosks ──token──> Dashboard API ──service_role──> Supabase
```

- Dashboard reads/writes all data directly via Supabase client
- Mobile app communicates with the agent for AI chat; uses native API routes for form submissions
- PWA kiosks use dashboard API routes with static token authentication
- Agent uses service_role key to query Supabase (bypasses RLS) with org_id scoping enforced in code
- All three clients share the same Supabase database and auth system
