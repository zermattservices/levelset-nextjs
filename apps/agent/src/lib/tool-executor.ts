/**
 * Tool Executor — deterministic plan execution with parallel/sequential support.
 *
 * No LLM in the loop. Takes an ExecutionPlan from the orchestrator,
 * groups steps by dependency, runs independent steps in parallel via
 * Promise.all, and retries transient failures once.
 *
 * Future: steps with requiresConfirmation=true will pause and invoke
 * onConfirmationRequired before executing.
 */

import { executeTool, getToolCallLabel } from './tool-registry.js';
import type { ToolRegistryContext } from './tool-registry.js';
import type { ExecutionPlan, PlanStep } from './orchestrator.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ToolResult {
  tool: string;
  stepIndex: number;
  purpose: string;
  data: string;
  error?: string;
  durationMs: number;
}

export interface ExecutorCallbacks {
  /** Called when a tool starts execution (for SSE tool-status events) */
  onToolStart?: (tool: string, label: string, stepIndex: number) => void;
  /** Called when a tool completes (for SSE tool-status events) */
  onToolDone?: (tool: string, label: string, stepIndex: number) => void;
  /**
   * Future: called when a step has requiresConfirmation=true.
   * Executor pauses until the callback resolves.
   * If returns false, the step is skipped.
   */
  onConfirmationRequired?: (step: PlanStep) => Promise<boolean>;
}

// ─── Execution ───────────────────────────────────────────────────────────────

/** Check if an error is transient (worth retrying) */
function isTransientError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('timeout') ||
      msg.includes('econnreset') ||
      msg.includes('503') ||
      msg.includes('500') ||
      msg.includes('rate limit')
    );
  }
  return false;
}

/** Execute a single step with optional retry */
async function executeStep(
  step: PlanStep,
  stepIndex: number,
  ctx: ToolRegistryContext,
  callbacks?: ExecutorCallbacks
): Promise<ToolResult> {
  const label = getToolCallLabel(step.tool, step.args);

  // Future: check confirmation requirement
  if (step.requiresConfirmation && callbacks?.onConfirmationRequired) {
    const confirmed = await callbacks.onConfirmationRequired(step);
    if (!confirmed) {
      return {
        tool: step.tool,
        stepIndex,
        purpose: step.purpose,
        data: '',
        error: 'User declined confirmation',
        durationMs: 0,
      };
    }
  }

  // Emit start event
  callbacks?.onToolStart?.(step.tool, label, stepIndex);

  const startMs = Date.now();

  try {
    const data = await executeTool(step.tool, step.args, ctx);
    const durationMs = Date.now() - startMs;
    callbacks?.onToolDone?.(step.tool, label, stepIndex);
    return { tool: step.tool, stepIndex, purpose: step.purpose, data, durationMs };
  } catch (error) {
    // Retry once on transient errors
    if (isTransientError(error)) {
      console.warn(`Transient error on ${step.tool}, retrying in 500ms...`);
      await new Promise((resolve) => setTimeout(resolve, 500));

      try {
        const data = await executeTool(step.tool, step.args, ctx);
        const durationMs = Date.now() - startMs;
        callbacks?.onToolDone?.(step.tool, label, stepIndex);
        return { tool: step.tool, stepIndex, purpose: step.purpose, data, durationMs };
      } catch (retryError) {
        const durationMs = Date.now() - startMs;
        const errMsg = retryError instanceof Error ? retryError.message : String(retryError);
        callbacks?.onToolDone?.(step.tool, label, stepIndex);
        return {
          tool: step.tool,
          stepIndex,
          purpose: step.purpose,
          data: '',
          error: `Failed after retry: ${errMsg}`,
          durationMs,
        };
      }
    }

    const durationMs = Date.now() - startMs;
    const errMsg = error instanceof Error ? error.message : String(error);
    callbacks?.onToolDone?.(step.tool, label, stepIndex);
    return {
      tool: step.tool,
      stepIndex,
      purpose: step.purpose,
      data: '',
      error: errMsg,
      durationMs,
    };
  }
}

/**
 * Execute a plan deterministically.
 *
 * Strategy:
 * 1. Group steps by dependency — steps without dependsOn run in parallel
 * 2. Sequential steps wait for their dependency to complete
 * 3. Each tool gets 1 retry on transient error
 * 4. Failed tools include error in result — worker generates partial response
 */
export async function executePlan(
  plan: ExecutionPlan,
  ctx: ToolRegistryContext,
  callbacks?: ExecutorCallbacks
): Promise<ToolResult[]> {
  const { steps } = plan;

  if (steps.length === 0) {
    return [];
  }

  const results: ToolResult[] = new Array(steps.length);

  // Group steps: independent (no dependsOn) vs dependent
  const independent: number[] = [];
  const dependent: Map<number, number[]> = new Map(); // dependency → [stepIndexes that depend on it]

  for (let i = 0; i < steps.length; i++) {
    const dep = steps[i].dependsOn;
    if (dep === undefined || dep === null) {
      independent.push(i);
    } else {
      if (!dependent.has(dep)) dependent.set(dep, []);
      dependent.get(dep)!.push(i);
    }
  }

  // Execute independent steps in parallel
  const independentResults = await Promise.all(
    independent.map((idx) => executeStep(steps[idx], idx, ctx, callbacks))
  );

  for (const result of independentResults) {
    results[result.stepIndex] = result;
  }

  // Execute dependent steps sequentially (after their dependency completes)
  for (const [depIdx, depSteps] of dependent) {
    // Ensure the dependency has completed (it should be in results already)
    if (!results[depIdx]) {
      // If the dependency wasn't in the independent set, it's a chained dependency.
      // This shouldn't happen with max 4 steps, but handle it gracefully.
      console.warn(`Dependency step ${depIdx} not yet executed — executing now`);
      results[depIdx] = await executeStep(steps[depIdx], depIdx, ctx, callbacks);
    }

    // Execute all steps that depend on this one (sequentially for safety)
    for (const idx of depSteps) {
      results[idx] = await executeStep(steps[idx], idx, ctx, callbacks);
    }
  }

  // Filter out any unfilled slots (shouldn't happen, but be safe)
  return results.filter(Boolean);
}
