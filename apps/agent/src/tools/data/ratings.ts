/**
 * Ratings tool — query employee rating history.
 * All queries are scoped by org_id from the authenticated user context.
 */

import { createServiceClient } from '@levelset/supabase-client';
import type { ToolDefinition } from '../../lib/types.js';

export const getEmployeeRatingsTool: ToolDefinition = {
  type: 'function',
  function: {
    name: 'get_employee_ratings',
    description:
      'Get rating history for a specific employee. Returns their ratings (rating_1 through rating_5, rating_avg) with dates and positions rated. Use lookup_employee first to get the employee ID.',
    parameters: {
      type: 'object',
      properties: {
        employee_id: {
          type: 'string',
          description: 'The UUID of the employee',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of ratings to return (default: 10)',
        },
      },
      required: ['employee_id'],
    },
  },
};

export async function getEmployeeRatings(
  args: Record<string, unknown>,
  orgId: string
): Promise<string> {
  const supabase = createServiceClient();
  const employeeId = args.employee_id as string;
  const limit = (args.limit as number) || 10;

  const { data, error } = await supabase
    .from('ratings')
    .select(
      'id, position, rating_1, rating_2, rating_3, rating_4, rating_5, rating_avg, notes, created_at'
    )
    .eq('employee_id', employeeId)
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return JSON.stringify({ error: error.message });
  }

  if (!data || data.length === 0) {
    return JSON.stringify({
      message: 'No ratings found for this employee',
    });
  }

  return JSON.stringify({ count: data.length, ratings: data });
}
