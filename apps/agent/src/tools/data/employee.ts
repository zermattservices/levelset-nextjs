/**
 * Employee tools — lookup and list employees.
 * All queries are scoped by org_id from the authenticated user context.
 */

import { createServiceClient } from '@levelset/supabase-client';
import type { ToolDefinition } from '../../lib/types.js';

export const lookupEmployeeTool: ToolDefinition = {
  type: 'function',
  function: {
    name: 'lookup_employee',
    description:
      'Search for an employee by name and return their details including role, hire date, certification status, and current discipline points.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Full or partial name of the employee to search for',
        },
      },
      required: ['name'],
    },
  },
};

export async function lookupEmployee(
  args: Record<string, unknown>,
  orgId: string
): Promise<string> {
  const supabase = createServiceClient();
  const name = args.name as string;

  const { data, error } = await supabase
    .from('employees')
    .select(
      'id, full_name, first_name, last_name, role, hire_date, certified_status, last_points_total, active, is_leader, is_trainer, is_boh, is_foh, position, location_id'
    )
    .eq('org_id', orgId)
    .ilike('full_name', `%${name}%`)
    .eq('active', true)
    .limit(5);

  if (error) {
    return JSON.stringify({ error: error.message });
  }

  if (!data || data.length === 0) {
    return JSON.stringify({
      message: `No active employee found matching "${name}"`,
    });
  }

  return JSON.stringify(data);
}

export const listEmployeesTool: ToolDefinition = {
  type: 'function',
  function: {
    name: 'list_employees',
    description:
      'List employees in the organization. Can filter by active status, position type (FOH/BOH), leaders, or trainers.',
    parameters: {
      type: 'object',
      properties: {
        active_only: {
          type: 'boolean',
          description: 'Only return active employees (default: true)',
        },
        is_leader: {
          type: 'boolean',
          description: 'Filter for leaders only',
        },
        is_boh: {
          type: 'boolean',
          description: 'Filter for back-of-house employees',
        },
        is_foh: {
          type: 'boolean',
          description: 'Filter for front-of-house employees',
        },
        is_trainer: {
          type: 'boolean',
          description: 'Filter for trainers only',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of employees to return (default: 20)',
        },
      },
    },
  },
};

export async function listEmployees(
  args: Record<string, unknown>,
  orgId: string
): Promise<string> {
  const supabase = createServiceClient();
  const activeOnly = args.active_only !== false; // default true
  const limit = (args.limit as number) || 20;

  let query = supabase
    .from('employees')
    .select(
      'id, full_name, role, position, hire_date, certified_status, last_points_total, active, is_leader, is_trainer, is_boh, is_foh'
    )
    .eq('org_id', orgId)
    .order('full_name', { ascending: true })
    .limit(limit);

  if (activeOnly) {
    query = query.eq('active', true);
  }
  if (typeof args.is_leader === 'boolean') {
    query = query.eq('is_leader', args.is_leader);
  }
  if (typeof args.is_boh === 'boolean') {
    query = query.eq('is_boh', args.is_boh);
  }
  if (typeof args.is_foh === 'boolean') {
    query = query.eq('is_foh', args.is_foh);
  }
  if (typeof args.is_trainer === 'boolean') {
    query = query.eq('is_trainer', args.is_trainer);
  }

  const { data, error } = await query;

  if (error) {
    return JSON.stringify({ error: error.message });
  }

  if (!data || data.length === 0) {
    return JSON.stringify({ message: 'No employees found matching the filters' });
  }

  return JSON.stringify({ count: data.length, employees: data });
}
