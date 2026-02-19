/**
 * Tool registry — exports all tool definitions and a dispatcher.
 *
 * Each tool executor receives parsed arguments and the org_id from
 * the authenticated user context (never from user input).
 */

import type { ToolDefinition } from '../lib/types.js';
import {
  lookupEmployeeTool,
  lookupEmployee,
  listEmployeesTool,
  listEmployees,
} from './data/employee.js';
import {
  getEmployeeRatingsTool,
  getEmployeeRatings,
} from './data/ratings.js';
import {
  getEmployeeInfractionsTool,
  getEmployeeInfractions,
} from './data/infractions.js';

/** All available tool definitions (passed to the LLM) */
export const TOOL_DEFINITIONS: ToolDefinition[] = [
  lookupEmployeeTool,
  listEmployeesTool,
  getEmployeeRatingsTool,
  getEmployeeInfractionsTool,
];

/** Map of tool name → executor function */
const TOOL_EXECUTORS: Record<
  string,
  (args: Record<string, unknown>, orgId: string) => Promise<string>
> = {
  lookup_employee: lookupEmployee,
  list_employees: listEmployees,
  get_employee_ratings: getEmployeeRatings,
  get_employee_infractions: getEmployeeInfractions,
};

/**
 * Execute a tool by name with the given arguments.
 * Returns the JSON string result, or an error JSON on failure.
 */
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  orgId: string
): Promise<string> {
  const executor = TOOL_EXECUTORS[name];

  if (!executor) {
    return JSON.stringify({ error: `Unknown tool: ${name}` });
  }

  try {
    return await executor(args, orgId);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Tool execution error (${name}):`, err);
    return JSON.stringify({ error: `Tool execution failed: ${message}` });
  }
}
