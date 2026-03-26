/**
 * Worker — Response synthesis via MiniMax M2.5 streamText.
 *
 * The worker receives tool results from the executor, a synthesis directive
 * from the orchestrator, and conversation history. It streams a response
 * using the same SSE protocol as the legacy path.
 *
 * The worker has access to display tools only (show_employee_list,
 * show_employee_card). It does NOT have access to data tools.
 */

import { streamText, smoothStream, stepCountIs } from 'ai';
import type { ModelMessage } from 'ai';
import { models } from './ai-provider.js';
// NOTE: Worker is deprecated — will be removed in Task 7
import type { ToolResult } from './tool-executor.js';
import type { OrgContext } from './org-context.js';
import { getStyleInstruction } from './ai-provider.js';

// ─── Worker Prompt ───────────────────────────────────────────────────────────

function buildWorkerPrompt(params: {
  synthesisDirective: string;
  responseStyle: 'concise' | 'detailed' | 'list';
  toolResults: ToolResult[];
  orgContext?: OrgContext;
  userName: string;
  coreContext?: string;
  retrievedContext?: string;
}): { system: string; toolResultsMessage: string } {
  const styleInstruction = getStyleInstruction(
    params.responseStyle === 'list' ? 'structured' : params.responseStyle
  );

  const today = new Date().toISOString().split('T')[0];

  // Format tool results for injection
  const toolDataParts = params.toolResults.map((r) => {
    if (r.error) {
      return `[${r.tool}] ERROR: ${r.error}`;
    }
    return `[${r.tool}] (${r.purpose})\n${r.data}`;
  });

  const toolResultsMessage = toolDataParts.join('\n\n---\n\n');

  // Build system prompt — focused on synthesis, no tool selection rules
  const system = `You are Levi, an AI assistant powered by Levelset. You help restaurant managers and leaders manage their team.

${styleInstruction}

Synthesis directive from planner: ${params.synthesisDirective}

Output rules:
- ABSOLUTELY NEVER include internal reasoning, planning thoughts, or tool commentary in your response.
- NEVER narrate what you are doing or about to do.
- Only output the FINAL polished answer. The tool call UI already shows the user what you're doing behind the scenes.
- Always include a substantive text answer that directly addresses the user's question.

Display tools — you control what visual cards appear:
- After reviewing the data below, YOU decide whether to show visual cards by calling show_employee_list or show_employee_card.
- Not every response needs cards. Use them when a visual list genuinely adds value.
- For analytical questions, text analysis is usually better than cards.
- If you show a card, do not repeat the same data in your text. Add insight and analysis beyond what the card shows.

FORBIDDEN phrases — NEVER start or include these:
  "Let me check...", "Let me look up...", "Let me get...", "Let me try..."
  "I found that...", "I'll look into...", "Now let me..."
  "Based on the tool results...", "The data shows..."
  "I see that...", "It looks like...", "Looking at the results..."
  Any mention of tool names, tool limitations, or what data was returned.

Formatting:
- Use standard markdown. **Bold** only for names and key numbers.
- Use bullet points and line breaks for longer responses.
- For multi-faceted questions, provide a clear opinionated answer first, then reasoning.

${params.coreContext ? `\n## Levelset Domain Knowledge\n${params.coreContext}` : ''}
${params.orgContext ? `\n## Organization Context\nLocation: ${params.orgContext.locationName} (${params.orgContext.employeeCount} employees)` : ''}
${params.retrievedContext ? `\n## Relevant Context\n${params.retrievedContext}` : ''}

The current user is ${params.userName}.
Today's date is ${today}.`;

  return { system, toolResultsMessage };
}

// ─── Worker Execution ────────────────────────────────────────────────────────

export interface WorkerInput {
  synthesisDirective: string;
  responseStyle: 'concise' | 'detailed' | 'list';
  toolResults: ToolResult[];
  conversationHistory: ModelMessage[];
  orgContext?: OrgContext;
  userName: string;
  coreContext?: string;
  retrievedContext?: string;
  /** Optional step callback — used by chat route to emit UI block events for display tools */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onStepFinish?: (step: any) => void | Promise<void>;
}

/**
 * Synthesize a response from tool results.
 * Returns a streamText result that can be merged into a UIMessageStream.
 */
export function synthesizeResponse(input: WorkerInput): ReturnType<typeof streamText> {
  const { system, toolResultsMessage } = buildWorkerPrompt({
    synthesisDirective: input.synthesisDirective,
    responseStyle: input.responseStyle,
    toolResults: input.toolResults,
    orgContext: input.orgContext,
    userName: input.userName,
    coreContext: input.coreContext,
    retrievedContext: input.retrievedContext,
  });

  // Build messages: conversation history + tool results as a user message
  const messages: ModelMessage[] = [
    ...input.conversationHistory,
    {
      role: 'user',
      content: `Here is the data to synthesize your response from:\n\n${toolResultsMessage}`,
    },
  ];

  // TODO: Remove in Task 7 — worker is deprecated
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const displayTools = {} as any;

  return streamText({
    model: models.languageModel('primary'),
    system,
    messages,
    tools: displayTools,
    stopWhen: stepCountIs(2), // Allow 1 display tool call + final text
    experimental_transform: smoothStream({ delayInMs: 15, chunking: 'word' }),
    onStepFinish: input.onStepFinish,
  });
}
