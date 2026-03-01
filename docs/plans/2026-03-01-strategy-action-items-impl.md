# Strategy Action Items Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Address all action items from `docs/strategy/action-items.md` — Approach playbook terminology fixes, marketing site copy fixes, new feature pages, Coming Soon pages, and category narrative pages.

**Architecture:** The marketing site is a Next.js App Router app at `apps/marketing/`. Feature pages use a dynamic route at `apps/marketing/src/app/features/[slug]/page.tsx` that reads from two registries: `features.ts` (metadata) and `feature-content.ts` (page content). New features are added by appending to both files. Coming Soon and category pages will be new routes.

**Tech Stack:** Next.js (App Router), TypeScript, Tailwind CSS, existing marketing site component library

---

## Part 1: Approach Playbook Terminology Fixes

### Task 1: Fix PEA/CARES References in Approach Playbook

**Files:**
- Modify: `docs/plans/2026-02-26-the-approach-playbook.md`

**Step 1: Fix line 130 — "PEA ratings" → "Positional Excellence ratings"**

Replace:
```
| **Inconsistent team evaluation** | Different managers rate people differently. No standard for "what good looks like." | PEA ratings use position-specific criteria with a clear 1-3 scale. Every rater uses the same rubric. |
```
With:
```
| **Inconsistent team evaluation** | Different managers rate people differently. No standard for "what good looks like." | Positional Excellence ratings use position-specific criteria with a clear 1-3 scale. Every rater uses the same rubric. |
```

**Step 2: Fix line 133 — "CARES progressive discipline" → "Progressive discipline"**

Replace:
```
| **Discipline inconsistency** | One manager gives a warning, another fires for the same thing. | CARES progressive discipline system ensures consistent, documented accountability with recommended actions at each threshold. |
```
With:
```
| **Discipline inconsistency** | One manager gives a warning, another fires for the same thing. | Progressive discipline system ensures consistent, documented accountability with recommended actions at each threshold. |
```

**Step 3: Fix line 137 — "PEA delivers exactly this" → "Positional Excellence delivers exactly this"**

Replace:
```
| **Generational expectations** | Gen Z wants clear expectations, frequent feedback, and visible growth paths. | PEA delivers exactly this: clear criteria per position, regular ratings, and visible progress. |
```
With:
```
| **Generational expectations** | Gen Z wants clear expectations, frequent feedback, and visible growth paths. | Positional Excellence delivers exactly this: clear criteria per position, regular ratings, and visible progress. |
```

**Step 4: Fix line 171 — "the PEA framework, CARES discipline" → "Positional Excellence, progressive discipline"**

Replace:
```
- You understand FOH/BOH, the PEA framework, CARES discipline, and shift leadership development.
```
With:
```
- You understand FOH/BOH, Positional Excellence, progressive discipline, and shift leadership development.
```

**Step 5: Fix line 205 — "That's literally what PEA ratings deliver" → "That's literally what Positional Excellence ratings deliver"**

Replace:
```
- After **Tim Elmore's generational session**: "He mentioned Gen Z wants frequent feedback and clear expectations. That's literally what PEA ratings deliver — position-specific criteria rated regularly."
```
With:
```
- After **Tim Elmore's generational session**: "He mentioned Gen Z wants frequent feedback and clear expectations. That's literally what Positional Excellence ratings deliver — position-specific criteria rated regularly."
```

**Step 6: Fix line 225 — "Show PEA ratings" → "Show positional ratings"**

Replace:
```
3. Show **PEA ratings** — "Your supervisors rate on your exact positions using your exact criteria. Register, drive-thru, grill — whatever your restaurant runs."
```
With:
```
3. Show **positional ratings** — "Your supervisors rate on your exact positions using your exact criteria. Register, drive-thru, grill — whatever your restaurant runs."
```

**Step 7: Fix line 616 — "PEA ratings deliver exactly that" → "Positional Excellence ratings deliver exactly that"**

Replace:
```
| 11:30am+ | **Lab: Generational Coaching (Elmore)** | Gen Z needs different feedback styles | "Elmore said Gen Z wants frequent feedback and clear expectations. PEA ratings deliver exactly that — position-specific criteria rated regularly. They can see their own growth." |
```
With:
```
| 11:30am+ | **Lab: Generational Coaching (Elmore)** | Gen Z needs different feedback styles | "Elmore said Gen Z wants frequent feedback and clear expectations. Positional Excellence ratings deliver exactly that — position-specific criteria rated regularly. They can see their own growth." |
```

**Step 8: Fix line 618 — "Your PEA data proves" → "Your ratings data proves"**

Replace:
```
| 3:15pm+ | **Nido Qubein (employer branding) + Andrada (talent strategy)** | How to position their restaurant as THE place to work | "Qubein talked about building a brand people choose. Your PEA data proves you invest in people — it's employer branding backed by data, not just slogans." |
```
With:
```
| 3:15pm+ | **Nido Qubein (employer branding) + Andrada (talent strategy)** | How to position their restaurant as THE place to work | "Qubein talked about building a brand people choose. Your ratings data proves you invest in people — it's employer branding backed by data, not just slogans." |
```

**Step 9: Commit**

```bash
git add docs/plans/2026-02-26-the-approach-playbook.md
git commit -m "fix: replace PEA/CARES with correct CFA terminology in Approach playbook"
```

---

### Task 2: Fix PEA References in Marketing Site Internal Files

**Files:**
- Modify: `apps/marketing/PRODUCT_CONTEXT.md`
- Modify: `apps/marketing/src/app/the-approach/TheApproachPage.tsx` (comment only)
- Modify: `apps/marketing/src/components/sections/FeaturesOverview.tsx` (comment only)

**Step 1: Fix PRODUCT_CONTEXT.md line 13 — header**

Replace:
```
### 1. Positional Ratings (PEA)
```
With:
```
### 1. Positional Ratings (Positional Excellence)
```

**Step 2: Fix PRODUCT_CONTEXT.md line 75 — glossary**

Replace:
```
- **PEA**: Positional Excellence Assessment — the rating system
```
With:
```
- **Positional Excellence**: The rating system — position-based performance evaluation. (Note: "PEA" is a Reece Howard org-specific term, not CFA-wide.)
```

**Step 3: Fix TheApproachPage.tsx line 35 — comment**

Replace:
```
/* Rocket Launch — matches dashboard RocketLaunchOutlined (Ratings/PEA) */
```
With:
```
/* Rocket Launch — matches dashboard RocketLaunchOutlined (Positional Ratings) */
```

**Step 4: Fix FeaturesOverview.tsx line 9 — comment**

Replace:
```
/* Rocket Launch — matches dashboard RocketLaunchOutlined (Ratings/PEA) */
```
With:
```
/* Rocket Launch — matches dashboard RocketLaunchOutlined (Positional Ratings) */
```

**Step 5: Commit**

```bash
git add apps/marketing/PRODUCT_CONTEXT.md apps/marketing/src/app/the-approach/TheApproachPage.tsx apps/marketing/src/components/sections/FeaturesOverview.tsx
git commit -m "fix: replace PEA references with Positional Excellence in marketing files"
```

---

## Part 2: Marketing Site Minor Copy Fixes

### Task 3: Fix Screenshot Alt Text in Feature Content

**Files:**
- Modify: `apps/marketing/src/lib/feature-content.ts:48`

**Step 1: Fix alt text**

Replace:
```typescript
        alt: 'Positional Excellence dashboard showing color-coded team ratings by position',
```
With:
```typescript
        alt: 'Positional Ratings dashboard showing color-coded team ratings by position',
```

**Step 2: Commit**

```bash
git add apps/marketing/src/lib/feature-content.ts
git commit -m "fix: correct alt text from 'Positional Excellence' to 'Positional Ratings'"
```

---

### Task 4: Update Billing Constants Feature Names

**Files:**
- Modify: `packages/shared/src/billing/constants.ts:33-34`

These are internal billing names that surface in feature group displays. Update labels and descriptions for clarity.

**Step 1: Update Positional Excellence labels**

Replace:
```typescript
      { key: 'positional_excellence', label: 'Positional Excellence Dashboard', description: 'PE ratings and analytics' },
      { key: 'positional_excellence_classic', label: 'Positional Excellence Classic', description: 'Classic PE interface' },
```
With:
```typescript
      { key: 'positional_excellence', label: 'Positional Ratings Dashboard', description: 'Position-based ratings and analytics' },
      { key: 'positional_excellence_classic', label: 'Positional Ratings Classic', description: 'Classic ratings interface' },
```

**Step 2: Update Operational Excellence label**

Replace:
```typescript
      { key: 'operational_excellence', label: 'Operational Excellence', description: 'OE pillar analytics and scoring' },
```
With:
```typescript
      { key: 'operational_excellence', label: 'OE Pillars', description: 'Operational Excellence pillar analytics and scoring' },
```

**Step 3: Commit**

```bash
git add packages/shared/src/billing/constants.ts
git commit -m "fix: update billing feature labels to match marketing terminology"
```

---

### Task 5: Update Hero Badge — "Now in Early Access" → "Built for Chick-fil-A"

**Files:**
- Modify: `apps/marketing/src/components/sections/Hero.tsx:29`

**Step 1: Update badge text**

Replace:
```tsx
            Now in Early Access
```
With:
```tsx
            Built Exclusively for Chick-fil-A
```

**Step 2: Commit**

```bash
git add apps/marketing/src/components/sections/Hero.tsx
git commit -m "fix: update hero badge from 'Early Access' to 'Built Exclusively for Chick-fil-A'"
```

---

## Part 3: New Feature Pages (Market Now)

These features are live or close to polished and need individual marketing pages. Each task adds the feature to the `FEATURES` array in `features.ts` and adds full page content in `feature-content.ts`.

### Task 6: Add OE Pillars Feature Page

**Files:**
- Modify: `apps/marketing/src/lib/features.ts`
- Modify: `apps/marketing/src/lib/feature-content.ts`

**Step 1: Add to features.ts FEATURES array (before the closing bracket `];`)**

Add after the `'levi-ai'` entry:
```typescript
  {
    slug: 'oe-pillars',
    name: 'OE Pillars',
    shortDescription: 'See your operational excellence score across all five CFA pillars.',
    icon: 'bar-chart',
    tier: 'pro',
    screenshotReady: false,
  },
```

**Step 2: Add to feature-content.ts CONTENT object (before the closing `};` of the CONTENT record)**

Add after the `'mobile-app'` entry:
```typescript
  'oe-pillars': {
    tagline:
      'Your five pillars of operational excellence — measured, tracked, and visible to every leader.',
    problem:
      'CFA measures operational excellence across five pillars, but most operators track them loosely — if at all. There\'s no single place to see how your team is performing against each pillar, and no way to connect those pillars back to the individual position-level performance that drives them.',
    solution:
      'Levelset aggregates your positional rating data into the five OE pillars — Great Food, Quick & Accurate, Creating Moments, Caring Interactions, and Inviting Atmosphere — automatically. Each pillar score is calculated from the position criteria that map to it, so when your team improves on mapped positions, the pillar scores reflect it. Leaders see one dashboard that connects individual performance to operational outcomes.',
    capabilities: [
      {
        icon: 'bar-chart',
        title: 'Five Pillars, One Dashboard',
        description:
          'See your overall OE score and each individual pillar at a glance. Know exactly where your operation is strong and where it needs focus.',
      },
      {
        icon: 'link',
        title: 'Connected to Position Ratings',
        description:
          'Pillar scores aren\'t manually entered — they\'re calculated from your positional excellence data. Improve a position, and the pillar score updates automatically.',
      },
      {
        icon: 'trending-up',
        title: 'Track Progress Over Time',
        description:
          'See how each pillar has trended over weeks and months. Identify whether your coaching investments are moving the needle.',
      },
      {
        icon: 'users',
        title: 'Aligned to CFA\'s Framework',
        description:
          'The five pillars mirror Chick-fil-A\'s operational excellence framework — so your data speaks the same language as your business.',
      },
    ],
    screenshots: [],
  },
```

**Step 3: Commit**

```bash
git add apps/marketing/src/lib/features.ts apps/marketing/src/lib/feature-content.ts
git commit -m "feat: add OE Pillars feature page to marketing site"
```

---

### Task 7: Add Org Chart Feature Page

**Files:**
- Modify: `apps/marketing/src/lib/features.ts`
- Modify: `apps/marketing/src/lib/feature-content.ts`

**Step 1: Add to features.ts FEATURES array**

```typescript
  {
    slug: 'org-chart',
    name: 'Org Chart',
    shortDescription: 'See your team structure at a glance — who reports to whom.',
    icon: 'git-branch',
    tier: 'pro',
    screenshotReady: false,
  },
```

**Step 2: Add to feature-content.ts CONTENT object**

```typescript
  'org-chart': {
    tagline:
      'Your team structure, visible to everyone — so new team members know who to go to and leaders know who they\'re responsible for.',
    problem:
      'New team members don\'t know the chain of command. A Team Lead asks "who\'s my Director?" The org structure lives in people\'s heads — or on a whiteboard that hasn\'t been updated in three months. When someone gets promoted or someone leaves, nobody updates the chart because there isn\'t one.',
    solution:
      'Levelset automatically generates your org chart from your roster data. Promote someone? The chart updates. Hire a new Team Lead? They appear in the right spot. Every team member can see the structure, and every leader knows exactly who falls under their responsibility.',
    capabilities: [
      {
        icon: 'git-branch',
        title: 'Auto-Generated from Your Roster',
        description:
          'No manual drawing or dragging boxes. The org chart builds itself from your employee roles and reporting relationships.',
      },
      {
        icon: 'refresh-cw',
        title: 'Always Up to Date',
        description:
          'Promotions, new hires, and terminations update the chart automatically. It\'s never stale.',
      },
      {
        icon: 'eye',
        title: 'Visible to the Whole Team',
        description:
          'Team members can see where they sit in the organization and who they report to — great for onboarding and orientation.',
      },
    ],
    screenshots: [],
  },
```

**Step 3: Commit**

```bash
git add apps/marketing/src/lib/features.ts apps/marketing/src/lib/feature-content.ts
git commit -m "feat: add Org Chart feature page to marketing site"
```

---

### Task 8: Add Documents Hub Feature Page

**Files:**
- Modify: `apps/marketing/src/lib/features.ts`
- Modify: `apps/marketing/src/lib/feature-content.ts`

**Step 1: Add to features.ts FEATURES array**

```typescript
  {
    slug: 'documents',
    name: 'Documents',
    shortDescription: 'Your organization\'s knowledge hub — policies, guides, and resources.',
    icon: 'folder',
    tier: 'pro',
    screenshotReady: false,
  },
```

**Step 2: Add to feature-content.ts CONTENT object**

```typescript
  'documents': {
    tagline:
      'Stop digging through shared drives and binders. Your team\'s important documents live here.',
    problem:
      'Your opening checklist is in a Google Doc. Your training materials are in a binder. Your policies are in an email from six months ago. When a new team member asks "where do I find the uniform policy?" nobody has the same answer. Information is scattered, outdated, and impossible to find when you need it.',
    solution:
      'Levelset Documents gives your organization a single, organized hub for every document your team needs. Upload policies, training guides, standard operating procedures, and reference materials. Organize by category, assign to roles, and know that every team member has access to the same up-to-date information.',
    capabilities: [
      {
        icon: 'folder',
        title: 'Organized by Category',
        description:
          'Group documents by topic — policies, training, SOPs, reference materials. No more hunting through a messy shared drive.',
      },
      {
        icon: 'upload',
        title: 'Upload Anything',
        description:
          'PDFs, images, Word docs, spreadsheets — upload whatever your team needs. Everything is stored and accessible from one place.',
      },
      {
        icon: 'users',
        title: 'Role-Based Visibility',
        description:
          'Control which documents are visible to which roles. Leadership docs stay with leadership. Team-wide policies are available to everyone.',
      },
      {
        icon: 'search',
        title: 'Always Findable',
        description:
          'Search across all your documents instantly. When someone asks "where\'s the food safety policy?" the answer is always the same: Levelset.',
      },
    ],
    screenshots: [],
  },
```

**Step 3: Commit**

```bash
git add apps/marketing/src/lib/features.ts apps/marketing/src/lib/feature-content.ts
git commit -m "feat: add Documents Hub feature page to marketing site"
```

---

### Task 9: Add Pay System Feature Page

**Files:**
- Modify: `apps/marketing/src/lib/features.ts`
- Modify: `apps/marketing/src/lib/feature-content.ts`

**Step 1: Add to features.ts FEATURES array**

```typescript
  {
    slug: 'pay',
    name: 'Pay System',
    shortDescription: 'Transparent, performance-linked pay that your team can see and trust.',
    icon: 'dollar-sign',
    tier: 'pro',
    screenshotReady: false,
  },
```

**Step 2: Add to feature-content.ts CONTENT object**

```typescript
  'pay': {
    tagline:
      'Pay that makes sense — tied to performance, role, and availability. No more "why does she make more than me?"',
    problem:
      'Pay decisions happen in a back office with no clear logic. Team members don\'t understand why they make what they make. Leaders can\'t explain it either. When someone asks for a raise, there\'s no system to reference — it\'s a gut call. And the team talks, so inconsistencies breed resentment.',
    solution:
      'Levelset\'s pay system lets you define transparent rules: base pay by role, adjustments for availability (full-time vs. part-time), bumps for performance zone (green, yellow, red), and premiums for certifications. The system calculates suggested pay automatically. Team members see a clear connection between their performance and their paycheck.',
    capabilities: [
      {
        icon: 'settings',
        title: 'Configurable Pay Rules',
        description:
          'Define base rates by role, then layer adjustments for availability, performance zone, and certifications. You set the rules — the system applies them consistently.',
      },
      {
        icon: 'link',
        title: 'Connected to Performance',
        description:
          'When a team member moves from yellow to green, their suggested pay updates. Performance has a direct, visible impact on compensation.',
      },
      {
        icon: 'eye',
        title: 'Transparent to Leaders',
        description:
          'Leaders can see exactly how pay is calculated for any team member. No black boxes, no guessing.',
      },
      {
        icon: 'shield',
        title: 'Fair and Documented',
        description:
          'Every pay rate has a clear rationale. When a team member asks "why?" you have an answer backed by rules, not opinion.',
      },
    ],
    screenshots: [],
  },
```

**Step 3: Commit**

```bash
git add apps/marketing/src/lib/features.ts apps/marketing/src/lib/feature-content.ts
git commit -m "feat: add Pay System feature page to marketing site"
```

---

### Task 10: Add Goal Tracking Feature Page

**Files:**
- Modify: `apps/marketing/src/lib/features.ts`
- Modify: `apps/marketing/src/lib/feature-content.ts`

**Step 1: Add to features.ts FEATURES array**

```typescript
  {
    slug: 'goal-tracking',
    name: 'Goal Tracking',
    shortDescription: 'Set goals at every level — employee, team, location, org.',
    icon: 'target',
    tier: 'pro',
    screenshotReady: false,
  },
```

**Step 2: Add to feature-content.ts CONTENT object**

```typescript
  'goal-tracking': {
    tagline:
      'From individual growth goals to org-wide targets — set them, track them, and tie them to real performance.',
    problem:
      'Goals get set in a meeting and forgotten by the next week. There\'s no system to track progress, no connection to actual performance data, and no accountability. When evaluation time comes, nobody remembers what the goals were — let alone whether they were met.',
    solution:
      'Levelset Goal Tracking lets you set goals at every level: individual team members, teams, locations, and the whole organization. Goals connect to your performance data — so progress updates itself as ratings come in. Tie goals to evaluations so review conversations are grounded in what was actually accomplished.',
    capabilities: [
      {
        icon: 'target',
        title: 'Goals at Every Level',
        description:
          'Set goals for individual team members, teams, locations, or the entire organization. Everyone knows what they\'re working toward.',
      },
      {
        icon: 'link',
        title: 'Connected to Performance Data',
        description:
          'Goals can reference positional ratings, OE pillar scores, or custom metrics. Progress updates as real data comes in — no manual check-ins needed.',
      },
      {
        icon: 'calendar-text',
        title: 'Tied to Evaluations',
        description:
          'When it\'s evaluation time, the team member\'s goals and their progress are right there. Reviews become conversations about real outcomes.',
      },
      {
        icon: 'trending-up',
        title: 'Track Progress Over Time',
        description:
          'See how goals are trending — on track, at risk, or completed. Leaders can intervene early instead of discovering missed targets at year-end.',
      },
    ],
    screenshots: [],
  },
```

**Step 3: Commit**

```bash
git add apps/marketing/src/lib/features.ts apps/marketing/src/lib/feature-content.ts
git commit -m "feat: add Goal Tracking feature page to marketing site"
```

---

### Task 11: Add Development Plans Feature Page

**Files:**
- Modify: `apps/marketing/src/lib/features.ts`
- Modify: `apps/marketing/src/lib/feature-content.ts`

**Step 1: Add to features.ts FEATURES array**

```typescript
  {
    slug: 'development-plans',
    name: 'Development Plans',
    shortDescription: 'Build the roadmap for every team member\'s growth.',
    icon: 'map',
    tier: 'pro',
    screenshotReady: false,
  },
```

**Step 2: Add to feature-content.ts CONTENT object**

```typescript
  'development-plans': {
    tagline:
      'Every team member gets a roadmap. Every leader knows the next step. Growth stops being a conversation and becomes a plan.',
    problem:
      'A team member asks "what do I need to do to become a Team Lead?" and the answer depends on which leader they ask. Development conversations happen verbally and never get documented. There\'s no follow-through because there\'s no system. Promising team members leave because they don\'t see a path forward.',
    solution:
      'Levelset Development Plans give every team member a documented, trackable path to growth. Define milestones, set checkpoints, and tie the plan to real performance data. From Team Member to Trainer, Trainer to Team Lead, Team Lead to Director — every step is visible, every checkpoint is tracked, and every leader is aligned on what "ready" looks like.',
    capabilities: [
      {
        icon: 'map',
        title: 'Custom Roadmaps per Employee',
        description:
          'Build personalized development plans with milestones and checkpoints. Each team member sees exactly what they need to do to advance.',
      },
      {
        icon: 'check-circle',
        title: 'Milestone Checkpoints',
        description:
          'Define what "ready" looks like at each stage. Leaders mark checkpoints as complete, and progress is visible to the team member.',
      },
      {
        icon: 'link',
        title: 'Connected to Ratings and Evaluations',
        description:
          'Development plans reference real performance data. When a team member hits green on all Drive-Thru criteria, it shows in their plan — automatically.',
      },
      {
        icon: 'git-branch',
        title: 'Role-to-Role Advancement',
        description:
          'Define advancement paths: Team Member → Trainer → Team Lead → Director. Each transition has clear requirements so promotions are earned, not guessed.',
      },
    ],
    screenshots: [],
  },
```

**Step 3: Commit**

```bash
git add apps/marketing/src/lib/features.ts apps/marketing/src/lib/feature-content.ts
git commit -m "feat: add Development Plans feature page to marketing site"
```

---

## Part 4: Coming Soon Pages

Coming Soon pages need a different template since the features aren't built yet. Create a reusable Coming Soon template and add pages for: Development Profiles, Pathway Tracking, Retention Analytics, Customer Feedback, Tasks.

### Task 12: Create Coming Soon Page Template

**Files:**
- Create: `apps/marketing/src/components/templates/ComingSoonTemplate.tsx`

**Step 1: Create the component**

```tsx
'use client';

import { TrialCTA } from '@/components/cta/TrialCTA';

interface ComingSoonFeature {
  name: string;
  tagline: string;
  description: string;
  highlights: string[];
}

export function ComingSoonTemplate({ feature }: { feature: ComingSoonFeature }) {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#264D38] pt-32 pb-16 md:pt-44 md:pb-24">
        <div
          className="absolute inset-0 -z-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 0%, #31664A 0%, #1a3d2d 50%, #162e23 100%)',
          }}
        />
        <div className="max-w-content mx-auto px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/80 text-sm font-medium mb-8 backdrop-blur-sm">
              Coming Soon
            </div>
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6 leading-[1.08] tracking-tight">
              {feature.name}
            </h1>
            <p className="text-lg md:text-xl text-white/70 mb-8 leading-relaxed max-w-2xl mx-auto">
              {feature.tagline}
            </p>
          </div>
        </div>
      </section>

      {/* Description */}
      <section className="py-16 md:py-24">
        <div className="max-w-content mx-auto px-6">
          <div className="max-w-3xl mx-auto">
            <p className="text-lg text-gray-600 leading-relaxed mb-12">
              {feature.description}
            </p>

            <h2 className="text-2xl font-heading font-bold text-gray-900 mb-6">
              What to Expect
            </h2>
            <ul className="space-y-4">
              {feature.highlights.map((highlight, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-[#264D38] shrink-0" />
                  <span className="text-gray-700">{highlight}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-content mx-auto px-6 text-center">
          <h2 className="text-2xl font-heading font-bold text-gray-900 mb-4">
            Get Started with Levelset Today
          </h2>
          <p className="text-gray-600 mb-8 max-w-xl mx-auto">
            Start your free 30-day Pro trial and be the first to access {feature.name} when it launches.
          </p>
          <TrialCTA />
        </div>
      </section>
    </>
  );
}
```

**Step 2: Commit**

```bash
git add apps/marketing/src/components/templates/ComingSoonTemplate.tsx
git commit -m "feat: add Coming Soon page template component"
```

---

### Task 13: Add Coming Soon Pages (5 Features)

**Files:**
- Create: `apps/marketing/src/app/coming-soon/development-profiles/page.tsx`
- Create: `apps/marketing/src/app/coming-soon/pathway-tracking/page.tsx`
- Create: `apps/marketing/src/app/coming-soon/retention-analytics/page.tsx`
- Create: `apps/marketing/src/app/coming-soon/customer-feedback/page.tsx`
- Create: `apps/marketing/src/app/coming-soon/tasks/page.tsx`

**Step 1: Create Development Profiles page**

```tsx
// apps/marketing/src/app/coming-soon/development-profiles/page.tsx
import type { Metadata } from 'next';
import { ComingSoonTemplate } from '@/components/templates/ComingSoonTemplate';

export const metadata: Metadata = {
  title: 'Development Profiles — Coming Soon',
  description: 'Understand the whole person — DISC personality insights combined with performance data.',
};

export default function DevelopmentProfilesPage() {
  return (
    <ComingSoonTemplate
      feature={{
        name: 'Development Profiles',
        tagline: 'Understand the whole person — not just their performance numbers.',
        description:
          'Development Profiles combine personality insights with Levelset performance data to give leaders a complete picture of every team member. Powered by DISC personality assessments, profiles reveal communication preferences, conflict styles, collaboration tendencies, and cultural fit — layered on top of ratings history, discipline record, and development plan progress.',
        highlights: [
          'DISC personality assessments integrated directly into Levelset',
          'Communication style, conflict approach, and collaboration preferences for every team member',
          'Combined with ratings, discipline, evaluations, and development plan data into one holistic profile',
          'Insights surface during 1-on-1s and coaching conversations to help leaders connect',
          'Cultural fit indicators to help with hiring and team composition decisions',
        ],
      }}
    />
  );
}
```

**Step 2: Create Pathway Tracking page**

```tsx
// apps/marketing/src/app/coming-soon/pathway-tracking/page.tsx
import type { Metadata } from 'next';
import { ComingSoonTemplate } from '@/components/templates/ComingSoonTemplate';

export const metadata: Metadata = {
  title: 'Pathway Tracking — Coming Soon',
  description: 'Define career pathways and track every team member\'s progression.',
};

export default function PathwayTrackingPage() {
  return (
    <ComingSoonTemplate
      feature={{
        name: 'Pathway Tracking',
        tagline: 'Every team member sees where they\'re going — and what it takes to get there.',
        description:
          'Pathway Tracking defines career progressions within your organization and tracks each team member\'s journey along them. From Team Member to Trainer, Trainer to Team Lead, Team Lead to Director — every transition has clear requirements, milestones, and timelines. Team members see their progress. Leaders see who\'s ready for more.',
        highlights: [
          'Define custom career pathways with clear advancement requirements',
          'Track individual progress along each pathway with milestones and timelines',
          'Connected to Development Plans — pathway steps become plan milestones',
          'Identify who\'s ready for promotion based on data, not gut feel',
          'Team members see their own progression — driving retention through visibility',
        ],
      }}
    />
  );
}
```

**Step 3: Create Retention Analytics page**

```tsx
// apps/marketing/src/app/coming-soon/retention-analytics/page.tsx
import type { Metadata } from 'next';
import { ComingSoonTemplate } from '@/components/templates/ComingSoonTemplate';

export const metadata: Metadata = {
  title: 'Retention Analytics — Coming Soon',
  description: 'Data-driven insights into who\'s staying, who\'s at risk, and why.',
};

export default function RetentionAnalyticsPage() {
  return (
    <ComingSoonTemplate
      feature={{
        name: 'Retention Analytics',
        tagline: 'Stop guessing who\'s about to leave. Start seeing the patterns before it\'s too late.',
        description:
          'Retention Analytics gives you a dashboard for understanding your team\'s tenure, turnover patterns, and at-risk indicators. See which roles, shifts, or leaders have the highest turnover. Identify team members whose ratings are declining — a leading indicator of disengagement. Make retention a strategy, not a reaction.',
        highlights: [
          'Tenure and turnover dashboards by role, shift, and location',
          'At-risk employee identification based on rating trends and engagement signals',
          'Historical retention patterns — see seasonality and identify root causes',
          'Connected to ratings, discipline, and development data for full-picture analysis',
          'Actionable insights: know who to coach, who to promote, and who needs attention',
        ],
      }}
    />
  );
}
```

**Step 4: Create Customer Feedback page**

```tsx
// apps/marketing/src/app/coming-soon/customer-feedback/page.tsx
import type { Metadata } from 'next';
import { ComingSoonTemplate } from '@/components/templates/ComingSoonTemplate';

export const metadata: Metadata = {
  title: 'Customer Feedback — Coming Soon',
  description: 'Multi-channel customer feedback aggregated into one dashboard.',
};

export default function CustomerFeedbackPage() {
  return (
    <ComingSoonTemplate
      feature={{
        name: 'Customer Feedback',
        tagline: 'Every review, every comment, every channel — in one place, connected to your team.',
        description:
          'Customer Feedback aggregates reviews and feedback from multiple channels — Google, Yelp, and more — into a single dashboard. See trends, identify operational issues, and connect guest feedback to your team\'s performance data. When a review mentions slow Drive-Thru service, you can cross-reference with your Drive-Thru ratings to pinpoint the root cause.',
        highlights: [
          'Aggregate reviews from Google, Yelp, and additional channels',
          'Trend analysis to spot recurring themes in guest feedback',
          'Connect feedback to operational metrics and team performance data',
          'AI-powered sentiment analysis to surface what matters most',
          'Track response rates and resolution times across all channels',
        ],
      }}
    />
  );
}
```

**Step 5: Create Tasks page**

```tsx
// apps/marketing/src/app/coming-soon/tasks/page.tsx
import type { Metadata } from 'next';
import { ComingSoonTemplate } from '@/components/templates/ComingSoonTemplate';

export const metadata: Metadata = {
  title: 'Tasks — Coming Soon',
  description: 'AI-integrated task management connected to goals, meetings, and development plans.',
};

export default function TasksPage() {
  return (
    <ComingSoonTemplate
      feature={{
        name: 'Tasks',
        tagline: 'Task management that\'s connected to everything else — because tasks don\'t exist in a vacuum.',
        description:
          'Levelset Tasks connects your daily to-dos to the bigger picture. Tasks link to goals (completing tasks drives goal progress), development plans (plan steps become trackable tasks), and meetings (action items become tasks automatically). Combined with Levi AI, task management becomes intelligent — Levi can create tasks, remind leaders about overdue items, and help prioritize what matters most.',
        highlights: [
          'Create, assign, and track tasks across your team',
          'Tasks connect to goals — completing tasks drives measurable goal progress',
          'Development plan steps become trackable tasks with deadlines',
          'Meeting action items automatically become tasks (with Meetings integration)',
          'Levi AI integration — ask Levi to create tasks, check status, or follow up',
        ],
      }}
    />
  );
}
```

**Step 6: Commit**

```bash
git add apps/marketing/src/app/coming-soon/
git commit -m "feat: add 5 Coming Soon pages (Dev Profiles, Pathway, Retention, Feedback, Tasks)"
```

---

## Part 5: Category Narrative Pages

### Task 14: Create Development Category Page

**Files:**
- Create: `apps/marketing/src/app/solutions/development/page.tsx`

This page ties together: Ratings, Evaluations, Development Plans, Goal Tracking, Pathway Tracking, Development Profiles.

**Step 1: Create page**

```tsx
// apps/marketing/src/app/solutions/development/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { TrialCTA } from '@/components/cta/TrialCTA';

export const metadata: Metadata = {
  title: 'Team Development — Levelset',
  description:
    'From first-day ratings to career advancement — every step of team development, connected.',
};

const FEATURES = [
  {
    name: 'Positional Ratings',
    href: '/features/positional-ratings',
    description: 'Rate every team member by position with objective, leader-aggregated data.',
    status: 'live',
  },
  {
    name: 'Evaluations',
    href: '/features/evaluations',
    description: 'Formal reviews backed by real performance data — not three months of memory.',
    status: 'live',
  },
  {
    name: 'Development Plans',
    href: '/features/development-plans',
    description: 'Custom roadmaps with milestones and checkpoints for every team member.',
    status: 'live',
  },
  {
    name: 'Goal Tracking',
    href: '/features/goal-tracking',
    description: 'Goals at every level — individual, team, location, and org — tied to real data.',
    status: 'live',
  },
  {
    name: 'Pathway Tracking',
    href: '/coming-soon/pathway-tracking',
    description: 'Career progression visibility from Team Member to Director.',
    status: 'coming-soon',
  },
  {
    name: 'Development Profiles',
    href: '/coming-soon/development-profiles',
    description: 'DISC personality insights combined with performance data.',
    status: 'coming-soon',
  },
];

export default function DevelopmentPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#264D38] pt-32 pb-16 md:pt-44 md:pb-24">
        <div
          className="absolute inset-0 -z-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 0%, #31664A 0%, #1a3d2d 50%, #162e23 100%)',
          }}
        />
        <div className="max-w-content mx-auto px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6 leading-[1.08] tracking-tight">
              Develop People, Not Paperwork
            </h1>
            <p className="text-lg md:text-xl text-white/70 leading-relaxed max-w-2xl mx-auto">
              From first-day ratings to career advancement, Levelset connects every step of team
              development. Ratings feed evaluations. Evaluations drive development plans. Plans set
              goals. Goals track progress. Nothing gets lost.
            </p>
          </div>
        </div>
      </section>

      {/* The Connected Story */}
      <section className="py-16 md:py-24">
        <div className="max-w-content mx-auto px-6">
          <div className="max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-heading font-bold text-gray-900 mb-6">
              Development That Actually Connects
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              Most operators track ratings in one place, do evaluations in another, and have
              development conversations that never get documented. Levelset connects the entire
              development journey so nothing falls through the cracks.
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((feature) => (
              <Link
                key={feature.name}
                href={feature.href}
                className="group block p-6 rounded-xl border border-gray-200 hover:border-[#264D38]/30 hover:shadow-lg transition-all"
              >
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#264D38] transition-colors">
                    {feature.name}
                  </h3>
                  {feature.status === 'coming-soon' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                      Coming Soon
                    </span>
                  )}
                </div>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-content mx-auto px-6 text-center">
          <h2 className="text-2xl font-heading font-bold text-gray-900 mb-4">
            Give Every Team Member a Clear Path Forward
          </h2>
          <p className="text-gray-600 mb-8 max-w-xl mx-auto">
            Start your free 30-day Pro trial and see how connected development changes the
            conversation.
          </p>
          <TrialCTA />
        </div>
      </section>
    </>
  );
}
```

**Step 2: Commit**

```bash
git add apps/marketing/src/app/solutions/development/page.tsx
git commit -m "feat: add Development category page to marketing site"
```

---

### Task 15: Create Operations Category Page

**Files:**
- Create: `apps/marketing/src/app/solutions/operations/page.tsx`

This page ties together: Scheduling, Forms, Setups, Documents, OE Pillars.

**Step 1: Create page**

```tsx
// apps/marketing/src/app/solutions/operations/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { TrialCTA } from '@/components/cta/TrialCTA';

export const metadata: Metadata = {
  title: 'Operations — Levelset',
  description:
    'Scheduling, forms, setups, documents, and OE — your daily operations, connected and consistent.',
};

const FEATURES = [
  {
    name: 'Scheduling',
    href: '/features/scheduling',
    description: 'Build schedules knowing exactly who can work which positions.',
    status: 'live',
  },
  {
    name: 'Setups',
    href: '/features/setups',
    description: 'Consistent shift setup assignments, regardless of who\'s leading.',
    status: 'live',
  },
  {
    name: 'Forms',
    href: '/features/forms',
    description: 'Custom digital forms your team fills out on their phone.',
    status: 'live',
  },
  {
    name: 'Documents',
    href: '/features/documents',
    description: 'Your organization\'s knowledge hub — policies, guides, and SOPs.',
    status: 'live',
  },
  {
    name: 'OE Pillars',
    href: '/features/oe-pillars',
    description: 'Operational excellence scores across all five CFA pillars.',
    status: 'live',
  },
];

export default function OperationsPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#264D38] pt-32 pb-16 md:pt-44 md:pb-24">
        <div
          className="absolute inset-0 -z-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 0%, #31664A 0%, #1a3d2d 50%, #162e23 100%)',
          }}
        />
        <div className="max-w-content mx-auto px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6 leading-[1.08] tracking-tight">
              Run Your Operation with Consistency
            </h1>
            <p className="text-lg md:text-xl text-white/70 leading-relaxed max-w-2xl mx-auto">
              Scheduling, shift setups, daily forms, documents, and operational excellence — all
              connected. Your best practices are baked into the system, not stuck in someone&apos;s
              head.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-16 md:py-24">
        <div className="max-w-content mx-auto px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((feature) => (
              <Link
                key={feature.name}
                href={feature.href}
                className="group block p-6 rounded-xl border border-gray-200 hover:border-[#264D38]/30 hover:shadow-lg transition-all"
              >
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#264D38] transition-colors mb-3">
                  {feature.name}
                </h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-content mx-auto px-6 text-center">
          <h2 className="text-2xl font-heading font-bold text-gray-900 mb-4">
            Consistency Across Every Shift, Every Day
          </h2>
          <p className="text-gray-600 mb-8 max-w-xl mx-auto">
            Start your free 30-day Pro trial and see how connected operations work.
          </p>
          <TrialCTA />
        </div>
      </section>
    </>
  );
}
```

**Step 2: Commit**

```bash
git add apps/marketing/src/app/solutions/operations/page.tsx
git commit -m "feat: add Operations category page to marketing site"
```

---

### Task 16: Create Intelligence Category Page

**Files:**
- Create: `apps/marketing/src/app/solutions/intelligence/page.tsx`

This page ties together: Levi AI, Retention Analytics, Customer Feedback, Team Overview (360 Overview).

**Step 1: Create page**

```tsx
// apps/marketing/src/app/solutions/intelligence/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { TrialCTA } from '@/components/cta/TrialCTA';

export const metadata: Metadata = {
  title: 'Intelligence — Levelset',
  description:
    'AI-powered insights, retention analytics, and customer feedback — your data, working for you.',
};

const FEATURES = [
  {
    name: 'Levi AI',
    href: '/features/levi-ai',
    description: 'Ask questions about your team in plain English and get instant, data-backed answers.',
    status: 'live',
  },
  {
    name: 'Retention Analytics',
    href: '/coming-soon/retention-analytics',
    description: 'Data-driven insights into who\'s staying, who\'s at risk, and why.',
    status: 'coming-soon',
  },
  {
    name: 'Customer Feedback',
    href: '/coming-soon/customer-feedback',
    description: 'Multi-channel feedback aggregated and connected to your operational data.',
    status: 'coming-soon',
  },
];

export default function IntelligencePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#264D38] pt-32 pb-16 md:pt-44 md:pb-24">
        <div
          className="absolute inset-0 -z-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 0%, #31664A 0%, #1a3d2d 50%, #162e23 100%)',
          }}
        />
        <div className="max-w-content mx-auto px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6 leading-[1.08] tracking-tight">
              Your Data, Working for You
            </h1>
            <p className="text-lg md:text-xl text-white/70 leading-relaxed max-w-2xl mx-auto">
              Levelset doesn&apos;t just store your team data — it puts it to work. Levi AI gives
              instant insights. Retention analytics spot problems before they become turnover.
              Customer feedback connects guest experience to team performance.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-16 md:py-24">
        <div className="max-w-content mx-auto px-6">
          <div className="max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-heading font-bold text-gray-900 mb-6">
              AI That Knows Your Team
            </h2>
            <p className="text-lg text-gray-600 leading-relaxed">
              Levi isn&apos;t a generic chatbot. It knows your employees, their ratings, their
              discipline history, and your operational metrics. Ask a question and get a specific
              answer from your actual data — not generic advice.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {FEATURES.map((feature) => (
              <Link
                key={feature.name}
                href={feature.href}
                className="group block p-6 rounded-xl border border-gray-200 hover:border-[#264D38]/30 hover:shadow-lg transition-all"
              >
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#264D38] transition-colors">
                    {feature.name}
                  </h3>
                  {feature.status === 'coming-soon' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                      Coming Soon
                    </span>
                  )}
                </div>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-content mx-auto px-6 text-center">
          <h2 className="text-2xl font-heading font-bold text-gray-900 mb-4">
            Stop Managing Data. Start Using It.
          </h2>
          <p className="text-gray-600 mb-8 max-w-xl mx-auto">
            Start your free 30-day Pro trial and meet Levi — your AI assistant that knows your team.
          </p>
          <TrialCTA />
        </div>
      </section>
    </>
  );
}
```

**Step 2: Commit**

```bash
git add apps/marketing/src/app/solutions/intelligence/page.tsx
git commit -m "feat: add Intelligence category page to marketing site"
```

---

## Execution Summary

| Part | Tasks | What It Covers |
|------|-------|---------------|
| **Part 1** | Tasks 1-2 | PEA/CARES fixes (8 playbook + 3 marketing occurrences) |
| **Part 2** | Tasks 3-5 | Minor copy fixes (alt text, billing constants, hero badge) |
| **Part 3** | Tasks 6-11 | 6 new feature pages (OE Pillars, Org Chart, Documents, Pay, Goals, Dev Plans) |
| **Part 4** | Tasks 12-13 | Coming Soon template + 5 Coming Soon pages |
| **Part 5** | Tasks 14-16 | 3 category narrative pages (Development, Operations, Intelligence) |

**Total: 16 tasks, ~30 files touched.**

### What This Plan Does NOT Cover (Per Action Items — Separate Plans)

These items from `docs/strategy/action-items.md` are NOT included because they require product builds, not marketing/content work:

- Screenshots for features with `screenshotReady: false` (need product builds first)
- Homepage content updates (stats section, feature overview expansion)
- Demo environment setup
- Task board updates in the admin UI
- Levi context document updates
- All product features listed in the roadmap (Scheduling, Forms, Development Plans, etc.)

These should be addressed in separate, focused implementation plans.
