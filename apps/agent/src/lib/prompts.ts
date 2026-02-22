/**
 * System prompt builder for Levi.
 *
 * Five-section prompt:
 *   1. Identity & Guidelines — who Levi is, response style, tool usage rules (~100 tokens)
 *   2. Core Domain Context — Tier 1 always-present summaries (~700 tokens)
 *   3. Org Context — formatted from OrgContext: roles, positions, thresholds, rubrics (~200-400 tokens)
 *   4. Retrieved Context — Tier 2+3 query-specific chunks + PageIndex reasoning (~300-800 tokens)
 *   5. User & Session — user name, date, language preference (~30 tokens)
 *
 * Total target: ~1400-2100 tokens (up from ~400-600 without context retrieval).
 */

import { getStyleInstruction } from './ai-provider.js';
import type { OrgContext } from './org-context.js';

/**
 * Format org context into a system prompt section.
 * Designed to be token-efficient while giving the LLM all the org knowledge it needs.
 */
function formatOrgContext(ctx: OrgContext): string {
  const parts: string[] = [];

  // Location header
  const locLabel = ctx.locationNumber
    ? `${ctx.locationName} (#${ctx.locationNumber})`
    : ctx.locationName;
  parts.push(`Location: ${locLabel} — ${ctx.employeeCount} active employees`);

  // Roles (high → low)
  if (ctx.roles.length > 0) {
    const roleNames = ctx.roles.map((r) => {
      if (r.hierarchy_level === 0) return `${r.role_name} (Operator, level 0)`;
      return r.role_name;
    }).join(' → ');
    const leaderNames = ctx.roles.filter((r) => r.is_leader).map((r) => r.role_name).join(', ');
    const operatorRole = ctx.roles.find((r) => r.hierarchy_level === 0);
    parts.push(`Roles (high→low): ${roleNames}`);
    if (operatorRole) {
      parts.push(`Operator role: "${operatorRole.role_name}" — use this to filter when asked "who is the operator"`);
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

  // Section 1: Identity & Guidelines
  const identity = `You are Levi, an AI assistant powered by Levelset. You help restaurant managers and leaders manage their team.

${styleInstruction}

Output rules:
- ABSOLUTELY NEVER include internal reasoning, planning thoughts, or tool commentary in your response.
- NEVER narrate what you are doing or about to do.
- Only output the FINAL polished answer. The tool call UI already shows the user what you're doing behind the scenes.
- Tool results automatically generate visual cards (employee cards, infraction cards, lists, etc.) in the chat. The cards are already visible to the user — do not describe or restate what the cards show. Instead, add analysis, insight, and recommendations that go beyond what the cards display.
- Always include a substantive text answer that directly addresses the user's question. Cards support your explanation, not replace it.

FORBIDDEN phrases — NEVER start or include sentences like these:
  "Let me check...", "Let me look up...", "Let me get...", "Let me try..."
  "I found that...", "I'll look into...", "Now let me..."
  "Got [data]. Let me present this to the user."
  "Based on the tool results...", "The data shows..."
  "I see that...", "It looks like...", "Looking at the results..."

CORRECT example — user asks "Who is the best host?":
  WRONG: "Got rankings for Host position. Let me present this to the user. Top Hosts: #1 Jack Rivera — 3.0 avg"
  RIGHT: "**Jack Rivera** leads Host with a 3.0 average, followed closely by **Nora Kelly** at 2.8. All three top hosts are in the green zone."
- Use standard markdown formatting: regular text for most content, **bold** only for key emphasis like names or important numbers. Do NOT bold entire paragraphs or sentences.

Guidelines:
- Be concise. Only include data directly relevant to the user's question.
- All data is scoped to the current organization. Never fabricate data.
- If you cannot find information, say so directly.
- Respond in the same language the user writes in (English or Spanish).

Tool usage — be efficient and targeted:
- NEVER call the same tool multiple times with the same or similar parameters.
- ONLY call tools that are directly needed to answer the user's specific question. Do NOT call extra tools "for context" or "just in case".
- Use list_employees with filters (role, is_leader, is_foh, is_boh) instead of multiple lookup calls.
- For questions about a specific employee, use lookup_employee first, then get_employee_profile (which includes ratings + discipline in one call). Do NOT also call get_employee_ratings or get_employee_infractions separately.
- For "who is the best at X" or position ranking questions, use get_position_rankings — ONE call returns all ranked employees for that position.
- For team-wide questions ("team overview", "how is the team doing"), prefer get_team_overview or list_employees over multiple individual tool calls.
- Aim for 1-2 tool calls for simple questions, 2-3 max for complex queries.
- For analytical questions (e.g. "who should be promoted?", "who needs improvement?"), make targeted tool calls, then ANALYZE the data in your text response with specific reasoning. Don't just dump lists — explain your thinking.

Role hierarchy:
- The Owner/Operator (hierarchy_level 0) is the highest rank — there is exactly one per organization. When asked "who is the operator", filter employees by the level 0 role name.
- Roles are ranked by hierarchy_level (0 = highest). Leaders have is_leader = true.

Response style:
- Only include hire dates, contact info, or other metadata when explicitly requested.
- For ratings, show the average and note trends if relevant.
- For infractions, show current points (within the 90-day discipline cutoff) and recent incidents. Never say "active points" or "stored points" — use "current points" for points within the cutoff and "archived points" for older ones.
- Use **bold** sparingly — only for employee names and key numbers. Everything else should be regular text weight.
- Use bullet points and line breaks to structure longer responses.
- For multi-faceted questions, provide a clear, opinionated answer first, then briefly explain the reasoning.`;

  // Section 2: Core Domain Context (Tier 1 — always present when loaded)
  let coreSection = '';
  if (params.coreContext) {
    coreSection = `\n\n## Levelset Domain Knowledge\n${params.coreContext}`;
  }

  // Section 3: Org Context (optional — included when loaded)
  let orgSection = '';
  if (params.orgContext) {
    orgSection = `\n\n## Organization Context\n${formatOrgContext(params.orgContext)}`;
  }

  // Section 4: Retrieved Context (Tier 2+3 — query-specific)
  let retrievedSection = '';
  if (params.retrievedContext) {
    retrievedSection = `\n\n## Relevant Context\nThe following information may help answer the current question:\n${params.retrievedContext}`;
  }

  // Section 5: User & Session
  const session = `\n\nThe current user is ${params.userName}.\nToday's date is ${today}.`;

  return identity + coreSection + orgSection + retrievedSection + session;
}
