# Levelset Monorepo Restructuring & Agent Infrastructure Plan

## Context

The current codebase is a flat Next.js app deployed to Vercel from the root directory. We need to restructure into a pnpm monorepo so the existing dashboard lives at `apps/dashboard/` and a new Levi agent service lives at `apps/agent/`, deployed to Fly.io. The mobile app (`levelset-app/`) will eventually become `apps/mobile/` but is **out of scope** for this plan.

**Key constraints:**
- Vercel currently deploys from root — must update settings to point to `apps/dashboard`
- No AI features are implemented yet — just prepare the structure
- AI features must be restricted to `Levelset Admin` role only
- Fly.io app name: `levelset-agent` (org already created, no project yet)
- Supabase project: `pcplqsnilhrhupntibuv` (Levelset App, us-east-2)

---

## Phase 1: Monorepo Foundation (pnpm + Turborepo)

### Step 1.1: Initialize pnpm workspace

Create root workspace config files:

- `pnpm-workspace.yaml` — define `apps/*` and `packages/*` workspaces
- Root `package.json` — workspace scripts (`dev`, `build`, `lint`, `db:gen-types`)
- `turbo.json` — pipeline config for `build`, `dev`, `lint`, `typecheck`
- `.npmrc` — pnpm settings (shamefully-hoist for Next.js/Plasmic compat)

### Step 1.2: Move dashboard into `apps/dashboard/`

This is the most critical and delicate step. Move the existing Next.js app:

**Files to move into `apps/dashboard/`:**
- `pages/`, `components/`, `lib/`, `hooks/`, `styles/`, `util/`, `locales/`, `public/`, `plasmic/`
- `next.config.mjs`, `tsconfig.json`, `middleware.ts`, `plasmic.json`, `plasmic-tokens.theo.json`
- `package.json` (renamed to dashboard-specific)

**Files that stay at root:**
- `supabase/` — shared database migrations (single source of truth)
- `scripts/` — database utility scripts
- `docs/` — Mintlify documentation
- `.github/` — CI/CD workflows
- `.env*` files — environment configuration
- `levelset-app/` — mobile app (moved later)

**Update all import paths:**
- `tsconfig.json` paths (`@/*`, `~/*`) remain relative to `apps/dashboard/`
- `vercel.json` moves into `apps/dashboard/`

### Step 1.3: Create shared packages

**`packages/shared/`** — Types, constants, and utilities shared across apps:
- `src/types/supabase.ts` — Generated Supabase types (currently `lib/supabase.types.ts`)
- `src/types/index.ts` — Re-export all types
- `package.json` with name `@levelset/shared`

**`packages/supabase-client/`** — Supabase client wrappers:
- `src/browser.ts` — Browser client (from `util/supabase/component.ts`)
- `src/server.ts` — Server client (from `lib/supabase-server.ts`)
- `package.json` with name `@levelset/supabase-client`

**`packages/permissions/`** — Permission system (from `lib/permissions/`):
- Move `constants.ts`, `defaults.ts`, `service.ts`, `middleware.ts`, `index.ts`
- `package.json` with name `@levelset/permissions`

> **Note:** For Phase 1, these packages can simply re-export from their current locations in `apps/dashboard/lib/` to avoid breaking imports. We can do a proper extraction in a follow-up.

---

## Phase 2: Agent Service Scaffold (`apps/agent/`)

### Step 2.1: Create agent app structure

```
apps/agent/
├── package.json           # @levelset/agent
├── Dockerfile
├── fly.toml
├── tsconfig.json
└── src/
    ├── index.ts           # Hono server entry point
    ├── routes/
    │   ├── health.ts      # GET /health
    │   └── ai/
    │       └── chat.ts    # POST /api/ai/chat (stub, admin-only)
    └── middleware/
        └── auth.ts        # Supabase JWT verification + Levelset Admin check
```

### Step 2.2: fly.toml configuration

```toml
app = "levelset-agent"
primary_region = "sjc"

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  PORT = "3000"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = "suspend"
  auto_start_machines = true
  min_machines_running = 1

[[http_service.checks]]
  interval = "30s"
  timeout = "5s"
  grace_period = "10s"
  method = "GET"
  path = "/health"

[[vm]]
  memory = "1gb"
  cpu_kind = "shared"
  cpus = 1
```

### Step 2.3: Dockerfile

Multi-stage build using pnpm workspace filtering:
- Stage 1: Install dependencies with `pnpm --filter agent`
- Stage 2: Build TypeScript
- Stage 3: Production runtime (node:20-slim)

### Step 2.4: Auth middleware

The agent auth middleware will:
1. Extract JWT from `Authorization: Bearer <token>` header
2. Verify against Supabase (using `supabase.auth.getUser()`)
3. Look up `app_users` record and check `role = 'Levelset Admin'`
4. Reject all non-admin requests with 403

This ensures **no client organization sees AI features**.

---

## Phase 3: Supabase Tables for AI

### Step 3.1: Core AI tables migration

Create a single migration file with foundational tables. These are minimal tables to support the chat interface structure from the architecture doc — **no memory, heartbeat, or autonomy tables yet**.

```sql
-- AI Conversations (chat sessions)
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id),
  user_id UUID NOT NULL REFERENCES app_users(id),
  title TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI Messages (individual messages in a conversation)
CREATE TABLE ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Levi Configuration (per-org AI settings)
CREATE TABLE levi_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id) UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_ai_conversations_org_user ON ai_conversations(org_id, user_id);
CREATE INDEX idx_ai_messages_conversation ON ai_messages(conversation_id, created_at);
CREATE INDEX idx_levi_config_org ON levi_config(org_id);

-- RLS policies
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE levi_config ENABLE ROW LEVEL SECURITY;
```

### Step 3.2: Add AI permission module

Add a new permission module for AI features, restricted to Levelset Admin by default:

```sql
INSERT INTO permission_modules (key, name, description, display_order, is_active)
VALUES ('ai_assistant', 'AI Assistant', 'Access to Levi AI assistant features', 11, true);

INSERT INTO permission_sub_items (module_id, key, name, description, display_order)
SELECT m.id, 'use_ai_assistant', 'Use AI Assistant', 'Access to chat with Levi AI assistant', 1
FROM permission_modules m WHERE m.key = 'ai_assistant';
```

> **Note:** Since `Levelset Admin` bypasses all permission checks (hardcoded in `service.ts`), this permission won't be auto-granted to any org role by default. Only Levelset Admins will have access until we explicitly enable it for specific roles later.

---

## Phase 4: CI/CD Workflows

### Step 4.1: Agent deployment workflow

`.github/workflows/deploy-agent.yml`:

```yaml
name: Deploy Agent to Fly.io
on:
  push:
    branches: [main]
    paths:
      - 'apps/agent/**'
      - 'packages/shared/**'
      - 'packages/supabase-client/**'
      - 'packages/permissions/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --remote-only
        working-directory: apps/agent
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

### Step 4.2: Dashboard build validation workflow

`.github/workflows/build-dashboard.yml`:

```yaml
name: Build Dashboard
on:
  pull_request:
    paths:
      - 'apps/dashboard/**'
      - 'packages/**'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter dashboard build
```

### Step 4.3: Update existing workflows

- Update `plasmic.yml` to run from `apps/dashboard/` context
- Update `preview.yml` to use pnpm and filter to dashboard

---

## Phase 5: Vercel Configuration Changes

### CRITICAL: Vercel Dashboard Settings Update

**Before merging any code**, you must update these settings in the Vercel dashboard:

1. **Go to**: https://vercel.com → Levelset project → Settings → General
2. **Root Directory**: Change from `/` (empty/root) to `apps/dashboard`
3. **Build Command**: Should auto-detect `next build` (or set explicitly: `cd ../.. && pnpm --filter dashboard build`)
4. **Install Command**: Set to `cd ../.. && pnpm install --frozen-lockfile`
5. **Framework Preset**: Ensure it's set to "Next.js"

### `apps/dashboard/vercel.json`

Updated vercel.json with AI proxy rewrites for future use:

```json
{
  "crons": [
    {
      "path": "/api/cron/evaluate-certifications",
      "schedule": "0 8 * * *"
    }
  ],
  "rewrites": [
    {
      "source": "/docs",
      "destination": "https://levelset.mintlify.dev/"
    },
    {
      "source": "/docs/:path*",
      "destination": "https://levelset.mintlify.dev/:path*"
    }
  ]
}
```

> **Note:** The AI proxy rewrites (`/api/ai/:path*` → agent service) will be added once the agent is deployed and has a stable URL.

### Environment Variables

All existing Vercel environment variables remain the same. No changes needed — they'll be picked up by the dashboard app automatically since Vercel injects them at build time.

New env vars needed **for Fly.io** (set via `fly secrets set`):
- `SUPABASE_URL` — same as `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase dashboard
- `AGENT_SERVICE_SECRET` — generate a random secret for service-to-service auth

---

## Phase 6: Fly.io Project Setup

### Step 6.1: Create Fly.io app

```bash
fly apps create levelset-agent
```

### Step 6.2: Set secrets

```bash
fly secrets set SUPABASE_URL=https://pcplqsnilhrhupntibuv.supabase.co
fly secrets set SUPABASE_SERVICE_ROLE_KEY=<from-supabase-dashboard>
fly secrets set AGENT_SERVICE_SECRET=<generate-random-secret>
```

### Step 6.3: Initial deploy

```bash
cd apps/agent
fly deploy
```

---

## Implementation Order

1. **Phase 1** (Steps 1.1-1.3): Monorepo setup + move dashboard
2. **Phase 5** (Vercel settings): Update Vercel BEFORE merging Phase 1
3. **Phase 3** (Steps 3.1-3.2): Supabase migrations via MCP
4. **Phase 2** (Steps 2.1-2.4): Agent scaffold
5. **Phase 4** (Steps 4.1-4.3): CI/CD workflows
6. **Phase 6** (Steps 6.1-6.3): Fly.io setup (manual steps you'll do)

---

## What This Plan Does NOT Do

- Does not implement any AI features (chat, RAG, meeting transcription, etc.)
- Does not move the mobile app (`levelset-app/`) — that's a separate effort
- Does not extract shared packages fully — uses re-exports initially for safety
- Does not set up Inngest, AssemblyAI, OpenRouter, or other AI service integrations
- Does not create the `packages/ai-tools/` package — that comes with actual AI implementation

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Vercel deploy breaks after restructure | Update Vercel root directory setting BEFORE merging. Test with a preview deploy first. |
| Import paths break | Keep `@/*` and `~/*` aliases relative to `apps/dashboard/`. Run build to verify. |
| Plasmic breaks | plasmic.json and all plasmic files move together. Paths are relative. |
| Supabase types break | Types file moves to `packages/shared/` but `apps/dashboard/` re-exports it. |
| CI/CD triggers wrong | Path filters in workflows ensure only relevant changes trigger deploys. |
