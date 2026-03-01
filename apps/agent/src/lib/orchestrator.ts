/**
 * Orchestrator — Plan generation via Claude Opus 4.6 generateObject.
 *
 * The orchestrator receives a compressed context (user message, conversation
 * summary, org configuration, available tools) and outputs a structured
 * ExecutionPlan. It does NOT see full conversation history — just a summary.
 *
 * The plan is then executed deterministically by the tool executor.
 */

import { generateObject } from 'ai';
import { z } from 'zod';
import { models } from './ai-provider.js';
import { getToolSummaries } from './tool-registry.js';
import type { ToolRegistryContext } from './tool-registry.js';
import type { ChatMessage } from './types.js';
import type { OrgContext } from './org-context.js';

// ─── Schema ──────────────────────────────────────────────────────────────────

const PlanStepSchema = z.object({
  tool: z.string().describe('Tool name to call'),
  args: z.record(z.string(), z.unknown()).describe('Arguments to pass to the tool'),
  purpose: z.string().describe('Why this tool is needed (passed to worker for context)'),
  dependsOn: z
    .number()
    .optional()
    .describe('Index of a previous step this depends on (for sequential execution)'),
  requiresConfirmation: z
    .boolean()
    .optional()
    .default(false)
    .describe('Future: true for action tools that need user confirmation before executing'),
});

const ExecutionPlanSchema = z.object({
  steps: z
    .array(PlanStepSchema)
    .max(4)
    .describe('Ordered tool calls (max 4). Independent steps run in parallel.'),
  synthesisDirective: z
    .string()
    .describe(
      'Instructions for the worker on HOW to present the results. Be specific about what to emphasize, what to skip, and the tone.'
    ),
  responseStyle: z
    .enum(['concise', 'detailed', 'list'])
    .describe(
      'concise: 1-3 sentences, best for simple lookups. detailed: paragraph analysis with recommendations. list: structured bullet points.'
    ),
});

export type ExecutionPlan = z.infer<typeof ExecutionPlanSchema>;
export type PlanStep = z.infer<typeof PlanStepSchema>;

// ─── Conversation Summary ────────────────────────────────────────────────────

/**
 * Compress recent conversation history into a 2-3 sentence summary.
 * The orchestrator gets this instead of full message history.
 */
export function summarizeConversation(messages: ChatMessage[]): string {
  // Take last 5 user + assistant messages
  const recent = messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .slice(-5);

  if (recent.length === 0) return 'No prior conversation.';

  const parts: string[] = [];
  for (const msg of recent) {
    const content = msg.content?.slice(0, 100) ?? '';
    if (msg.role === 'user') {
      parts.push(`User asked: "${content}"`);
    } else {
      parts.push(`Levi responded about ${content.slice(0, 60)}...`);
    }
  }

  return parts.join(' ');
}

// ─── Orchestrator Prompt ─────────────────────────────────────────────────────

function buildOrchestratorPrompt(params: {
  toolSummaries: Record<string, string>;
  orgContext?: OrgContext;
}): string {
  const toolList = Object.entries(params.toolSummaries)
    .map(([name, desc]) => `  - ${name}: ${desc}`)
    .join('\n');

  // Compressed org context (~100 tokens)
  let orgSection = '';
  if (params.orgContext) {
    const ctx = params.orgContext;
    const parts: string[] = [];
    parts.push(`Location: ${ctx.locationName} (${ctx.employeeCount} employees)`);
    if (ctx.roles.length > 0) {
      parts.push(`Roles: ${ctx.roles.map((r) => r.role_name).join(' → ')}`);
    }
    if (ctx.positions.length > 0) {
      parts.push(`Positions: ${ctx.positions.map((p) => p.name).join(', ')}`);
    }
    const features: string[] = [];
    if (ctx.features.certifications) features.push('certifications');
    if (ctx.features.evaluations) features.push('evaluations');
    if (ctx.features.pip) features.push('PIP');
    if (features.length > 0) {
      parts.push(`Features: ${features.join(', ')}`);
    }
    if (ctx.pillars && ctx.pillars.length > 0) {
      parts.push(`OE Pillars: ${ctx.pillars.map((p) => p.name).join(', ')}`);
    }
    orgSection = `\n\nOrg context:\n${parts.join('\n')}`;
  }

  return `You are a planning agent for Levi, an AI assistant for restaurant managers. Your job is to create a tool execution plan.

Available tools:
${toolList}

Rules:
- Max 4 tool calls. Most questions need 1-2 calls.
- get_team_overview is the go-to for broad team/rating/performance questions.
- get_employee_profile gives ratings + discipline in one call — do NOT also call separate ratings/infractions tools.
- get_pillar_scores for OE pillar/operational excellence questions.
- get_org_chart for hierarchy, reporting structure, "who reports to whom" questions.
- get_schedule_overview for schedule status, get_labor_summary for labor costs/overtime.
- For "who should be promoted?" or analytical questions: plan targeted calls, then set synthesisDirective to request analysis with specific reasoning.
- Use lookup_employee when you need to find an employee ID before other calls.
- Steps without dependsOn run in parallel. Use dependsOn when a step needs output from a prior step (e.g., lookup_employee → get_employee_profile).
- synthesisDirective tells the worker HOW to present results. Be specific: "Rank by rating, highlight anyone above 2.8, note trends."
- responseStyle: "concise" for lookups, "detailed" for analysis, "list" for rankings.
- If the user asks a question that needs no tools (greeting, clarification), return an empty steps array with a synthesisDirective like "Respond conversationally."${orgSection}`;
}

// ─── Plan Generation ─────────────────────────────────────────────────────────

/**
 * Generate an execution plan using Claude Opus.
 * Returns a structured plan or null if generation fails.
 */
export async function generatePlan(params: {
  userMessage: string;
  conversationSummary: string;
  orgContext?: OrgContext;
  toolRegistryContext: ToolRegistryContext;
}): Promise<{ plan: ExecutionPlan; usage: { inputTokens: number; outputTokens: number } } | null> {
  const toolSummaries = getToolSummaries(params.toolRegistryContext);

  const systemPrompt = buildOrchestratorPrompt({
    toolSummaries,
    orgContext: params.orgContext,
  });

  const userPrompt = `Conversation context: ${params.conversationSummary}

User message: "${params.userMessage}"

Create the execution plan.`;

  try {
    const result = await generateObject({
      model: models.languageModel('orchestrator'),
      schema: ExecutionPlanSchema,
      system: systemPrompt,
      prompt: userPrompt,
    });

    return {
      plan: result.object,
      usage: {
        inputTokens: result.usage?.inputTokens ?? 0,
        outputTokens: result.usage?.outputTokens ?? 0,
      },
    };
  } catch (error) {
    console.error('Orchestrator failed:', error);
    return null;
  }
}
