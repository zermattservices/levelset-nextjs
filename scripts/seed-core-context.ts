/**
 * Seed levi_core_context with condensed Tier 1 summaries.
 *
 * These summaries are always injected into Levi's system prompt (~600-800 tokens total).
 * They give Levi baseline domain knowledge without needing tool calls or retrieval.
 *
 * Usage: npx tsx scripts/seed-core-context.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Condensed Tier 1 summaries — designed to be token-efficient while providing
// comprehensive domain understanding. Total target: ~600-800 tokens.

const coreContextRecords = [
  {
    context_key: 'domain_summary',
    content: `Levelset is a workforce management platform for restaurant organizations. All business systems are per-org configurable.

Rating System (Positional Excellence): Employees are rated 1.0-3.0 on up to 5 criteria per position. Positions have zones (FOH/BOH/General). Rolling averages computed daily. Color thresholds per location: Green (meets expectations, default ≥2.75), Yellow (needs improvement, default ≥1.75), Red (below expectations).

Certification (optional): Not Certified → Pending (all positions green) → Certified (passed evaluation) → PIP (fell below while certified). Enabled via org_feature_toggles.

Discipline: Per-org infraction rubric defines types and point values. Points accumulate over 90-day rolling window. Escalation ladder triggers recommended actions at thresholds (e.g., 5pts=Warning, 10pts=Written Warning). Current points = last 90 days; archived = older.

Pay: Per-role configuration with optional toggles for availability (Limited/Available), zone (FOH/BOH), and certification pay differentials. Calculated pay auto-computed.

Employee Lifecycle: Hire → Active (rated, scheduled) → optionally Certified → Discipline if needed → Terminated.`,
    token_count: 210,
  },
  {
    context_key: 'data_relationships',
    content: `Data hierarchy: orgs → locations → employees. All tenant data scoped by org_id.

Employee is the central entity connecting: ratings, daily_position_averages, infractions, disc_actions, recommended_disc_actions, certification_audit, evaluations, form_submissions.

Rating chain: org_positions → position_criteria → ratings → daily_position_averages (JSONB with position:average pairs).
Discipline chain: infractions_rubric → infractions → recommended_disc_actions → disc_actions. Points computed from 90-day window.
Config chain: orgs → org_feature_toggles + org_roles + org_positions + org_pay_config + org_pay_rates + infractions_rubric + disc_actions_rubric.
Form chain: form_groups → form_templates (JSON Schema) → form_submissions. Connectors provide conditional logic.
Document chain: documents → document_digests (extracted markdown for RAG). Global variants exist for cross-org content.

Roles: Operator (level 0, highest) down to New Hire. is_leader and is_trainer flags. Hierarchy levels configurable per org.`,
    token_count: 185,
  },
  {
    context_key: 'platform_overview',
    content: `Platform components:
- Dashboard (Next.js): Manager web app for employee management, ratings, discipline, certification, pay, scheduling, documents, forms, permissions, reviews.
- Mobile App (Expo/React Native): Leader field tool with Levi AI chat, form submission, employee lookup. JWT auth.
- PWA Kiosks: Tablet forms at physical locations using static location tokens. Unauthenticated. Live in production.
- Agent/Levi (Hono.js on Fly.io): AI assistant with 7 structured data tools. MiniMax M2.5 primary, Claude Sonnet escalation. Max 3 tool iterations. SSE streaming with UI blocks for visual cards.

Data tools available: lookup_employee, list_employees, get_employee_ratings, get_employee_infractions, get_employee_profile (combined), get_team_overview, get_discipline_summary, get_position_rankings.

All tools are org-scoped with in-memory tenant cache (10min org config, 5min team, 2min dynamic data).`,
    token_count: 175,
  },
  {
    context_key: 'glossary_highlights',
    content: `Key terms:
- PE/Positional Excellence: The rating system. NOT called "PEA."
- Big 5: Up to 5 rating criteria per position.
- Green/Yellow/Red: Color-coded rating thresholds (configurable per location).
- Current Points: Infraction points within 90-day window. Archived Points: older infractions.
- Escalation Ladder: Discipline actions triggered at point thresholds.
- Operator: Highest role (hierarchy_level 0). One per org.
- FOH/BOH: Front of House / Back of House zones for positions.
- Availability: Limited or Available — affects pay calculation.
- Certified/PIP: Certification statuses (optional feature).
- Form Connector: Conditional logic for forms (e.g., no_discipline_30d, avg_rating_gte).
- UI Block: Visual card in mobile chat showing structured data.`,
    token_count: 145,
  },
];

async function seed() {
  console.log('Seeding levi_core_context...');

  for (const record of coreContextRecords) {
    const { error } = await supabase
      .from('levi_core_context')
      .upsert(record, { onConflict: 'context_key' });

    if (error) {
      console.error(`Failed to upsert ${record.context_key}:`, error.message);
    } else {
      console.log(`  ✓ ${record.context_key} (~${record.token_count} tokens)`);
    }
  }

  // Verify
  const { data, error } = await supabase
    .from('levi_core_context')
    .select('context_key, token_count, active')
    .eq('active', true)
    .order('context_key');

  if (error) {
    console.error('Verification query failed:', error.message);
  } else {
    console.log(`\nVerification: ${data.length} active records in levi_core_context`);
    const totalTokens = data.reduce((sum, r) => sum + (r.token_count ?? 0), 0);
    console.log(`Total estimated tokens: ~${totalTokens}`);
  }
}

seed().catch(console.error);
