/**
 * Seed The Approach timeslot content.
 *
 * Usage: npx tsx scripts/seed-the-approach-content.ts
 * Reads .env.local for SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */

import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

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
    subtext: 'Levelset replaces the binders and spreadsheets you use to track ratings, discipline, and your roster — all in one platform designed around the way CFA restaurants actually operate.',
    feature_cards: [
      {
        icon: 'rocket',
        title: 'Position-Based Ratings (PEA)',
        description: 'Rate every team member on 5 custom criteria per position — your "Big 5." Each criterion is scored 1–5, and Levelset automatically calculates a rolling average of each employee\'s last 4 ratings to show real performance trends.',
        details: [
          'Supports all your FOH and BOH positions — iPOS, Host, Bagging, Breader, Fries, Primary, and more',
          'You define the Big 5 labels for each position (e.g., "Smile & Shine," "Close Gaps & Call It Out" for iPOS)',
          'Color-coded thresholds: green (≥2.75), yellow (1.75–2.74), red (<1.75) — configurable per location',
          'Three dashboard views: Overview (all employees), Position (one position), and Leadership (ratings your leaders are giving)',
        ],
      },
      {
        icon: 'gavel',
        title: 'Progressive Discipline',
        description: 'A point-based discipline system that removes subjectivity. You define your infraction types and point values in a customizable rubric, and Levelset tracks accumulation over a rolling 90-day window.',
        details: [
          'Set your own infraction types and point values (e.g., "Late Arrival" = 5 pts, "No Call No Show" = 25 pts)',
          'Configure progressive actions at point thresholds — the system auto-generates recommendations when an employee crosses a threshold',
          'Actions never downgrade: if someone already received a suspension, the system won\'t recommend a verbal warning even if points decrease',
          'Digital signatures from both the leader and team member, with acknowledgement tracking',
        ],
      },
      {
        icon: 'sparkles',
        title: 'Levi — AI That Knows Your Team',
        description: 'Levi is Levelset\'s built-in AI assistant, available right from your phone. Ask questions in plain language about any employee, any position, any metric — and get real answers from your actual data.',
        details: [
          'Team members can ask Levi "What do I need to do to get promoted?" and get a specific answer based on their ratings and certification status',
          '"Who is the Talent Director?" — Levi knows your org chart and can answer questions about roles and leadership',
          '"How is the team doing?" — returns a full overview with top/bottom performers and attention items',
          '"Tell me about Sarah" — pulls her ratings, discipline history, certification status, and trends',
        ],
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
    subtext: 'Levelset gives you a single view of your entire team\'s performance. Every employee, every position, every rating and infraction — connected in one dashboard.',
    feature_cards: [
      {
        icon: 'rocket',
        title: 'Your Whole Team at a Glance',
        description: 'The Overview tab shows every employee with their rolling average across all positions, color-coded green/yellow/red so you instantly see who\'s excelling and who needs support.',
        details: [
          'Rolling average of the last 4 ratings per position, per employee',
          'Click any employee row to expand and see their individual rating history',
          'Filter by FOH/BOH, search by name, and export to PDF',
          '90-day rolling rating count shows how frequently each person is actually getting rated',
        ],
      },
      {
        icon: 'target',
        title: 'Operational Excellence Dashboard',
        description: 'Levelset maps your position-specific rating criteria to Chick-fil-A\'s Operational Excellence pillars: Great Food, Quick & Accurate, Creating Moments, Caring Interactions, and Inviting Atmosphere. Each pillar is scored 0–100 so you see exactly where your team is excelling and where you need to focus.',
        details: [
          'Each position\'s Big 5 criteria maps to one or more OE pillars — scores update automatically as new ratings come in',
          'Drill into any pillar to see which positions and employees are driving the score up or down',
          'Compare pillar scores across locations for multi-unit Operators',
          'Ask Levi "What\'s our Great Food score?" and get an instant breakdown by position',
        ],
      },
      {
        icon: 'org-chart',
        title: 'Org Chart & Team Structure',
        description: 'Every restaurant has a hierarchy — Operator, Talent Director, Directors, Team Leads, Trainers, and team members. Levelset maps your org chart so you can see reporting lines, leadership tiers, and role progression at a glance.',
        details: [
          'Define your restaurant\'s org structure: Operator → Talent Director → Director → Team Lead → Trainer → Team Member',
          'Levi uses the org chart to answer questions like "Who\'s the Talent Director?" or "What level comes after Trainer?"',
          'Team members can ask Levi about their own role progression — "What do I need to do to get promoted?"',
          'Multi-unit Operators see their full org chart across all locations',
        ],
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
    subtext: 'Craig Groeschel talked about leading with clarity. Levelset makes it structural — every position has defined criteria, every employee sees the same expectations, and every leader rates on the same scale.',
    feature_cards: [
      {
        icon: 'rocket',
        title: 'Custom Criteria Per Position',
        description: 'You define 5 evaluation criteria (the "Big 5") for every position in your restaurant. Each criterion is specific to what matters at that station, so your team knows exactly what "great" looks like.',
        details: [
          'Example: iPOS criteria might be "Smile & Shine," "Catch Every Detail," "Lead, Offer, Repeat," "Close Gaps & Call It Out," "Friendly Farewell"',
          'Criteria are different for Breader vs. Host vs. Drive-Thru — because the jobs are different',
          'Every leader who submits a rating uses the same 5 criteria, eliminating subjectivity',
          'The Leadership view lets you see how consistently each leader is rating across positions',
        ],
      },
      {
        icon: 'calendar-text',
        title: 'Certification System',
        description: 'Levelset automatically evaluates every employee on a monthly cycle. When all of a team member\'s positions reach a green average (≥2.75), the system moves them to "Pending" for a formal evaluation by a leader.',
        details: [
          'Four certification states: Not Certified → Pending → Certified (or PIP)',
          'Automated audit runs monthly — checks every employee\'s position averages against the green threshold',
          'Pre-evaluation check confirms Pending employees still qualify before the leader evaluation',
          'If a Certified employee\'s averages drop below threshold, they automatically move to PIP status',
        ],
      },
      {
        icon: 'calendar',
        title: 'Scheduling With Position Coverage',
        description: 'Build your weekly schedule with full visibility into which positions are covered each shift. Levelset shows you who\'s assigned where, their rating averages for that position, and where you have coverage gaps — before the shift starts.',
        details: [
          'Drag-and-drop schedule builder with position-based assignment slots',
          'See each employee\'s rating average for their assigned position so you know you\'re putting your best people where they matter most',
          'Coverage gaps highlighted automatically — know before the shift starts if you\'re short on a position',
          'Break rules built in — configure break timing and duration per shift length',
        ],
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
    headline: 'Show your team exactly where they stand and where they\'re going',
    subtext: 'Nido Qubein talked about building a brand people choose. When team members can see their own progress — criteria mastered, certifications earned, positions leveled up — that\'s an employer brand they can feel every shift.',
    feature_cards: [
      {
        icon: 'rocket',
        title: 'Visible Growth Paths',
        description: 'Team members see exactly how they\'re performing at each position through color-coded ratings and a clear certification path. Every rating they receive moves their rolling average — progress is tangible, not abstract.',
        details: [
          'The certification journey (Not Certified → Pending → Certified) gives team members a concrete goal to work toward',
          'Rolling averages mean every shift matters — consistent effort is rewarded over time',
          'Position-level detail shows where someone excels and where they can grow next',
          'Pay can be tied to certification status and zone — certified employees automatically earn their configured rate',
        ],
      },
      {
        icon: 'sparkles',
        title: 'Levi for Your Team Members',
        description: 'Levi isn\'t just for leadership — team members can use it too. From their phone, any employee can ask about their own performance, role progression, and what it takes to move up. It\'s the kind of transparency that makes people want to stay.',
        details: [
          '"What do I need to do to get promoted?" — Levi looks at the employee\'s current role, certification status, and rating averages to give a specific answer',
          '"What\'s the level after Trainer?" — Levi references the org chart to explain role progression',
          '"How am I doing at iPOS?" — returns their rolling average, recent ratings, and where they stand vs. the green threshold',
          '"Who\'s my Director?" — Levi knows the org chart and reports back with leadership info',
        ],
      },
      {
        icon: 'gavel',
        title: 'Accountability That Builds Trust',
        description: 'When discipline is documented and follows the same process regardless of who\'s managing, your team trusts the system. Levelset\'s point-based discipline removes the perception of favoritism.',
        details: [
          'Every infraction is documented with the type, point value, date, and who submitted it',
          'Team members sign digitally — they see the infraction and acknowledge it on the spot',
          'Point thresholds trigger specific actions so your team knows exactly what happens at each level',
          'Full history available per employee — no "he said, she said" when it comes to accountability',
        ],
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
    subtext: 'Chris McChesney\'s whole point: strategies fail without visible execution. Levelset gives your leadership team a live scoreboard — position averages, discipline status, scheduling, and setups visible every day, not once a quarter.',
    feature_cards: [
      {
        icon: 'target',
        title: 'Operational Excellence Pillars',
        description: 'Every rating your team submits feeds into Levelset\'s Operational Excellence scoring. Your Big 5 criteria map directly to Chick-fil-A\'s OE pillars — Great Food, Quick & Accurate, Creating Moments, Caring Interactions, and Inviting Atmosphere — giving you a live scoreboard for what matters most.',
        details: [
          'Each pillar scores 0–100 based on your team\'s actual position ratings',
          'Ask Levi "What\'s our weakest pillar?" and get an instant answer with the positions and employees driving it',
          'Individual employee breakdowns show which pillars they contribute to and where they fall short',
          'Track pillar trends over time to see if focused training is actually moving the needle',
        ],
      },
      {
        icon: 'calendar',
        title: 'Scheduling',
        description: 'Build your weekly schedule with full visibility into position coverage. See exactly who\'s working each shift, what position they\'re assigned to, and how strong they are at that position based on their rating average.',
        details: [
          'Position-based scheduling — assign employees to specific positions per shift, not just "FOH" or "BOH"',
          'Rating-aware assignments — see each employee\'s rolling average for the position you\'re assigning them to',
          'Break rule enforcement — configure minimum break times by shift duration and the system tracks compliance',
          'Multi-view: day view for shift-level detail, week view for coverage patterns',
        ],
      },
      {
        icon: 'tune',
        title: 'Shift Setups',
        description: 'Define setup templates for each daypart — who goes where at the start of every shift. Setups ensure consistent position coverage whether your best Team Lead is running the shift or your newest.',
        details: [
          'Create templates for each daypart: morning, lunch, afternoon, dinner, close',
          'Assign positions and employees to each setup slot so every shift starts the same way',
          'Setups reference rating data — you can see who\'s strongest at each position before assigning',
          'Templates are reusable and adjustable — build once, tweak weekly',
        ],
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
    headline: 'Haven\'t visited us yet? Here\'s what Levelset does',
    subtext: 'Levelset is a team performance platform built specifically for Chick-fil-A. Your positions, your criteria, your discipline process — digitized and connected in one system.',
    feature_cards: [
      {
        icon: 'rocket',
        title: 'Ratings That Actually Mean Something',
        description: 'Define 5 criteria per position, rate every team member 1–5 on each, and Levelset calculates a rolling average of the last 4 ratings. No more binder-based systems where ratings are inconsistent between leaders.',
        details: [
          'All your FOH and BOH positions — iPOS, Host, Bagging, Breader, Fries, Primary, and more',
          'Color-coded thresholds (green/yellow/red) make performance visible at a glance',
          'Monthly certification cycle automatically identifies who\'s ready for evaluation',
          'Submit ratings from your phone during the shift',
        ],
      },
      {
        icon: 'gavel',
        title: 'Discipline Without the Guesswork',
        description: 'You set the infraction types and point values. You configure the thresholds for progressive actions. Levelset tracks the points over a 90-day rolling window and tells your leaders when action is needed.',
        details: [
          'Customizable rubric: define your own infraction types and how many points each one is worth',
          'Progressive thresholds: set the point levels that trigger verbal warnings, documented warnings, suspensions, etc.',
          'Auto-recommendations: the system notifies your leadership team when someone crosses a threshold',
          'Digital signatures and acknowledgement tracking on every infraction',
        ],
      },
      {
        icon: 'sparkles',
        title: 'Ask Levi Anything About Your Team',
        description: 'Levi is your AI assistant that pulls from real data — ratings, discipline, roster, and org chart. Ask from your phone and get instant answers without opening a spreadsheet.',
        details: [
          '"Who is my best host?" — ranked list by position rating average',
          '"What do I need to do to get promoted?" — team members get specific guidance based on their current role and performance',
          '"Who\'s the Talent Director?" — org chart queries answered instantly',
          '"What level in the organization comes after Trainer?" — role progression explained from your org structure',
        ],
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
    headline: 'Ask your data a question. Get an answer in seconds.',
    subtext: 'Johnny C. Taylor and Tim Elmore talked about future-proofing talent. Levelset includes Levi — a built-in AI assistant that answers questions about your team\'s performance instantly, right from your phone.',
    feature_cards: [
      {
        icon: 'sparkles',
        title: 'Levi — Your AI Performance Assistant',
        description: 'Ask Levi a question in plain language and get an answer pulled from your team\'s actual data. Levi works for leaders and team members — anyone on your team can use it from their phone to get the information they need.',
        details: [
          '"Who is my best host?" — returns a ranked list of employees by Host rolling average',
          '"How is the team doing?" — full team overview with role breakdown, top/bottom performers, and discipline attention items',
          '"Tell me about Sarah" — returns her ratings, discipline history, certification status, and trends',
          '"Who has the most discipline points?" — location-wide discipline summary sorted by current points',
        ],
      },
      {
        icon: 'org-chart',
        title: 'Org Chart & Role Progression',
        description: 'Levelset maps your restaurant\'s full organizational structure — from Operator down to team member. This powers Levi\'s ability to answer questions about roles, reporting lines, and career progression.',
        details: [
          'Define your hierarchy: Operator → Talent Director → Director → Team Lead → Trainer → Team Member',
          'Team members ask Levi "What do I need to do to get promoted?" and get answers based on their current role, rating averages, and certification status',
          '"What\'s the level after Trainer?" — Levi references the org chart to explain the next step in their career path',
          '"Who\'s my Director?" or "Who reports to the Talent Director?" — organizational questions answered instantly',
        ],
      },
      {
        icon: 'target',
        title: 'Operational Excellence Scoring',
        description: 'Your Big 5 rating criteria map directly to Chick-fil-A\'s five Operational Excellence pillars. Levelset calculates a 0–100 score for each pillar based on your team\'s actual ratings, giving you a live OE scoreboard powered by real data.',
        details: [
          'Five pillars tracked: Great Food, Quick & Accurate, Creating Moments, Caring Interactions, Inviting Atmosphere',
          'Each position\'s criteria map to the relevant pillars — Breader criteria feed Great Food, iPOS criteria feed Creating Moments',
          'Drill into a specific pillar to see top and bottom performers driving the score',
          'Ask Levi "What\'s our Great Food score?" or "What\'s our weakest OE pillar?" for instant answers',
        ],
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
    subtext: 'You just built your 6-month talent strategy. Levelset is how you operationalize it — set up your positions, define your criteria, load your team, and start rating this week.',
    feature_cards: [
      {
        icon: 'rocket',
        title: 'Set Up in a Week',
        description: 'Getting started with Levelset is straightforward. Enter your positions, define your Big 5 criteria for each one, set up your org chart, load your roster, and you\'re rating. Most Operators are fully live within a week of onboarding.',
        details: [
          'Configure your FOH and BOH positions to match exactly how your restaurant operates',
          'Define the 5 evaluation criteria for each position — what matters at that station',
          'Set your rating thresholds (green/yellow/red cutoffs) or use the defaults',
          'Set up your discipline rubric with your infraction types, point values, and progressive action thresholds',
        ],
      },
      {
        icon: 'users',
        title: 'Personal Onboarding With the Founder',
        description: 'Every Approach attendee gets a 1-on-1 setup call with the founder. We\'ll configure Levelset for exactly how your restaurant operates — your positions, your criteria, your discipline process, your org chart, and your scheduling setup.',
        details: [
          'Walk through your FOH and BOH positions together and define what great looks like at each one',
          'Build your org chart and define role progression so Levi can answer team member questions about promotion paths',
          'Configure pay rates by role, zone, availability, and certification status',
          'Set up your scheduling templates and shift setups for consistent position coverage',
        ],
      },
      {
        icon: 'sparkles',
        title: 'Everything Connected, One Platform',
        description: 'Ratings, discipline, roster, scheduling, setups, certifications, org chart, Operational Excellence scoring, and AI — all linked per employee, all in one place. Every system feeds into every other system because team performance doesn\'t exist in silos.',
        details: [
          'An employee\'s ratings feed into their certification status, which feeds into their pay rate',
          'Position ratings roll up into Operational Excellence pillar scores — your live OE scoreboard',
          'Scheduling uses rating data to show you who\'s strongest at each position before you assign shifts',
          'Levi pulls from ratings, discipline, roster, org chart, and OE data together — one question, complete answer',
        ],
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
