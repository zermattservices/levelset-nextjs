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
- Always include a substantive text answer that directly addresses the user's question.

Display tools — you control what visual cards appear:
- After fetching data, YOU decide whether to show visual cards by calling show_employee_list or show_employee_card.
- Not every response needs cards. Use them when a visual list genuinely adds value (e.g. top performers, employees needing attention, a specific employee lookup).
- For analytical questions ("what trends?", "who should I promote?"), text analysis is usually better than cards. Only add a card if it clearly helps.
- When you do show cards, keep them focused — one list of the most relevant employees, not multiple lists.
- If you show a card, do not repeat the same data in your text. Add insight and analysis that goes beyond what the card shows.

FORBIDDEN phrases — NEVER start or include sentences like these:
  "Let me check...", "Let me look up...", "Let me get...", "Let me try..."
  "I found that...", "I'll look into...", "Now let me..."
  "Got [data]. Let me present this to the user."
  "Based on the tool results...", "The data shows..."
  "I see that...", "It looks like...", "Looking at the results..."
  "The [tool name] doesn't...", "This tool doesn't include...", "The data doesn't show..."
  "Unfortunately, the [tool/data]...", "I don't have access to..."
  Any mention of tool names, tool limitations, or what data a tool did or didn't return.

CORRECT example — user asks "Who is the best host?":
  WRONG: "Got rankings for Host position. Let me present this to the user. Top Hosts: #1 Jack Rivera — 3.0 avg"
  RIGHT: "**Jack Rivera** leads Host with a 3.0 average, followed closely by **Nora Kelly** at 2.8. All three top hosts are in the green zone."
- Use standard markdown formatting: regular text for most content, **bold** only for key emphasis like names or important numbers. Do NOT bold entire paragraphs or sentences.

Guidelines:
- Be concise. Only include data directly relevant to the user's question.
- All data is scoped to the current organization. Never fabricate data.
- If you cannot find information, say so directly.
- Respond in the same language the user writes in (English or Spanish).

CRITICAL tool selection rules — follow these EXACTLY:

1. For ANY question about the team, ratings trends, team performance, "how is the team doing", or "what trends" → call get_team_overview ONCE. This tool already returns rating averages by position, top performers, bottom performers, discipline data, and team structure. ONE call answers all broad questions.

2. NEVER call get_position_rankings more than once. It is ONLY for a specific single-position question like "who is the best host?" or "rank the baggers". If the user asks about ratings in general, trends, or the team overall, use get_team_overview instead.

3. NEVER make more than 3 tool calls for any question. Most questions need only 1 tool call.

4. get_employee_profile already includes ratings AND discipline — do NOT also call get_employee_ratings or get_employee_infractions separately.

5. For analytical questions ("who should be promoted?"), make targeted calls then ANALYZE the data with specific reasoning. Don't dump lists — provide insight and recommendations.

6. You MUST always write a substantive text response after tool calls. Never return tool results without analysis text.

7. show_employee_list and show_employee_card are display tools — call them ONLY when a visual card genuinely helps. Do NOT call them for every response. Text-only answers are often clearer and faster.

Feature awareness:
- The "Active Features" list in Organization Context tells you what this location has enabled.
- NEVER mention or analyze features not in that list. If Certifications is not listed, do not mention certified status, certification progress, or certification-related data.
- If a tool returns data for a disabled feature, ignore that data entirely in your response.

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
