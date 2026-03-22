# Evaluations Feature Page Rewrite

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic capabilities + screenshots sections on the evaluations feature page with a custom transformation showcase: paper form → digitized form → scored result, plus feature highlights with inline links.

**Architecture:** Add an optional `transformationShowcase` field to `FeatureContent`. When present, `FeaturePageTemplate` renders a custom two-section layout instead of the "How it works" and "See it in action" sections. All other sections (hero, problem/solution, works-with, related features, CTA) remain unchanged.

**Tech Stack:** Next.js (App Router), TypeScript, Tailwind CSS

---

### Task 1: Update FeatureContent type and evaluations data

**Files:**
- Modify: `apps/marketing/src/lib/feature-content.ts`

- [ ] **Step 1: Add `TransformationShowcase` type and optional field to `FeatureContent`**

Add after the `FeatureContent` interface (before `const CONTENT`):

```typescript
export interface TransformationHighlight {
  icon: string;
  text: string;
  /** If provided, wraps the text in a Next.js Link */
  link?: string;
}

export interface TransformationShowcase {
  before: { src: string; alt: string; label: string };
  after: { src: string; alt: string; label: string };
  result: { src: string; alt: string; caption: string };
  importDescription: string;
  highlights: TransformationHighlight[];
}
```

Add to `FeatureContent` interface:

```typescript
/** When set, replaces "How it works" + "See it in action" with a custom transformation layout */
transformationShowcase?: TransformationShowcase;
```

- [ ] **Step 2: Rewrite the evaluations entry in CONTENT**

Replace the existing `evaluations` entry with:

```typescript
evaluations: {
  tagline:
    'Turn any paper evaluation into a digital, AI-scored performance review — connected to real data.',
  heroImage: '/screenshots/certified-trainer-evaluation.png',
  problem:
    'Evaluation time comes around and leaders scramble to remember three months of performance. They fill out forms from memory, give vague feedback, and the team member leaves the meeting with no clear picture of where they actually stand.',
  solution:
    'Import any evaluation form you already use — PDF, Google Form, or Jotform — and Levelset\'s AI analyzes it, extracts every question and scoring criterion, and builds a digital version. Leaders evaluate with real performance data at their fingertips, and the scored result is available instantly.',
  capabilities: [],
  screenshots: [],
  transformationShowcase: {
    before: {
      src: '/screenshots/certified-trainer-evaluation.png',
      alt: 'A paper Certified Trainer Evaluation form with manual scoring fields',
      label: 'Your existing evaluation form',
    },
    after: {
      src: '/screenshots/evaluation-example-levelset.png',
      alt: 'The same evaluation digitized in Levelset with interactive scoring sliders',
      label: 'Digitized & enhanced by AI',
    },
    result: {
      src: '/screenshots/evaluation-scored-levelset.png',
      alt: 'A completed evaluation in Levelset showing AI-generated scores, section breakdowns, and summary',
      caption:
        'The completed evaluation — scored, summarized, and ready for a real development conversation.',
    },
    importDescription:
      'Upload any evaluation form and AI extracts every question, section, and scoring criterion automatically. Works with PDFs, Google Forms, and Jotforms.',
    highlights: [
      {
        icon: 'sparkles',
        text: 'AI analyzes and extracts questions & scoring from any form you upload',
      },
      {
        icon: 'rocket',
        text: 'Evaluate team members on their Positional Excellence ratings',
        link: '/features/positional-ratings',
      },
      {
        icon: 'star',
        text: 'Evaluate on Operational Excellence pillar scores',
        link: '/features/oe-pillars',
      },
      {
        icon: 'clock',
        text: 'View evaluation history over time for informed decisions and stronger development conversations',
      },
      {
        icon: 'file-text',
        text: 'Export any evaluation to PDF for documentation and records',
      },
      {
        icon: 'smartphone',
        text: 'Completed evaluations are available to team members on the mobile app (coming soon)',
      },
    ],
  },
  worksWith: [
    { slug: 'positional-ratings', reason: 'Real rating data is embedded directly in evaluations' },
    { slug: 'oe-pillars', reason: 'OE pillar scores can be used as evaluation criteria' },
    { slug: 'forms', reason: 'Custom forms power your evaluation templates' },
  ],
},
```

- [ ] **Step 3: Verify no type errors**

Run: `cd apps/marketing && npx tsc --noEmit`
Expected: No errors related to feature-content.ts (template changes come in Task 2)

- [ ] **Step 4: Commit**

```bash
git add apps/marketing/src/lib/feature-content.ts
git commit -m "feat(marketing): add transformationShowcase type and evaluations data"
```

---

### Task 2: Update FeaturePageTemplate to render transformation showcase

**Files:**
- Modify: `apps/marketing/src/components/templates/FeaturePageTemplate.tsx`

- [ ] **Step 1: Add import for Link (already imported) and TransformationShowcase type**

At top of file, add to the import from `feature-content.ts`:

```typescript
import type { FeatureContent, FeatureScreenshot, TransformationShowcase, TransformationHighlight } from '@/lib/feature-content';
```

- [ ] **Step 2: Create the TransformationShowcaseSection component**

Add this component inside `FeaturePageTemplate.tsx`, before the `FeaturePageTemplate` function:

```tsx
function TransformationShowcaseSection({ showcase }: { showcase: TransformationShowcase }) {
  return (
    <>
      {/* ─── From → To ─────────────────────────────────────────── */}
      <section className="py-20 md:py-28 bg-neutral-50">
        <div className="max-w-content mx-auto px-6">
          <div className="mb-14">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-neutral-900 mb-3">
              From paper to platform
            </h2>
            <div className="w-12 h-1 rounded-full bg-[#31664A]" />
          </div>

          {/* Before / After comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
            {/* Before */}
            <div>
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-400 mb-4">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                {showcase.before.label}
              </span>
              <div className="relative">
                <img
                  src={showcase.before.src}
                  alt={showcase.before.alt}
                  className="w-full h-auto rounded-xl shadow-lg shadow-black/8 border border-neutral-200/80"
                  loading="lazy"
                />
              </div>
            </div>

            {/* After */}
            <div>
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#31664A] mb-4">
                <span className="w-2 h-2 rounded-full bg-[#31664A]" />
                {showcase.after.label}
              </span>
              <div className="relative">
                <img
                  src={showcase.after.src}
                  alt={showcase.after.alt}
                  className="w-full h-auto rounded-xl shadow-lg shadow-black/8 border border-neutral-200/80"
                  loading="lazy"
                />
              </div>
            </div>
          </div>

          {/* Import description */}
          <div className="mt-10 max-w-2xl mx-auto text-center">
            <p className="text-lg text-neutral-600 leading-relaxed">
              {showcase.importDescription}
            </p>
          </div>
        </div>
      </section>

      {/* ─── Scored Result ──────────────────────────────────────── */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-content mx-auto px-6">
          <div className="mb-14">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-neutral-900 mb-3">
              The result
            </h2>
            <div className="w-12 h-1 rounded-full bg-[#31664A]" />
          </div>

          {/* Result screenshot — full width, no browser mockup */}
          <div>
            <img
              src={showcase.result.src}
              alt={showcase.result.alt}
              className="w-full h-auto rounded-xl shadow-xl shadow-black/8 border border-neutral-200/80"
              loading="lazy"
            />
            {showcase.result.caption && (
              <p className="text-sm text-neutral-400 text-center mt-4 italic">
                {showcase.result.caption}
              </p>
            )}
          </div>

          {/* Feature highlights */}
          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {showcase.highlights.map((highlight) => (
              <div
                key={highlight.text}
                className="flex items-start gap-3.5 bg-neutral-50 rounded-xl p-5 border border-neutral-200/80"
              >
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[#31664A]/10 flex items-center justify-center">
                  <Icon name={highlight.icon} size={16} className="text-[#31664A]" />
                </div>
                <p className="text-sm text-neutral-600 leading-relaxed pt-1.5">
                  {highlight.link ? (
                    <Link href={highlight.link} className="text-[#31664A] font-medium hover:underline">
                      {highlight.text}
                    </Link>
                  ) : (
                    highlight.text
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 3: Conditionally render TransformationShowcaseSection in the template**

In the `FeaturePageTemplate` component, replace the capabilities section (section 3, "How it works") and the screenshots gallery section (section 5, "See it in action") with a conditional:

Find the section starting with `{/* ─── 3. Capabilities */}` and the section starting with `{/* ─── 5. Screenshots Gallery */}`. Wrap both in a conditional:

```tsx
{content.transformationShowcase ? (
  <TransformationShowcaseSection showcase={content.transformationShowcase} />
) : (
  <>
    {/* ─── 3. Capabilities ───────────────────────────────────────── */}
    {/* ... existing capabilities section JSX ... */}

    {/* ─── 5. Screenshots Gallery ──────────────────────────────── */}
    {/* ... existing screenshots gallery section JSX ... */}
  </>
)}
```

Note: The "Works With" section (section 4) currently sits between capabilities and screenshots. It should remain outside this conditional — it renders for all feature pages. Move it after the conditional block if needed so it always renders.

- [ ] **Step 4: Verify build passes**

Run: `cd apps/marketing && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 5: Commit**

```bash
git add apps/marketing/src/components/templates/FeaturePageTemplate.tsx
git commit -m "feat(marketing): render transformation showcase for evaluations page"
```

---

### Task 3: Visual verification

- [ ] **Step 1: Start dev server and verify**

Run: `cd apps/marketing && npm run dev`

Open `http://localhost:3000/features/evaluations` and verify:
- Hero shows `certified-trainer-evaluation.png` as the hero image
- Problem/solution section renders correctly
- "From paper to platform" section shows before/after images side-by-side on desktop, stacked on mobile
- Import description text appears centered below
- "The result" section shows the scored evaluation full-width
- 6 highlight cards appear in a 3-column grid (desktop), 2-col (tablet), 1-col (mobile)
- Highlight cards with links (Positional Ratings, OE Pillars) are clickable and navigate correctly
- "Works great with" section still renders with the 3 linked features
- All images respect their natural aspect ratios (no stretching/cropping)

- [ ] **Step 2: Check other feature pages are unaffected**

Open `/features/positional-ratings` and `/features/discipline` — verify they still show the standard capabilities + screenshots layout.

- [ ] **Step 3: Final commit if any adjustments needed**
