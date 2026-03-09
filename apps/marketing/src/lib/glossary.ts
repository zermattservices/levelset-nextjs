export interface GlossaryTerm {
  term: string;
  definition: string;
}

export interface GlossaryCategory {
  name: string;
  slug: string;
  terms: GlossaryTerm[];
}

export const GLOSSARY_CATEGORIES: GlossaryCategory[] = [
  {
    name: 'Ratings & Positional Excellence',
    slug: 'ratings',
    terms: [
      {
        term: 'Positional Excellence',
        definition:
          'The rating system in Levelset. Team members are rated on position-specific criteria for every position they work.',
      },
      {
        term: 'Position',
        definition:
          'A job function defined by the organization (e.g., iPOS, Front Counter, Primary, Bagging, Prep, Secondary, Window). Each org configures its own positions.',
      },
      {
        term: 'Rating Criteria',
        definition:
          'The performance dimensions for each position (up to 5 per position). Each criterion is scored on a 1.0–3.0 scale by leaders during shifts.',
      },
      {
        term: 'Rating Average',
        definition:
          'The mean of all criteria scores for a single rating submission.',
      },
      {
        term: 'Rolling Average',
        definition:
          'The cumulative average across all rating submissions for a team member at a specific position, computed daily.',
      },
      {
        term: 'Color Thresholds (Green / Yellow / Red)',
        definition:
          'Performance levels indicating whether a team member meets expectations (Green), needs improvement (Yellow), or is below expectations (Red). Thresholds are configured per organization.',
      },
      {
        term: 'Zone',
        definition:
          'Position classification: FOH (Front of House), BOH (Back of House), or General.',
      },
    ],
  },
  {
    name: 'Discipline',
    slug: 'discipline',
    terms: [
      {
        term: 'Infraction',
        definition:
          "A documented behavioral or performance incident. Each infraction type carries a point value defined by the organization's rubric.",
      },
      {
        term: 'Points',
        definition:
          'Numeric weight assigned to each infraction type. Point values are configured per organization.',
      },
      {
        term: '90-Day Rolling Window',
        definition:
          'The active period for discipline point accumulation. Points older than 90 days are archived — still on record but no longer count toward action thresholds.',
      },
      {
        term: 'Infraction Rubric',
        definition:
          'Per-org configuration defining infraction types and their point values.',
      },
      {
        term: 'Disciplinary Action',
        definition:
          "An action taken by a leader when a team member's accumulated points reach an org-defined threshold. Each organization configures its own action types and the point levels that trigger them.",
      },
      {
        term: 'Recommended Action',
        definition:
          "An auto-generated recommendation when a team member's points cross a configured threshold.",
      },
    ],
  },
  {
    name: 'Pay',
    slug: 'pay',
    terms: [
      {
        term: 'Calculated Pay',
        definition:
          "Auto-computed hourly rate derived from the team member's role, zone, and availability. Updated automatically when inputs change.",
      },
      {
        term: 'Zone Pay',
        definition:
          'Optional pay differentiation by FOH vs BOH, configurable per role.',
      },
      {
        term: 'Availability',
        definition:
          'Schedule classification: Limited (restricted hours) or Available (full availability). Can affect pay when the organization enables availability-based pay rules.',
      },
    ],
  },
  {
    name: 'Roles & Team Structure',
    slug: 'roles',
    terms: [
      {
        term: 'Roles',
        definition:
          'Fully configurable per organization. Each org defines its own role names, hierarchy levels, and which roles have leader or trainer privileges. There is no fixed set of roles — organizations customize this entirely to fit their structure.',
      },
      {
        term: 'Leader',
        definition:
          'Any role with leadership privileges enabled. Leaders can submit ratings, document infractions, and take disciplinary actions.',
      },
      {
        term: 'Trainer',
        definition:
          'Any role with trainer privileges enabled. Trainers can conduct training activities.',
      },
      {
        term: 'Hierarchy Level',
        definition:
          'A numeric rank assigned to each role where 0 is the highest. Used to determine who can rate or manage whom. Configured per organization.',
      },
    ],
  },
  {
    name: 'Chick-fil-A Operations',
    slug: 'cfa-operations',
    terms: [
      {
        term: 'Operational Excellence Components',
        definition:
          'The three foundational parts of the CFA customer experience that build trust in the brand: Craveable Food, Fast & Accurate Service, Welcoming Environment.',
      },
      {
        term: '2nd Mile Service',
        definition:
          'Going above and beyond for customers. Based on the biblical principle in Matthew 5:41. Three components: Personal (customers feel seen, known, appreciated), Proactive (anticipating needs before being asked), Generous (extending unexpected kindness).',
      },
      {
        term: 'Core 4',
        definition:
          'Four foundational service behaviors for every customer interaction: Create Eye Contact, Share a Smile, Speak with a Friendly Tone, Always Say "My Pleasure."',
      },
      {
        term: 'HEARD Model',
        definition:
          "CFA's customer recovery model for handling dissatisfied customers: Hear (listen intently), Empathize (validate their concern), Apologize (commit to resolution), Resolve (solve the problem), Delight (be personal, proactive, generous).",
      },
      {
        term: 'FOH / BOH',
        definition:
          'Front of House (guest-facing positions like iPOS, Front Counter, Window, Bagging) / Back of House (kitchen positions like Primary, Secondary, Breader, Prep).',
      },
    ],
  },
  {
    name: 'Platform Features',
    slug: 'platform',
    terms: [
      {
        term: 'Levi',
        definition:
          'The AI assistant powered by Levelset. Helps leaders look up team member information and get insights via natural language on the mobile app.',
      },
      {
        term: 'Setups',
        definition:
          'Shift setup assignment templates that define which positions need to be staffed and by whom, ensuring consistency regardless of which leader is running the shift.',
      },
      {
        term: 'Evaluations',
        definition:
          'Formal performance assessments that incorporate rating history and leader observations.',
      },
    ],
  },
];

/** Flatten all terms across categories */
export function getAllTerms(): GlossaryTerm[] {
  return GLOSSARY_CATEGORIES.flatMap((c) => c.terms);
}

/** Create a URL-safe anchor ID from a term name */
export function termToId(term: string): string {
  return term
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
