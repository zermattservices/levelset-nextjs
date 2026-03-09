export function GET() {
  const content = `# Levelset

> Team management platform built exclusively for Chick-fil-A operators.

Levelset replaces the spreadsheets and paper trackers Chick-fil-A operators rely on
today with a unified platform for positional excellence ratings, discipline tracking,
scheduling, and team development. It gives every team member — from new hires to
directors — clarity on what success looks like in their organization.

## Core Capabilities

- Positional Excellence Ratings: Rate team members on position-specific rating
  criteria for every position they work (e.g., iPOS, Front Counter, Primary, Bagging)
- Discipline System: Configurable infraction types with custom point values and
  disciplinary actions at org-defined point thresholds
- Team Roster: Complete employee profiles with pay, performance history, and role
  management
- Scheduling: Build schedules with position coverage and performance data
- Setups: Consistent shift setup assignments every time
- Pay System: Transparent, performance-linked pay configurable per role, zone,
  and availability
- Evaluations: Formal evaluations connected to real performance data
- Levi AI: AI-powered insights about your team, on demand
- Mobile App: Full team management from your pocket

## Why Operators Choose Levelset

Purpose-built for Chick-fil-A operations. Speaks the language of CFA — positional
excellence, FOH/BOH zones, Core 4, WHED (Winning Hearts Every Day).

Levelset is also an employer branding solution — team members get transparent tools
to see their ratings, understand their growth path, and know exactly what
performance levels connect to pay increases. It shows every person on your team
what success looks like and how to get there.

## Links

- Homepage: https://levelset.io
- Pricing: https://levelset.io/pricing
- Features: https://levelset.io/features/positional-ratings
- Integrations: https://levelset.io/integrations
- Glossary: https://levelset.io/glossary
- Contact: https://levelset.io/contact
`;

  return new Response(content, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
