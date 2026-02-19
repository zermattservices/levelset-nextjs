/**
 * Infractions tool — query employee infraction/discipline history.
 * All queries are scoped by org_id from the authenticated user context.
 */

import { createServiceClient } from '@levelset/supabase-client';
import type { ToolDefinition } from '../../lib/types.js';

export const getEmployeeInfractionsTool: ToolDefinition = {
  type: 'function',
  function: {
    name: 'get_employee_infractions',
    description:
      'Get infraction and discipline history for a specific employee. Returns infraction type, points, date, leader who documented, and notes. Use lookup_employee first to get the employee ID.',
    parameters: {
      type: 'object',
      properties: {
        employee_id: {
          type: 'string',
          description: 'The UUID of the employee',
        },
        limit: {
          type: 'number',
          description:
            'Maximum number of infractions to return (default: 10)',
        },
      },
      required: ['employee_id'],
    },
  },
};

export async function getEmployeeInfractions(
  args: Record<string, unknown>,
  orgId: string
): Promise<string> {
  const supabase = createServiceClient();
  const employeeId = args.employee_id as string;
  const limit = (args.limit as number) || 10;

  const { data, error } = await supabase
    .from('infractions')
    .select(
      'id, infraction, infraction_date, points, notes, leader_name, ack_bool'
    )
    .eq('employee_id', employeeId)
    .eq('org_id', orgId)
    .order('infraction_date', { ascending: false })
    .limit(limit);

  if (error) {
    return JSON.stringify({ error: error.message });
  }

  if (!data || data.length === 0) {
    return JSON.stringify({
      message: 'No infractions found for this employee',
    });
  }

  return JSON.stringify({ count: data.length, infractions: data });
}
