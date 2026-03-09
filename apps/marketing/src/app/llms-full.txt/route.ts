import { FEATURES } from '@/lib/features';
import { INTEGRATIONS } from '@/lib/integrations';

export function GET() {
  const featuresList = FEATURES.map(
    (f) => `- ${f.name} (${f.status}): ${f.shortDescription}`,
  ).join('\n');

  const integrationsList = INTEGRATIONS.map(
    (i) => `- ${i.name} (${i.status}): ${i.shortDescription}`,
  ).join('\n');

  const content = `# Levelset — Full Documentation

> Team management platform built exclusively for Chick-fil-A operators.

## About Levelset

Levelset is a unified team management platform purpose-built for Chick-fil-A
franchise operators. It replaces the spreadsheets, paper trackers, and disconnected
tools that operators rely on today with a single system for positional excellence
ratings, discipline tracking, pay management, scheduling, and team development.

Every feature is designed around how CFA restaurants actually operate — with
FOH/BOH zones, position-specific performance data, and configurable workflows
that adapt to each organization's structure.

## Rating System

Levelset's core is positional excellence ratings. Organizations define their own
positions (e.g., iPOS, Front Counter, Primary, Bagging, Prep, Secondary, Window)
and configure up to 5 rating criteria per position. Leaders rate team members on
each criterion using a 1.0–3.0 scale during shifts.

- Ratings are collected per position, per shift
- Each submission produces a rating average (mean of all criteria scores)
- Rolling averages are computed daily across all submissions for a team member
  at a specific position
- Organizations configure color thresholds (Green / Yellow / Red) to define
  performance levels — these thresholds are fully customizable per org
- Positions are classified by zone: FOH (Front of House), BOH (Back of House),
  or General

## Discipline System

Levelset provides a configurable discipline system with full audit trails.

- Organizations define their own infraction rubric — a set of infraction types,
  each with a custom point value
- When a leader documents an infraction, points accumulate on the team member's
  record within a 90-day rolling window
- Points older than 90 days are archived — still on record but no longer count
  toward action thresholds
- Organizations configure disciplinary actions and the point thresholds that
  trigger them
- When a team member's accumulated points cross a threshold, Levelset
  auto-generates a recommended action for the leader to review

## Pay System

Levelset's pay system auto-calculates hourly rates based on configurable rules.

- Pay is configured per role, with optional rules for zone (FOH vs BOH pay
  differential) and availability (Limited vs Available)
- When a team member's role, zone, or availability changes, their calculated
  pay updates automatically
- Pay configuration is entirely per-organization — each org sets its own rates,
  rules, and structures

## Employer Branding

Levelset is also an employer branding tool. Team members can see their own
positional ratings and understand how their performance connects to pay increases.
This gives every person on the team — from new hires to experienced leaders — a
clear picture of what success looks like and a transparent path to growth.

## Roles

Roles in Levelset are fully configurable per organization. Each org defines its
own role names, hierarchy levels, and which roles have leader or trainer
privileges. Common examples include Operator, Director, Team Lead, Trainer, and
Team Member — but every org customizes this to fit their structure.

- Hierarchy levels (0 = highest) determine who can rate or manage whom
- Leader privileges allow submitting ratings, documenting infractions, and
  taking disciplinary actions
- Trainer privileges allow conducting training activities

## CFA Terminology

Levelset speaks the language of Chick-fil-A operations. Key terminology from
WHED (Winning Hearts Every Day) and CFA operational excellence:

### Operational Excellence Components
The three foundational parts of the CFA customer experience that build trust in
the brand:
- Craveable Food
- Fast & Accurate Service
- Welcoming Environment

### 2nd Mile Service
Going above and beyond for customers, based on the biblical principle in
Matthew 5:41. Three components:
- Personal: customers feel seen, known, appreciated
- Proactive: anticipating needs before being asked
- Generous: extending unexpected kindness

### Core 4
Four foundational service behaviors for every customer interaction:
- Create Eye Contact
- Share a Smile
- Speak with a Friendly Tone
- Always Say "My Pleasure"

### HEARD Model
CFA's customer recovery model for handling dissatisfied customers:
- Hear: listen intently
- Empathize: validate their concern
- Apologize: commit to resolution
- Resolve: solve the problem
- Delight: be personal, proactive, generous

### FOH / BOH
- FOH (Front of House): guest-facing positions like iPOS, Front Counter,
  Window, Bagging
- BOH (Back of House): kitchen positions like Primary, Secondary, Breader, Prep

## Competitive Landscape

- OneClick (~$8-9M ARR, 620+ operators, 3.5-star rating, performance complaints)
- KitchenIQ/VSBL (acquired by Ecolab, 3.4-star rating, rigidity complaints)

Levelset differentiates through position-specific rating granularity, an
integrated discipline-to-pay pipeline, and team-facing transparency that turns
the platform into an employer branding tool.

## Features

${featuresList}

## Integrations

${integrationsList}

## Links

- Homepage: https://levelset.io
- Pricing: https://levelset.io/pricing
- Features: https://levelset.io/features/positional-ratings
- Integrations: https://levelset.io/integrations
- Glossary: https://levelset.io/glossary
- Contact: https://levelset.io/contact
- Full llms.txt: https://levelset.io/llms-full.txt
`;

  return new Response(content, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
