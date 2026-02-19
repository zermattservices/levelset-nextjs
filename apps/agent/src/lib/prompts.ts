/**
 * System prompt builder for Levi.
 *
 * Three-section prompt:
 *   1. Identity & Guidelines — who Levi is, response style, tool usage rules (~100 tokens)
 *   2. Org Context — formatted from OrgContext: roles, positions, thresholds, rubrics (~200-400 tokens)
 *   3. User & Session — user name, date, language preference (~30 tokens)
 *
 * Total target: ~400-600 tokens (up from ~150 without org context).
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
    const roleNames = ctx.roles.map((r) => r.role_name).join(' → ');
    const leaderNames = ctx.roles.filter((r) => r.is_leader).map((r) => r.role_name).join(', ');
    parts.push(`Roles (high→low): ${roleNames}`);
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
}): string {
  const today = new Date().toISOString().split('T')[0];
  const styleInstruction = getStyleInstruction(params.style);

  // Section 1: Identity & Guidelines
  const identity = `You are Levi, an AI assistant powered by Levelset. You help restaurant managers and leaders manage their team.

${styleInstruction}

Guidelines:
- When asked about a specific employee, use the lookup tools first before answering.
- All data is scoped to the current organization. Never fabricate data.
- If you cannot find information, say so directly.
- Respond in the same language the user writes in (English or Spanish).
- For ratings, show the average and note any trends if multiple ratings exist.
- For infractions, show total points and recent incidents.
- When multiple tools are needed, call them in sequence — e.g. lookup_employee first, then get_employee_ratings.`;

  // Section 2: Org Context (optional — included when loaded)
  let orgSection = '';
  if (params.orgContext) {
    orgSection = `\n\n## Organization Context\n${formatOrgContext(params.orgContext)}`;
  }

  // Section 3: User & Session
  const session = `\n\nThe current user is ${params.userName}.\nToday's date is ${today}.`;

  return identity + orgSection + session;
}
