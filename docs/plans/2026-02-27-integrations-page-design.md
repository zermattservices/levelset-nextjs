# Integrations Page — Marketing Site

**Date**: 2026-02-27

## Overview

Add an Integrations page to the marketing site showcasing live and upcoming integrations. Each integration gets a card on the index page and a dedicated detail page at `/integrations/[slug]`.

## Integrations Data

### Live

**Google Maps** (`google-maps`)
- Category: Reviews & Location Intelligence
- Description: Automatically sync your Google Maps listing, business hours, ratings, and every review into Levelset. Weekly auto-sync keeps your data current, and AI analysis extracts sentiment, tags, and employee mentions from each review.
- How it works in Levelset: Operators connect their location via Google Places autocomplete in Location Settings. Phase 1 syncs place details and hours instantly. Phase 2 fetches all reviews via Outscraper (Google only returns 5). A weekly cron job keeps reviews current. Reviews are displayed in Location Settings with rating, count, and last sync time.

**HotSchedules** (`hotschedules`)
- Category: Scheduling & Workforce
- Description: Import your team roster, schedules, pay rates, sales forecasts, time-off requests, and availability directly from HotSchedules. A guided sync wizard matches employees, maps positions, and gets your data into Levelset in minutes.
- How it works in Levelset: A bookmarklet runs inside HotSchedules to extract data. A 6-step sync modal walks operators through reviewing new/modified/terminated employees, mapping HS jobs to Levelset positions, and confirming schedule imports. Supports incremental syncs with smart employee matching by HS ID, email, or name.

**Yelp** (`yelp`)
- Category: Reviews & Location Intelligence
- Description: Yelp reviews sync automatically when you connect your Google Maps listing. Levelset finds your Yelp business by name and address, then keeps reviews updated alongside Google for a complete picture of your guest feedback.
- How it works in Levelset: Auto-discovered during Google Maps connect via address-verified search. Uses Outscraper for credit-optimized incremental review fetching. Displayed side-by-side with Google reviews in Location Settings. Same AI analysis fields (sentiment, tags, employee mentions) as Google reviews.

### Coming Soon

**Slack** (`slack`)
- Category: Communication & Alerts
- Description: Get real-time Levelset notifications in Slack. Rating submissions, discipline actions, evaluation completions, schedule publishes, and AI insights — delivered to the channels your leadership team already uses.
- Planned capabilities: Channel routing per event type, configurable notification toggles, rich Block Kit messages with "View in Levelset" deep links, daily/weekly digest summaries, multi-location channel routing.

**Crystal** (`crystal`)
- Category: Team Intelligence & Leadership Development
- Description: Bring DISC personality intelligence into your team management workflow. Understand how each team member communicates, what motivates them, and how to coach them effectively — powered by Crystal's personality platform.
- Planned capabilities: DISC personality type on employee profiles, personalized coaching tips when giving feedback based on ratings and evaluations, shift personality mix analysis for balanced scheduling, Levi AI coaching scripts tailored to each employee's communication style.

## Page Architecture

### Data Layer: `apps/marketing/src/lib/integrations.ts`

```typescript
export interface Integration {
  slug: string;
  name: string;
  shortDescription: string;
  category: string;
  status: 'live' | 'coming-soon';
  externalUrl: string;
}

export const INTEGRATIONS: Integration[] = [
  { slug: 'google-maps', name: 'Google Maps', ... status: 'live', ... },
  { slug: 'hotschedules', name: 'HotSchedules', ... status: 'live', ... },
  { slug: 'yelp', name: 'Yelp', ... status: 'live', ... },
  { slug: 'slack', name: 'Slack', ... status: 'coming-soon', ... },
  { slug: 'crystal', name: 'Crystal', ... status: 'coming-soon', ... },
];
```

### Detail Content: `apps/marketing/src/lib/integration-content.ts`

Per-integration detail content (hero subtitle, feature bullets, how-it-works description) following the same pattern as `feature-content.ts`.

### Index Page: `/integrations/page.tsx`

Grid of integration cards (similar to FeaturesOverview). Cards show:
- Integration logo (SVG in `/public/integrations/`)
- Name + short description
- Status badge: green "Live" or muted "Coming Soon"
- All cards link to `/integrations/[slug]`

### Detail Pages: `/integrations/[slug]/page.tsx`

Template-based detail page per integration:
- Hero: logo + name + status badge + category tag
- Description section with feature bullets
- For live integrations: "How it works" section
- For coming soon: "Coming Soon" banner with description of planned capabilities
- CTA section at bottom

### Navigation Updates

- Header: Add "Integrations" link between "Pricing" and "About"
- Footer: Add "Integrations" under Product column
- Sitemap: Add `/integrations` and `/integrations/[slug]` entries

## Implementation Steps

1. Create `apps/marketing/src/lib/integrations.ts` with Integration type and INTEGRATIONS array
2. Create `apps/marketing/src/lib/integration-content.ts` with detail content per integration
3. Add integration logo SVGs to `apps/marketing/public/integrations/`
4. Create `apps/marketing/src/app/integrations/page.tsx` (index page)
5. Create `apps/marketing/src/app/integrations/[slug]/page.tsx` (detail pages)
6. Update Header.tsx to add "Integrations" nav link
7. Update Footer.tsx to add "Integrations" link
8. Update sitemap.ts to include integration pages
