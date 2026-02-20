/**
 * Native Form API: Employees
 * GET /api/native/forms/employees?location_id=<id>
 *
 * Returns all active employees for a location with profile images
 * and a "works today" flag based on shift assignments.
 */

import type { NextApiResponse } from 'next';
import { withPermissionAndContext, AuthenticatedRequest } from '@/lib/permissions/middleware';
import { P } from '@/lib/permissions/constants';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { validateLocationAccess } from '@/lib/native-auth';

export default withPermissionAndContext(
  P.ROSTER_VIEW,
  async (req: AuthenticatedRequest, res: NextApiResponse, context) => {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const locationId = Array.isArray(req.query.location_id)
      ? req.query.location_id[0]
      : req.query.location_id;

    if (!locationId) {
      return res.status(400).json({ error: 'Missing location_id' });
    }

    const location = await validateLocationAccess(context.userId, context.orgId, locationId);
    if (!location) {
      return res.status(403).json({ error: 'Access denied for this location' });
    }

    try {
      const supabase = createServerSupabaseClient();

      // 1. Fetch active employees for this location
      const { data: employeesData, error: empError } = await supabase
        .from('employees')
        .select('id, full_name, first_name, last_name, role, hire_date, is_leader, is_foh, is_boh, position')
        .eq('location_id', locationId)
        .eq('active', true)
        .order('full_name');

      if (empError) {
        console.error('[employees API] Failed to load employees:', empError);
        return res.status(500).json({ error: 'Failed to load employees' });
      }

      const employees = employeesData ?? [];

      if (employees.length === 0) {
        return res.status(200).json({ employees: [] });
      }

      // 2. Fetch profile images from app_users (LEFT JOIN via employee_id)
      const employeeIds = employees.map((e: any) => e.id);
      const { data: appUsersData } = await supabase
        .from('app_users')
        .select('employee_id, profile_image')
        .in('employee_id', employeeIds)
        .eq('org_id', context.orgId);

      const profileImageMap = new Map<string, string>();
      for (const au of (appUsersData ?? []) as any[]) {
        if (au.employee_id && au.profile_image) {
          profileImageMap.set(au.employee_id, au.profile_image);
        }
      }

      // 3. Determine who works today
      const todayStr = new Date().toISOString().split('T')[0];
      const workingTodaySet = new Set<string>();

      // Find published schedules that could contain today
      const { data: schedules } = await supabase
        .from('schedules')
        .select('id')
        .eq('location_id', locationId)
        .eq('status', 'published');

      if (schedules && schedules.length > 0) {
        const scheduleIds = schedules.map((s: any) => s.id);

        const { data: todayShifts } = await supabase
          .from('shifts')
          .select('id, shift_assignments!inner(employee_id)')
          .in('schedule_id', scheduleIds)
          .eq('shift_date', todayStr);

        for (const shift of (todayShifts ?? []) as any[]) {
          const assignments = shift.shift_assignments ?? [];
          for (const a of assignments) {
            if (a.employee_id) {
              workingTodaySet.add(a.employee_id);
            }
          }
        }
      }

      // 4. Build response
      const result = employees.map((emp: any) => {
        const name = emp.full_name?.trim() ||
          `${emp.first_name ?? ''} ${emp.last_name ?? ''}`.trim() ||
          'Unnamed';

        return {
          id: emp.id,
          full_name: name,
          role: emp.role ?? null,
          hire_date: emp.hire_date ?? null,
          profile_image: profileImageMap.get(emp.id) ?? null,
          works_today: workingTodaySet.has(emp.id),
          is_leader: emp.is_leader ?? false,
        };
      });

      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ employees: result });
    } catch (error) {
      console.error('[employees API] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);
