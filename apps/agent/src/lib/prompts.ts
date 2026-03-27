/**
 * System prompt builder for Levi.
 *
 * XML-structured prompt optimized for Claude 4.6:
 *   1. <identity> — who Levi is, style guidance
 *   2. <output_rules> — formatting, display tools, language
 *   3. <tool_guidance> — high-level hints (detail lives in tool descriptions)
 *   4. <domain_knowledge> — Tier 1 always-present context
 *   5. <org_context> — roles, positions, thresholds, rubrics, features
 *   6. <relevant_context> — Tier 2+3 query-specific chunks
 *   7. <session> — user name, date
 */

import { getStyleInstruction } from './ai-provider.js';
import type { OrgContext } from './org-context.js';

/**
 * Format org context into an XML section for the system prompt.
 * Token-efficient while giving the LLM all the org knowledge it needs.
 */
function formatOrgContext(ctx: OrgContext): string {
  const parts: string[] = [];

  // Location header
  const locLabel = ctx.locationNumber
    ? `${ctx.locationName} (#${ctx.locationNumber})`
    : ctx.locationName;
  parts.push(`Location: ${locLabel} — ${ctx.employeeCount} active employees`);

  // Roles (high -> low)
  if (ctx.roles.length > 0) {
    const roleNames = ctx.roles.map((r) => {
      if (r.hierarchy_level === 0) return `${r.role_name} (Operator, level 0)`;
      return r.role_name;
    }).join(' → ');
    const leaderNames = ctx.roles.filter((r) => r.is_leader).map((r) => r.role_name).join(', ');
    const operatorRole = ctx.roles.find((r) => r.hierarchy_level === 0);
    parts.push(`Roles (high→low): ${roleNames}`);
    if (operatorRole) {
      parts.push(`Operator role: "${operatorRole.role_name}" — filter by this role name when asked "who is the operator"`);
    }
    if (leaderNames) {
      parts.push(`Leaders: ${leaderNames}`);
    }
  }

  // Positions by zone
  if (ctx.positions.length > 0) {
    const byZone: Record<string, string[]> = {};
    for (const p of ctx.positions) {
      const zone = p.zone || 'General';
      if (!byZone[zone]) byZone[zone] = [];
      byZone[zone].push(p.name);
    }
    for (const [zone, names] of Object.entries(byZone)) {
      parts.push(`Positions (${zone}): ${names.join(', ')}`);
    }
  }

  // Rating thresholds
  if (ctx.ratingThresholds) {
    parts.push(
      `Rating Scale: 1-3 per criteria (5 criteria per position). Green ≥ ${ctx.ratingThresholds.green}, Yellow ≥ ${ctx.ratingThresholds.yellow}, Red < ${ctx.ratingThresholds.yellow}`
    );
  }

  // Infraction rubric
  if (ctx.infractionRubric.length > 0) {
    const items = ctx.infractionRubric.map((r) => `${r.action} (${r.points}pts)`).join(', ');
    parts.push(`Infraction Types: ${items}`);
  }

  // Discipline rubric
  if (ctx.disciplineRubric.length > 0) {
    const items = ctx.disciplineRubric.map((r) => `${r.action} (${r.points_threshold}pts)`).join(' → ');
    parts.push(`Discipline Escalation: ${items}`);
  }

  // OE Pillars
  if (ctx.pillars && ctx.pillars.length > 0) {
    const pillarList = ctx.pillars.map((p) => `${p.name} (${p.weight}%)`).join(', ');
    parts.push(`OE Pillars: ${pillarList}`);
    parts.push('Use get_pillar_scores for OE/pillar questions. Scores are 0-100, computed from rating criteria mapped to pillars.');
  }

  // Features
  const featureFlags: string[] = [];
  if (ctx.features.certifications) featureFlags.push('Certifications');
  if (ctx.features.evaluations) featureFlags.push('Evaluations');
  if (ctx.features.pip) featureFlags.push('PIP');
  if (ctx.features.customRoles) featureFlags.push('Custom Roles');
  if (featureFlags.length > 0) {
    parts.push(`Active Features: ${featureFlags.join(', ')}`);
  }

  return parts.join('\n');
}

export function buildSystemPrompt(params: {
  userName: string;
  style: string;
  orgContext?: OrgContext;
  coreContext?: string;
  retrievedContext?: string;
}): string {
  const today = new Date().toISOString().split('T')[0];
  const styleInstruction = getStyleInstruction(params.style);

  const sections: string[] = [];

  // Section 1: Identity
  sections.push(`<identity>
You are Levi, an AI assistant powered by Levelset. You help restaurant managers and leaders manage their team — answering questions about employee performance, ratings, discipline, scheduling, and operational excellence.

${styleInstruction}

Respond in the same language the user writes in (English or Spanish).
All data is scoped to the current organization. Never fabricate data. If you cannot find information, say so directly.
</identity>`);

  // Section 2: Output Rules
  sections.push(`<output_rules>
Your responses go directly to the user in a mobile chat interface. The app already shows tool-loading indicators while you work, so your text should contain only the final analysis — no narration of what you looked up or plan to do.

Write like a knowledgeable colleague: get straight to the answer, lead with your conclusion, then support it briefly.

Formatting:
- Use **bold** for employee names and key numbers. Keep everything else regular weight.
- Use bullet points and line breaks for longer responses.
- For multi-faceted questions, give a clear answer first, then briefly explain.
- For ratings, show the average and note trends when relevant.
- For infractions, show "current points" (within the 90-day discipline cutoff) and recent incidents. Use "archived points" for older ones.
- Only include hire dates, contact info, or metadata when explicitly asked.

Display tools (show_employee_list, show_employee_card):
- These render visual cards in the mobile app. Use them when a visual list genuinely adds value — top performers, employees needing attention, a specific lookup.
- Text analysis is usually better for analytical questions. Only add a card if it clearly helps.
- When you show a card, add insight beyond what the card displays rather than repeating the same data.
</output_rules>`);

  // Section 3: Tool Guidance
  sections.push(`<tool_guidance>
Each tool's description explains when and how to use it. A few high-level patterns:

- For broad team questions ("how is the team doing?", "what trends?"), get_team_overview answers most of them in a single call.
- For OE/pillar questions, use get_pillar_scores.
- Most questions need just 1-2 tool calls. After fetching data, analyze it — provide insight and recommendations, not just lists.

The "Active Features" list in Organization Context tells you what this location has enabled. Only reference features that appear in that list.
</tool_guidance>`);

  // Section 4: Domain Knowledge (Tier 1)
  if (params.coreContext) {
    sections.push(`<domain_knowledge>
${params.coreContext}
</domain_knowledge>`);
  }

  // Section 5: Org Context
  if (params.orgContext) {
    sections.push(`<org_context>
${formatOrgContext(params.orgContext)}

Role hierarchy: The Owner/Operator (hierarchy_level 0) is the highest rank — exactly one per organization. Roles are ranked by hierarchy_level (0 = highest). Leaders have is_leader = true.
</org_context>`);
  }

  // Section 6: Retrieved Context (Tier 2+3)
  if (params.retrievedContext) {
    sections.push(`<relevant_context>
${params.retrievedContext}
</relevant_context>`);
  }

  // Section 7: Session
  sections.push(`<session>
User: ${params.userName}
Date: ${today}
</session>`);

  return sections.join('\n\n');
}
