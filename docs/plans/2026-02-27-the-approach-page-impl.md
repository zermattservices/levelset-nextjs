# The Approach Event Page — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a dynamic event funnel page at `/the-approach` on the marketing site that changes content per timeslot and captures leads via a form.

**Architecture:** Next.js 14 App Router page (marketing app). Timeslot content stored in Supabase `the_approach` table, fetched client-side. Lead submissions saved to unified `leads` table (source: `the_approach`) with CFA directory enrichment. Password-gated via sessionStorage. Uses existing site layout (Header/Footer) and design system (Tailwind + design tokens).

**Tech Stack:** Next.js 14 App Router, Tailwind CSS, Supabase, Resend, TypeScript

---

## Task 1: Database Migration — Create Tables

**Files:**
- Create: `supabase/migrations/20260227_the_approach.sql`

**Step 1: Write the migration**

```sql
-- The Approach 2026 — Event Funnel Page
-- Timeslot content + lead capture tables

-- 1. Timeslot content (managed directly in Supabase)
CREATE TABLE the_approach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timeslot_number INTEGER NOT NULL UNIQUE,
  day_label TEXT NOT NULL,
  time_range TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  badge_text TEXT,
  headline TEXT NOT NULL,
  subtext TEXT NOT NULL,
  feature_cards JSONB NOT NULL DEFAULT '[]',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for ordering
CREATE INDEX idx_the_approach_timeslot ON the_approach(timeslot_number);

-- 2. Unified leads table (used across all lead sources: The Approach, free trial, waitlist, etc.)
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  is_operator BOOLEAN,
  role TEXT,
  is_multi_unit BOOLEAN,
  locations JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  email_sent BOOLEAN DEFAULT false,
  notes TEXT
);

-- Unique on (email, source) so a person can be a lead from multiple sources
-- and can re-submit within the same source to correct typos
CREATE UNIQUE INDEX idx_leads_email_source ON leads(email, source);

-- Index for filtering by source
CREATE INDEX idx_leads_source ON leads(source);

-- Enable RLS but allow service-role access (API routes use service role key)
ALTER TABLE the_approach ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Public read access for the_approach (content is not sensitive)
CREATE POLICY "Public can read active timeslots"
  ON the_approach FOR SELECT
  USING (active = true);

-- No public access to leads (only service role writes)
```

**Step 2: Apply migration**

Run from repo root:
```bash
# Push to Supabase (or apply via dashboard)
# The marketing app uses the same Supabase project as the dashboard
```

**Step 3: Commit**

```bash
git add supabase/migrations/20260227_the_approach.sql
git commit -m "feat: add the_approach and leads tables for event funnel"
```

---

## Task 2: Seed Timeslot Content

**Files:**
- Create: `scripts/seed-the-approach-content.ts`

**Step 1: Write the seed script**

This script upserts all 8 timeslots into the `the_approach` table. All times are in Central Time (UTC-5 for CDT in late March — but March 22 2026 is after DST starts March 8, so CDT = UTC-5).

```typescript
/**
 * Seed The Approach timeslot content.
 *
 * Usage: npx tsx scripts/seed-the-approach-content.ts
 * Reads .env.local for SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const timeslots = [
  {
    timeslot_number: 1,
    day_label: 'Sunday',
    time_range: '12:00 PM – 5:00 PM',
    starts_at: '2026-03-22T17:00:00Z', // 12:00 PM CDT
    ends_at: '2026-03-22T22:00:00Z',   // 5:00 PM CDT
    badge_text: 'Welcome to The Approach',
    headline: 'The team performance platform built for Chick-fil-A',
    subtext: 'Levelset replaces the binders and spreadsheets you use to track ratings, discipline, and your roster — all in one platform built exclusively for how CFA restaurants operate.',
    feature_cards: [
      {
        icon: 'chart-bar',
        title: 'Position-Based Ratings',
        description: 'Rate every team member on your exact positions — Register, Drive-Thru, Grill, and more. Rolling averages from the last 4 ratings show real trends, not snapshots.',
      },
      {
        icon: 'shield',
        title: 'Consistent Discipline',
        description: 'The CARES progressive system ensures every manager handles accountability the same way. Documented, fair, and consistent across every shift.',
      },
      {
        icon: 'users',
        title: 'Your Entire Team, Connected',
        description: 'Roster, ratings, discipline, and development history — all linked per employee. No more digging through binders or spreadsheets.',
      },
    ],
  },
  {
    timeslot_number: 2,
    day_label: 'Monday',
    time_range: '8:00 AM – 8:30 AM',
    starts_at: '2026-03-23T13:00:00Z', // 8:00 AM CDT
    ends_at: '2026-03-23T13:30:00Z',
    badge_text: 'Good morning',
    headline: 'See your team clearly — in under 2 minutes',
    subtext: 'Levelset gives you a single view of your entire team\'s performance. Positions, ratings, discipline, roster — connected in one platform built for CFA.',
    feature_cards: [
      {
        icon: 'chart-bar',
        title: 'Position-Based Ratings',
        description: 'Every position rated on the same criteria. Rolling averages show who\'s growing and who needs support.',
      },
      {
        icon: 'shield',
        title: 'Fair, Documented Discipline',
        description: 'Progressive accountability that follows the same process regardless of who\'s managing that day.',
      },
    ],
  },
  {
    timeslot_number: 3,
    day_label: 'Monday',
    time_range: '11:00 AM – 1:30 PM',
    starts_at: '2026-03-23T16:00:00Z', // 11:00 AM CDT
    ends_at: '2026-03-23T18:30:00Z',
    badge_text: 'Coming from the Leadership Forum?',
    headline: 'Give your team the clarity they\'re asking for',
    subtext: 'Craig Groeschel talked about leading with clarity. Levelset delivers it — clear expectations per position, visible progress, and consistent standards across every shift and every supervisor.',
    feature_cards: [
      {
        icon: 'chart-bar',
        title: 'Clear Expectations Per Position',
        description: 'Every team member knows exactly what "great" looks like at their position. No ambiguity, no inconsistency between managers.',
      },
      {
        icon: 'clipboard-check',
        title: 'Onboarding That Sticks',
        description: 'Track the 30/60/90 progression with real data. See whether your onboarding is actually producing capable team members.',
      },
      {
        icon: 'users',
        title: 'Culture Is Consistency',
        description: 'When every supervisor rates and coaches using the same criteria, that IS culture. Levelset makes it happen automatically.',
      },
    ],
  },
  {
    timeslot_number: 4,
    day_label: 'Monday',
    time_range: '3:15 PM – 5:30 PM',
    starts_at: '2026-03-23T20:15:00Z', // 3:15 PM CDT
    ends_at: '2026-03-23T22:30:00Z',
    badge_text: 'Thinking about employer branding?',
    headline: 'Employer branding backed by data, not slogans',
    subtext: 'Nido Qubein talked about building a brand people choose. Your PEA data proves you invest in your people — clear criteria, tracked growth, fair accountability. That\'s an employer brand your team can feel.',
    feature_cards: [
      {
        icon: 'chart-bar',
        title: 'Prove Your Investment in People',
        description: 'Position mastery data shows exactly how team members grow. Visible development paths that Gen Z is asking for.',
      },
      {
        icon: 'shield',
        title: 'Fair Accountability = Trust',
        description: 'When discipline is consistent and documented, your team trusts the process. Trust drives retention.',
      },
      {
        icon: 'users',
        title: 'Talent Strategy, Operationalized',
        description: 'Your talent strategy shouldn\'t live in a binder. Levelset makes it the daily operating system for your team.',
      },
    ],
  },
  {
    timeslot_number: 5,
    day_label: 'Monday',
    time_range: '6:30 PM – 7:00 PM',
    starts_at: '2026-03-23T23:30:00Z', // 6:30 PM CDT
    ends_at: '2026-03-24T00:00:00Z',
    badge_text: 'Thinking about execution?',
    headline: 'Your talent strategy scoreboard',
    subtext: 'Chris McChesney\'s whole point: strategies fail without visible execution. Levelset is your scoreboard — team performance made visible, trackable, and actionable every single day.',
    feature_cards: [
      {
        icon: 'chart-bar',
        title: 'The Scoreboard You\'re Missing',
        description: 'PEA analytics turn team performance into a visible, trackable metric. Your whole leadership team knows the score.',
      },
      {
        icon: 'shield',
        title: 'Execute on Accountability',
        description: 'Discipline tracking ensures your accountability strategy actually gets executed — consistently, every shift.',
      },
      {
        icon: 'clipboard-check',
        title: 'From Strategy to Action',
        description: 'Position mastery data shows exactly where to focus development effort. No guessing, no gut feelings.',
      },
    ],
  },
  {
    timeslot_number: 6,
    day_label: 'Tuesday',
    time_range: '7:45 AM – 8:15 AM',
    starts_at: '2026-03-24T12:45:00Z', // 7:45 AM CDT
    ends_at: '2026-03-24T13:15:00Z',
    badge_text: 'Last day at The Approach',
    headline: 'Haven\'t visited us yet? Here\'s the 60-second version',
    subtext: 'Levelset connects your positions, ratings, discipline, and roster in one platform — built specifically for CFA. Every rater uses the same criteria, every team member sees clear expectations.',
    feature_cards: [
      {
        icon: 'chart-bar',
        title: 'Position-Based Ratings',
        description: 'Rate every team member on your exact positions using consistent criteria. See real trends with rolling averages.',
      },
      {
        icon: 'shield',
        title: 'Consistent Discipline',
        description: 'Progressive accountability that\'s documented, fair, and the same regardless of who\'s managing.',
      },
    ],
  },
  {
    timeslot_number: 7,
    day_label: 'Tuesday',
    time_range: '10:00 AM – 11:10 AM',
    starts_at: '2026-03-24T15:00:00Z', // 10:00 AM CDT
    ends_at: '2026-03-24T16:10:00Z',
    badge_text: 'Future-proofing your talent strategy?',
    headline: 'Meet the future of team performance management',
    subtext: 'Johnny C. Taylor and Tim Elmore just talked about future-proofing talent. Levelset is how you do it — technology that grows with your team and meets the expectations of the next generation of workers.',
    feature_cards: [
      {
        icon: 'sparkles',
        title: 'AI-Powered Insights',
        description: 'Levi, your built-in AI assistant, answers questions about team performance instantly. "Who\'s my strongest grill person?" — answered in seconds.',
      },
      {
        icon: 'chart-bar',
        title: 'What Gen Z Is Asking For',
        description: 'Frequent feedback, clear expectations, and visible growth paths. PEA ratings deliver exactly what the next generation needs to stay engaged.',
      },
      {
        icon: 'users',
        title: 'Retention Through Visibility',
        description: 'See who\'s plateauing before they disengage. Intervene early with data, not gut feelings.',
      },
    ],
  },
  {
    timeslot_number: 8,
    day_label: 'Tuesday',
    time_range: '12:15 PM – 1:30 PM',
    starts_at: '2026-03-24T17:15:00Z', // 12:15 PM CDT
    ends_at: '2026-03-24T18:30:00Z',
    badge_text: 'Building your action plan?',
    headline: 'Put Levelset on it',
    subtext: 'You just built your 6-month talent strategy. Levelset is how you operationalize it — start this week and have your team rated within days, not months.',
    feature_cards: [
      {
        icon: 'chart-bar',
        title: 'Set Up in a Week',
        description: 'Enter your positions, your criteria, your team — and you\'re rating. Most operators are fully live within a week.',
      },
      {
        icon: 'users',
        title: 'Personal Onboarding With the Founder',
        description: 'Every Approach attendee gets a 1-on-1 setup call with the founder. We\'ll configure Levelset for exactly how your restaurant operates.',
      },
      {
        icon: 'sparkles',
        title: 'Your Whole Platform, One Place',
        description: 'Roster, ratings, discipline, scheduling, certifications, and AI — all connected, all built for CFA.',
      },
    ],
  },
];

async function seed() {
  console.log('Seeding The Approach timeslot content...\n');

  for (const slot of timeslots) {
    const { error } = await supabase
      .from('the_approach')
      .upsert(slot, { onConflict: 'timeslot_number' });

    if (error) {
      console.error(`Error seeding timeslot ${slot.timeslot_number}:`, error.message);
    } else {
      console.log(`✓ Timeslot ${slot.timeslot_number}: ${slot.day_label} ${slot.time_range}`);
    }
  }

  // Verify
  const { data, error } = await supabase
    .from('the_approach')
    .select('timeslot_number, day_label, time_range')
    .order('timeslot_number');

  if (error) {
    console.error('\nVerification failed:', error.message);
  } else {
    console.log(`\n✓ ${data.length} timeslots seeded successfully`);
  }
}

seed().catch(console.error);
```

**Step 2: Run the seed script**

```bash
npx tsx scripts/seed-the-approach-content.ts
```

Expected: 8 timeslots seeded, verification shows all 8.

**Step 3: Commit**

```bash
git add scripts/seed-the-approach-content.ts
git commit -m "feat: add seed script for The Approach timeslot content"
```

---

## Task 3: API Route — GET Timeslot Content

**Files:**
- Create: `apps/marketing/src/app/api/the-approach/content/route.ts`

**Step 1: Write the API route**

This is a Next.js App Router API route (like `apps/marketing/src/app/api/waitlist/route.ts`). Uses `createServerSupabaseClient` from `@/lib/supabase`.

```typescript
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('the_approach')
      .select('*')
      .eq('active', true)
      .order('timeslot_number');

    if (error) {
      console.error('Failed to fetch timeslot content:', error);
      return NextResponse.json(
        { error: 'Failed to load content' },
        { status: 500 }
      );
    }

    return NextResponse.json({ timeslots: data || [] });
  } catch {
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
```

**Step 2: Commit**

```bash
git add apps/marketing/src/app/api/the-approach/content/route.ts
git commit -m "feat: add GET /api/the-approach/content endpoint"
```

---

## Task 4: API Route — POST Lead Submission

**Files:**
- Create: `apps/marketing/src/app/api/the-approach/submit/route.ts`

**Step 1: Write the API route**

Accepts lead form data, enriches store numbers from `cfa_location_directory`, upserts into `leads` table with `source: 'the_approach'`, sends confirmation email via Resend.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getResendClient } from '@/lib/resend';

interface SubmitBody {
  first_name: string;
  last_name: string;
  email: string;
  is_operator: boolean;
  role: string;
  is_multi_unit: boolean;
  store_numbers: string[];
  timeslot_number: number | null;
}

export async function POST(request: NextRequest) {
  try {
    const body: SubmitBody = await request.json();

    // Validate required fields
    if (!body.first_name?.trim() || !body.last_name?.trim()) {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
    }
    if (!body.email?.trim() || !body.email.includes('@')) {
      return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
    }
    if (!body.store_numbers?.length || !body.store_numbers[0]?.trim()) {
      return NextResponse.json({ error: 'At least one store number is required.' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Enrich store numbers from CFA directory
    const enrichedLocations = [];
    for (const storeNum of body.store_numbers) {
      const cleaned = storeNum.trim();
      if (!cleaned) continue;

      const { data: matches } = await supabase
        .from('cfa_location_directory')
        .select('location_name, location_number, operator_name, state')
        .eq('location_number', cleaned)
        .limit(1);

      const match = matches?.[0];
      enrichedLocations.push({
        store_number: cleaned,
        location_name: match?.location_name || null,
        operator_name: match?.operator_name || null,
        state: match?.state || null,
      });
    }

    // Upsert lead (keyed on email + source — allows corrections within same source)
    const { error: dbError } = await supabase
      .from('leads')
      .upsert(
        {
          source: 'the_approach',
          first_name: body.first_name.trim(),
          last_name: body.last_name.trim(),
          email: body.email.trim().toLowerCase(),
          is_operator: body.is_operator ?? false,
          role: body.role?.trim() || null,
          is_multi_unit: body.is_multi_unit ?? false,
          locations: enrichedLocations,
          metadata: { timeslot_number: body.timeslot_number },
          submitted_at: new Date().toISOString(),
          email_sent: false,
        },
        { onConflict: 'email,source' }
      );

    if (dbError) {
      console.error('leads upsert error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save. Please try again.' },
        { status: 500 }
      );
    }

    // Send confirmation email (non-blocking)
    sendConfirmationEmail(body).catch((err) => {
      console.error('Approach confirmation email error:', err);
    });

    // Send internal notification (non-blocking)
    sendInternalNotification(body, enrichedLocations).catch((err) => {
      console.error('Approach internal notification error:', err);
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

async function sendConfirmationEmail(body: SubmitBody) {
  const resend = getResendClient();

  await resend.emails.send({
    from: 'Andrew at Levelset <andrew@levelset.io>',
    to: [body.email.trim().toLowerCase()],
    subject: 'Thanks for visiting Levelset at The Approach!',
    text: [
      `Hey ${body.first_name.trim()}!`,
      '',
      `Great meeting you at The Approach. As promised, we'll be in touch shortly with your exclusive offer details.`,
      '',
      `In the meantime, you can learn more about Levelset at https://levelset.io`,
      '',
      `Talk soon,`,
      `Andrew Dyar`,
      `Founder, Levelset`,
    ].join('\n'),
  });

  // Mark email as sent
  const supabase = createServerSupabaseClient();
  await supabase
    .from('leads')
    .update({ email_sent: true })
    .eq('email', body.email.trim().toLowerCase())
    .eq('source', 'the_approach');
}

async function sendInternalNotification(
  body: SubmitBody,
  locations: Array<{ store_number: string; location_name: string | null; state: string | null }>
) {
  const resend = getResendClient();

  const locationLines = locations
    .map((l) => `  #${l.store_number}${l.location_name ? ` — ${l.location_name}` : ''}${l.state ? ` (${l.state})` : ''}`)
    .join('\n');

  await resend.emails.send({
    from: 'Levelset <notifications@levelset.io>',
    to: ['team@levelset.io'],
    subject: `🎯 New Approach lead: ${body.first_name} ${body.last_name}`,
    text: [
      `New lead from The Approach event page:`,
      '',
      `Name: ${body.first_name} ${body.last_name}`,
      `Email: ${body.email}`,
      `Operator: ${body.is_operator ? 'Yes' : 'No'}`,
      `Role: ${body.role || 'Not specified'}`,
      `Multi-unit: ${body.is_multi_unit ? 'Yes' : 'No'}`,
      `Locations:`,
      locationLines,
      `Timeslot: ${body.timeslot_number || 'Unknown'}`,
      '',
      `Submitted: ${new Date().toISOString()}`,
    ].join('\n'),
  });
}
```

**Step 2: Commit**

```bash
git add apps/marketing/src/app/api/the-approach/submit/route.ts
git commit -m "feat: add POST /api/the-approach/submit endpoint with CFA enrichment"
```

---

## Task 5: Page Component — Password Gate + Timeslot Selector + Hero

**Files:**
- Create: `apps/marketing/src/app/the-approach/page.tsx`
- Create: `apps/marketing/src/app/the-approach/TheApproachPage.tsx`

**Step 1: Create the page wrapper** (`page.tsx`)

This is the thin server component with metadata. The actual page is a client component.

```typescript
import type { Metadata } from 'next';
import { TheApproachPage } from './TheApproachPage';

export const metadata: Metadata = {
  title: 'The Approach 2026',
  description: 'Levelset at The Approach — the team performance platform built for Chick-fil-A.',
  robots: { index: false, follow: false }, // Don't index this event page
};

export default function Page() {
  return <TheApproachPage />;
}
```

**Step 2: Create the client component** (`TheApproachPage.tsx`)

This is the main component containing all page logic. It's a single file with:
- Password gate
- Timeslot data fetching + auto-selection + dropdown override
- Dynamic hero section
- Feature cards
- Lead capture form
- Social proof section

See Task 5 code below. This is a large component, so I'm splitting the description across Tasks 5–7 but it's all in **one file**: `TheApproachPage.tsx`.

```typescript
'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface FeatureCard {
  icon: string;
  title: string;
  description: string;
}

interface Timeslot {
  id: string;
  timeslot_number: number;
  day_label: string;
  time_range: string;
  starts_at: string;
  ends_at: string;
  badge_text: string | null;
  headline: string;
  subtext: string;
  feature_cards: FeatureCard[];
}

/* -------------------------------------------------------------------------- */
/*  Icons (same SVGs used across the marketing site)                           */
/* -------------------------------------------------------------------------- */

const ICONS: Record<string, React.ReactNode> = {
  'chart-bar': (
    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  shield: (
    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
    </svg>
  ),
  users: (
    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  'clipboard-check': (
    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0118 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3l1.5 1.5 3-3.75" />
    </svg>
  ),
  sparkles: (
    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  ),
};

/* -------------------------------------------------------------------------- */
/*  Timeslot auto-selection helper                                             */
/* -------------------------------------------------------------------------- */

function getCurrentTimeslot(timeslots: Timeslot[]): Timeslot {
  const now = new Date();
  // Check if we're inside any active window
  for (const slot of timeslots) {
    const start = new Date(slot.starts_at);
    const end = new Date(slot.ends_at);
    if (now >= start && now <= end) return slot;
  }
  // Between windows: find the most recent one that has ended
  let mostRecent: Timeslot | null = null;
  for (const slot of timeslots) {
    const end = new Date(slot.ends_at);
    if (now > end) {
      if (!mostRecent || end > new Date(mostRecent.ends_at)) {
        mostRecent = slot;
      }
    }
  }
  // If found a past slot, use it; otherwise default to first
  return mostRecent || timeslots[0];
}

/* -------------------------------------------------------------------------- */
/*  Password Gate                                                              */
/* -------------------------------------------------------------------------- */

function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.toLowerCase().trim() === 'levelset') {
      sessionStorage.setItem('approach_unlocked', '1');
      onUnlock();
    } else {
      setError(true);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-[#f6fffa]">
      <form onSubmit={handleSubmit} className="w-full max-w-xs text-center">
        <div className="mb-8">
          <img
            src="/logos/levelset-horizontal-dark.png"
            alt="Levelset"
            className="h-8 mx-auto mb-6"
          />
          <p className="text-sm text-text-secondary">
            Enter the password to continue.
          </p>
        </div>
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(false); }}
          error={error ? 'Incorrect password' : undefined}
          className="text-center"
        />
        <Button type="submit" className="w-full mt-3" size="md">
          Enter
        </Button>
      </form>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Lead Capture Form                                                          */
/* -------------------------------------------------------------------------- */

function LeadForm({ activeTimeslot }: { activeTimeslot: number | null }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [isOperator, setIsOperator] = useState<boolean | null>(null);
  const [role, setRole] = useState('');
  const [isMultiUnit, setIsMultiUnit] = useState(false);
  const [storeNumbers, setStoreNumbers] = useState(['']);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  function handleStoreNumberChange(index: number, value: string) {
    const cleaned = value.replace(/\D/g, '').slice(0, 5);
    setStoreNumbers((prev) => {
      const next = [...prev];
      next[index] = cleaned;
      return next;
    });
  }

  function addStoreNumber() {
    if (storeNumbers.length < 3) {
      setStoreNumbers((prev) => [...prev, '']);
    }
  }

  function removeStoreNumber(index: number) {
    if (storeNumbers.length > (isMultiUnit ? 2 : 1)) {
      setStoreNumbers((prev) => prev.filter((_, i) => i !== index));
    }
  }

  // When multi-unit is toggled on, ensure at least 2 fields
  useEffect(() => {
    if (isMultiUnit && storeNumbers.length < 2) {
      setStoreNumbers((prev) => [...prev, '']);
    }
    if (!isMultiUnit) {
      setStoreNumbers((prev) => [prev[0] || '']);
    }
  }, [isMultiUnit]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-set role when operator is selected
  useEffect(() => {
    if (isOperator === true) {
      setRole('Operator');
    } else if (isOperator === false) {
      setRole('');
    }
  }, [isOperator]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim() || isOperator === null || !storeNumbers[0]?.trim()) {
      setErrorMessage('Please fill in all required fields.');
      setStatus('error');
      return;
    }
    if (isOperator === false && !role) {
      setErrorMessage('Please select your role.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      const res = await fetch('/api/the-approach/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email,
          is_operator: isOperator,
          role: isOperator ? 'Operator' : role,
          is_multi_unit: isMultiUnit,
          store_numbers: storeNumbers.filter((s) => s.trim()),
          timeslot_number: activeTimeslot,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Something went wrong');
      }

      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  if (status === 'success') {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#31664A]/10 mb-4">
          <svg className="w-7 h-7 text-[#31664A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-heading font-bold text-text-primary mb-2">
          You&apos;re in!
        </h3>
        <p className="text-text-secondary text-sm max-w-sm mx-auto">
          Check your email for a confirmation from Andrew. We&apos;ll be in touch with your exclusive offer shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md mx-auto">
      {/* Name */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="First Name"
          placeholder="Jane"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
        />
        <Input
          label="Last Name"
          placeholder="Smith"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
        />
      </div>

      {/* Email */}
      <Input
        label="Email"
        type="email"
        placeholder="jane@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      {/* Are you the Operator? */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Are you the Operator?
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsOperator(true)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all duration-150 ${
              isOperator === true
                ? 'bg-[#31664A] text-white border-[#31664A]'
                : 'bg-white text-text-secondary border-neutral-border hover:border-gray-400'
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => setIsOperator(false)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all duration-150 ${
              isOperator === false
                ? 'bg-[#31664A] text-white border-[#31664A]'
                : 'bg-white text-text-secondary border-neutral-border hover:border-gray-400'
            }`}
          >
            No
          </button>
        </div>
      </div>

      {/* Role — only shown when not operator */}
      {isOperator === false && (
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5" htmlFor="role">
            Your Role
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-white border border-neutral-border text-text-primary transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
            required
          >
            <option value="">Select your role</option>
            <option value="Talent Director">Talent Director</option>
            <option value="Director">Director</option>
            <option value="Team Lead">Team Lead</option>
            <option value="Manager">Manager</option>
            <option value="Other">Other</option>
          </select>
        </div>
      )}

      {/* Multi-unit? */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Multi-unit?
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsMultiUnit(true)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all duration-150 ${
              isMultiUnit
                ? 'bg-[#31664A] text-white border-[#31664A]'
                : 'bg-white text-text-secondary border-neutral-border hover:border-gray-400'
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => setIsMultiUnit(false)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all duration-150 ${
              !isMultiUnit
                ? 'bg-[#31664A] text-white border-[#31664A]'
                : 'bg-white text-text-secondary border-neutral-border hover:border-gray-400'
            }`}
          >
            No
          </button>
        </div>
      </div>

      {/* Store Numbers */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          Store Number{isMultiUnit ? 's' : ''}
        </label>
        <div className="space-y-2">
          {storeNumbers.map((num, i) => (
            <div key={i} className="flex gap-2">
              <Input
                placeholder="01234"
                value={num}
                onChange={(e) => handleStoreNumberChange(i, e.target.value)}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={5}
                required={i === 0}
              />
              {isMultiUnit && storeNumbers.length > 2 && i > 0 && (
                <button
                  type="button"
                  onClick={() => removeStoreNumber(i)}
                  className="px-3 text-text-secondary hover:text-destructive transition-colors flex-shrink-0"
                  aria-label="Remove store number"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
        {isMultiUnit && storeNumbers.length < 3 && (
          <button
            type="button"
            onClick={addStoreNumber}
            className="mt-2 text-sm text-[#31664A] font-medium hover:underline"
          >
            + Add another location
          </button>
        )}
      </div>

      {/* Error */}
      {status === 'error' && errorMessage && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}

      {/* Submit */}
      <Button type="submit" size="lg" className="w-full" disabled={status === 'loading'}>
        {status === 'loading' ? 'Submitting...' : 'Claim Your Exclusive Offer'}
      </Button>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Page Component                                                        */
/* -------------------------------------------------------------------------- */

export function TheApproachPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [timeslots, setTimeslots] = useState<Timeslot[]>([]);
  const [activeSlot, setActiveSlot] = useState<Timeslot | null>(null);
  const [overrideSlot, setOverrideSlot] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Check sessionStorage for password on mount
  useEffect(() => {
    if (sessionStorage.getItem('approach_unlocked') === '1') {
      setUnlocked(true);
    }
  }, []);

  // Fetch timeslot content
  const fetchContent = useCallback(async () => {
    try {
      const res = await fetch('/api/the-approach/content');
      if (!res.ok) throw new Error('Failed to fetch');
      const { timeslots: data } = await res.json();
      setTimeslots(data);
      if (data.length > 0) {
        setActiveSlot(getCurrentTimeslot(data));
      }
    } catch (err) {
      console.error('Failed to load timeslot content:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (unlocked) fetchContent();
  }, [unlocked, fetchContent]);

  // Handle dropdown override
  useEffect(() => {
    if (overrideSlot !== null) {
      const slot = timeslots.find((s) => s.timeslot_number === overrideSlot);
      if (slot) setActiveSlot(slot);
    } else if (timeslots.length > 0) {
      setActiveSlot(getCurrentTimeslot(timeslots));
    }
  }, [overrideSlot, timeslots]);

  // Password gate
  if (!unlocked) {
    return <PasswordGate onUnlock={() => setUnlocked(true)} />;
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#31664A]/20 border-t-[#31664A] rounded-full animate-spin" />
      </div>
    );
  }

  if (!activeSlot) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <p className="text-text-secondary">No content available yet. Check back soon.</p>
      </div>
    );
  }

  const displaySlot = activeSlot;

  return (
    <>
      {/* Timeslot Selector */}
      <div className="bg-neutral-50 border-b border-neutral-200 py-2 px-6 sticky top-0 z-50">
        <div className="max-w-content mx-auto flex items-center justify-between gap-4">
          <span className="text-xs text-text-secondary font-medium">
            {displaySlot.day_label} &middot; {displaySlot.time_range}
          </span>
          <select
            value={overrideSlot ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              setOverrideSlot(val ? Number(val) : null);
            }}
            className="text-xs bg-white border border-neutral-200 rounded px-2 py-1 text-text-secondary focus:outline-none focus:ring-1 focus:ring-brand/40"
          >
            <option value="">Auto (current time)</option>
            {timeslots.map((s) => (
              <option key={s.timeslot_number} value={s.timeslot_number}>
                #{s.timeslot_number} — {s.day_label} {s.time_range}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#264D38] pt-20 pb-16 md:pt-28 md:pb-24">
        <div
          className="absolute inset-0 -z-0"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% 0%, #31664A 0%, #1a3d2d 50%, #162e23 100%)',
          }}
        />
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[#4a9e6e]/10 blur-3xl" />
        <div className="absolute bottom-[-30%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#31664A]/20 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        <div className="max-w-content mx-auto px-6 relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            {displaySlot.badge_text && (
              <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/80 text-sm font-medium mb-6 backdrop-blur-sm">
                {displaySlot.badge_text}
              </div>
            )}

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-white mb-5 leading-[1.1] tracking-tight">
              {displaySlot.headline}
            </h1>

            <p className="text-base md:text-lg text-white/70 leading-relaxed max-w-xl mx-auto">
              {displaySlot.subtext}
            </p>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      {displaySlot.feature_cards.length > 0 && (
        <section className="py-16 md:py-20 bg-white">
          <div className="max-w-content mx-auto px-6">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-text-secondary mb-8">
                What Levelset Does
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {displaySlot.feature_cards.map((card, i) => (
                  <div
                    key={i}
                    className="p-6 rounded-xl bg-[#f6fffa] border border-[#31664A]/10"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#31664A] flex items-center justify-center mb-4">
                      {ICONS[card.icon] || ICONS['chart-bar']}
                    </div>
                    <h3 className="text-[16px] font-heading font-bold text-text-primary mb-2">
                      {card.title}
                    </h3>
                    <p className="text-text-secondary text-sm leading-relaxed">
                      {card.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Lead Capture Form */}
      <section className="py-16 md:py-20 bg-[#f6fffa]">
        <div className="max-w-content mx-auto px-6">
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-heading font-bold text-text-primary mb-3">
                Claim Your Exclusive Offer
              </h2>
              <p className="text-text-secondary text-sm">
                Leave your info and we&apos;ll send you everything you need to get started — exclusively for Approach attendees.
              </p>
            </div>
            <LeadForm activeTimeslot={displaySlot.timeslot_number} />
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-content mx-auto px-6 text-center">
          <p className="text-sm text-text-secondary max-w-md mx-auto">
            Built by CFA operators, for CFA operators. Levelset is already live with restaurants that helped shape the platform from day one.
          </p>
        </div>
      </section>
    </>
  );
}
```

**Step 3: Commit**

```bash
git add apps/marketing/src/app/the-approach/page.tsx apps/marketing/src/app/the-approach/TheApproachPage.tsx
git commit -m "feat: add /the-approach event page with password gate, timeslot content, and lead form"
```

---

## Task 6: Apply Migration + Seed + Verify

**Step 1: Apply the migration to Supabase**

```bash
# Use the Supabase MCP tool or dashboard to apply:
# supabase/migrations/20260227_the_approach.sql
```

**Step 2: Seed the timeslot content**

```bash
npx tsx scripts/seed-the-approach-content.ts
```

Expected output: 8 timeslots seeded successfully.

**Step 3: Verify locally**

```bash
pnpm dev:marketing
```

1. Navigate to `http://localhost:3001/the-approach`
2. Verify password gate appears
3. Enter "levelset" → page unlocks
4. Verify timeslot dropdown shows all 8 slots
5. Toggle between timeslots → verify hero/cards update
6. Fill out the form → verify submission works
7. Check `leads` table in Supabase for the entry (should have `source: 'the_approach'`)

---

## Task 7: Typecheck + Build

**Step 1: Run typecheck**

```bash
pnpm typecheck
```

Expected: No new errors.

**Step 2: Build marketing app**

```bash
pnpm --filter marketing build
```

Expected: Build succeeds.

**Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address typecheck/build issues for the-approach page"
```

---

## Summary of Files

| File | Action |
|------|--------|
| `supabase/migrations/20260227_the_approach.sql` | CREATE — `the_approach` + `leads` tables + RLS |
| `scripts/seed-the-approach-content.ts` | CREATE — Seed 8 timeslots |
| `apps/marketing/src/app/api/the-approach/content/route.ts` | CREATE — GET timeslot content |
| `apps/marketing/src/app/api/the-approach/submit/route.ts` | CREATE — POST lead form |
| `apps/marketing/src/app/the-approach/page.tsx` | CREATE — Page wrapper + metadata |
| `apps/marketing/src/app/the-approach/TheApproachPage.tsx` | CREATE — Client component (all UI) |

No existing files are modified.
