# Levelset Monorepo

## Monorepo Structure

```
levelset-nextjs/               pnpm workspaces + Turborepo
├── apps/
│   ├── dashboard/             Next.js 14 Pages Router, MUI v7, TS strict:false
│   └── agent/                 Hono.js, TS strict:true, Fly.io
├── packages/
│   ├── design-tokens/         CSS vars (web) + raw values (native) — design system source of truth
│   ├── permissions/           Shared permission constants (@levelset/permissions)
│   ├── shared/                Generated Supabase types
│   └── supabase-client/       Supabase client factory for agent
│   └── mobile/                Expo 54 / React Native 0.81 — uses npm, excluded from pnpm workspace
├── supabase/migrations/       SQL migrations (YYYYMMDD_description.sql)
├── scripts/                   Ad-hoc TypeScript scripts (run via npx tsx scripts/<name>.ts)
└── docs/                      Mintlify documentation (docs.levelset.io)
```

> `apps/mobile/` uses **npm** (not pnpm) and is excluded from the pnpm workspace via `!apps/mobile` in `pnpm-workspace.yaml`.

## Commands

```bash
pnpm dev                          # All apps in parallel
pnpm dev:dashboard                # Dashboard only (port 3000)
pnpm dev:agent                    # Agent only
pnpm build                        # Build all (turbo-cached)
pnpm lint                         # Lint all
pnpm typecheck                    # Type-check all
pnpm db:gen-types                 # Regenerate Supabase TS types -> packages/shared/src/types/supabase.ts

pnpm --filter dashboard build     # Dashboard only
pnpm --filter @levelset/design-tokens build   # Must build before dashboard when tokens change

# Mobile (from apps/mobile/ — uses npm)
npm start                         # Expo dev server
npm run ios                       # iOS simulator

# Scripts (from repo root)
npx tsx scripts/<script-name>.ts  # Reads .env.local
```

## Architecture — Dashboard

### Pages Router Only

This is Next.js 14 with **Pages Router**. Never use App Router patterns: no `app/` directory, no server components, no `use client` directives, no `getServerSideProps`/`getStaticProps`.

All data fetching happens client-side in components.

### Page Pattern

Every page follows this structure:

```typescript
// pages/my-page.tsx — thin wrapper only
import * as React from 'react';
import { MyPage } from '@/components/pages/MyPage';
import { AppProviders } from '@/lib/providers/AppProviders';

function MyPageWrapper() {
  return (
    <AppProviders>
      <MyPage />
    </AppProviders>
  );
}
export default MyPageWrapper;
```

```typescript
// components/pages/MyPage.tsx — all logic and JSX here
// components/pages/MyPage.module.css — CSS Module co-located
```

AppProviders stacks: AuthProvider > ImpersonationProvider > LocationProvider > PermissionsProvider.

### Path Aliases

- `@/*` and `~/*` both resolve to `apps/dashboard/*`

### TypeScript

- Dashboard: `strict: false` — do NOT enable strict mode
- Agent: `strict: true` — full null checks required

### State Management

No Redux, Zustand, React Query, or SWR. Use:
- `useState` / `useReducer` for component state
- React Context for shared state (AuthProvider, PermissionsProvider, LocationProvider, ImpersonationProvider)
- Direct Supabase queries for server data

## Supabase

### Client Factories

```typescript
// Browser (components) — uses @supabase/ssr
import { createSupabaseClient } from '@/util/supabase/component';

// Server (API routes) — uses service role key, bypasses RLS
import { createServerSupabaseClient } from '@/lib/supabase-server';
```

Never call `createClient` from `@supabase/supabase-js` directly.

### Org-Scoped Queries (Critical)

All tenant data is multi-tenant. Every query MUST include org_id and/or location_id:

```typescript
// CORRECT
const { data } = await supabase.from('employees').select('*').eq('org_id', orgId);

// WRONG — never do unscoped queries on tenant tables
const { data } = await supabase.from('employees').select('*');
```

### Generated Types

Types live in `apps/dashboard/lib/supabase.types.ts`. Regenerate with `pnpm db:gen-types`. Never edit manually.

### Migrations

Files in `supabase/migrations/` use `YYYYMMDD_description.sql` naming. Check existing migrations before adding columns.

## Permission System

Two-tier model:
1. **Levelset Admin** (`role === 'Levelset Admin'`): Bypasses ALL permission checks
2. **Regular users**: Have `permission_profile_id` in `app_users` with granular boolean flags

```typescript
import { P } from '@/lib/permissions/constants';
import { usePermissions } from '@/lib/providers/PermissionsProvider';

// Client-side
const { hasPermission } = usePermissions();
if (hasPermission(P.ROSTER_EDIT_EMPLOYEE)) { /* ... */ }

// Server-side (API routes)
import { checkPermission } from '@/lib/permissions/service';
const allowed = await checkPermission(supabase, userId, orgId, P.ROSTER_EDIT_EMPLOYEE, userRole);
```

Permission keys use `MODULE.SUB_ITEM` format. Always use `P` constants — never hardcode strings.

## Design Tokens

### Web (dashboard)

CSS variables auto-imported via `@levelset/design-tokens/css/variables.css` in `_app.tsx`:

```css
.button { background: var(--ls-color-brand-base); }
```

Never hardcode hex values. Token structure: `--ls-color-{brand|destructive|success|warning|muted|neutral|basic}-{base|hover|border|foreground|soft|softForeground}`.

### Native (mobile)

```typescript
import { colors, spacing } from '@levelset/design-tokens/native';
```

## i18n

Two languages: **EN** and **ES**. Always update both locale files simultaneously.

```typescript
import { useTranslation } from 'react-i18next';
const { t } = useTranslation();           // 'common' namespace (default)
const { t: tf } = useTranslation('forms'); // 'forms' namespace
```

Translation files: `apps/dashboard/locales/{en,es}/{common,forms,errors}.json`

## API Routes

```typescript
// pages/api/my-resource.ts
import { createServerSupabaseClient } from '@/lib/supabase-server';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServerSupabaseClient();

  if (req.method === 'GET') { /* ... */ }
  if (req.method === 'POST') {
    const { intent } = req.body;  // intent-based POST for multi-action endpoints
    if (intent === 'create') { /* ... */ }
  }
  return res.status(405).json({ error: 'Method not allowed' });
}
```

Validate org_id from the authenticated user's session, NOT from the request body.

## Component Conventions

- **CSS Modules**: Co-located `ComponentName.module.css` files, imported as `import styles from './ComponentName.module.css'`
- **MUI v7**: Use MUI v7 APIs (not v5). DataGrid Pro: `@mui/x-data-grid-pro`. DatePicker: `@mui/x-date-pickers`
- **Emotion**: MUI uses Emotion internally. Use `sx` prop for one-off MUI styles, CSS Modules for component styles

## What NOT to Do

- Never use App Router (`app/` directory) — Pages Router only
- Never enable TypeScript strict mode in dashboard without explicit request
- Never add React Query, SWR, or global state libraries without discussing
- Never use `getServerSideProps` or `getStaticProps` — all data fetches happen client-side
- Never make unscoped database queries on tenant tables (always include org_id/location_id)
- Never call `createClient` from `@supabase/supabase-js` directly — use factory functions
- Never add columns without a migration file in `supabase/migrations/`
- Never edit `packages/shared/src/types/supabase.ts` manually — regenerate with `pnpm db:gen-types`
- Never run `pnpm` commands in `apps/mobile/` — it uses npm
- Never import from `apps/dashboard/` in mobile code — shared code goes in `packages/`
- Never hardcode hex color values in dashboard — use CSS variables from design tokens

## File Organization

| What | Where |
|------|-------|
| New page | `pages/my-page.tsx` (thin wrapper) + `components/pages/MyPage.tsx` |
| Shared component | `components/shared/` |
| UI primitive | `components/ui/` |
| API route | `pages/api/my-resource.ts` |
| Custom hook | `lib/hooks/` |
| Server utility | `lib/` |
| DB migration | `supabase/migrations/YYYYMMDD_description.sql` |
| Script | `scripts/my-script.ts` (run via `npx tsx`) |
| Locale strings | `locales/{en,es}/{common,forms,errors}.json` (both languages) |

## Deployment

| App | Platform | Trigger |
|-----|----------|---------|
| Dashboard | Vercel | Push to any branch (preview), push to main (production) |
| Agent | Fly.io | Push to develop (dev instance), push to main (production) |
| Mobile | EAS Build | Manual (`eas build`) |

## Environment Variables

**Dashboard**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_MUI_X_LICENSE_KEY`

**Agent**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PORT`

**Mobile**: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
