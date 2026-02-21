/**
 * Native Form API: Team Summary (Batch)
 * GET /api/native/forms/team-summary?location_id=<id>
 *
 * Returns everything the mobile app needs for a location in one request:
 * employees, positions with criteria, and infraction rubric.
 *
 * This replaces 3-4 separate API calls on tab mount, and serves as the
 * agent-compatible team data source.
 */

import type { NextApiResponse } from 'next';
import { withPermissionAndContext, AuthenticatedRequest } from '@/lib/permissions/middleware';
import { P } from '@/lib/permissions/constants';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { validateLocationAccess } from '@/lib/native-auth';

function normalizeName(fullName?: string | null, firstName?: string | null, lastName?: string | null) {
  if (fullName && fullName.trim().length > 0) {
    return fullName.trim();
  }
  const composed = `${firstName ?? ''} ${lastName ?? ''}`.trim();
  return composed.length > 0 ? composed : 'Unnamed';
}

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
      const todayStr = new Date().toISOString().split('T')[0];

      // Run all queries in parallel
      const [
        employeesResult,
        appUsersResult,
        positionsResult,
        rubricResult,
        schedulesResult,
      ] = await Promise.all([
        // 1. Active employees
        supabase
          .from('employees')
          .select('id, full_name, first_name, last_name, role, hire_date, is_leader, is_foh, is_boh')
          .eq('location_id', locationId)
          .eq('active', true)
          .order('full_name'),

        // 2. Profile images from app_users
        supabase
          .from('app_users')
          .select('employee_id, profile_image')
          .eq('org_id', context.orgId)
          .not('profile_image', 'is', null),

        // 3. Org positions with criteria
        supabase
          .from('org_positions')
          .select('id, name, name_es, description, description_es, zone, display_order, position_criteria(name, name_es, description, description_es, criteria_order)')
          .eq('org_id', context.orgId)
          .eq('is_active', true)
          .order('display_order', { ascending: true }),

        // 4. Infraction rubric
        supabase
          .from('infractions_rubric')
          .select('id, action, action_es, points, require_tm_signature, require_leader_signature')
          .eq('org_id', context.orgId)
          .is('location_id', null)
          .order('points'),

        // 5. Published schedules for today (to determine who works today)
        supabase
          .from('schedules')
          .select('id')
          .eq('location_id', locationId)
          .eq('status', 'published'),
      ]);

      if (employeesResult.error) {
        console.error('[team-summary] Failed to load employees:', employeesResult.error);
        return res.status(500).json({ error: 'Failed to load team data' });
      }

      const employees = employeesResult.data ?? [];
      const employeeIds = employees.map((e: any) => e.id);

      // Build profile image map
      const profileImageMap = new Map<string, string>();
      for (const au of (appUsersResult.data ?? []) as any[]) {
        if (au.employee_id && au.profile_image && employeeIds.includes(au.employee_id)) {
          profileImageMap.set(au.employee_id, au.profile_image);
        }
      }

      // Determine who works today
      const workingTodaySet = new Set<string>();
      const schedules = schedulesResult.data ?? [];
      if (schedules.length > 0) {
        const scheduleIds = schedules.map((s: any) => s.id);
        const { data: todayShifts } = await supabase
          .from('shifts')
          .select('id, shift_assignments!inner(employee_id)')
          .in('schedule_id', scheduleIds)
          .eq('shift_date', todayStr);

        for (const shift of (todayShifts ?? []) as any[]) {
          for (const a of (shift.shift_assignments ?? [])) {
            if (a.employee_id) workingTodaySet.add(a.employee_id);
          }
        }
      }

      // Format employees
      const formattedEmployees = employees.map((emp: any) => ({
        id: emp.id,
        full_name: normalizeName(emp.full_name, emp.first_name, emp.last_name),
        role: emp.role ?? null,
        hire_date: emp.hire_date ?? null,
        profile_image: profileImageMap.get(emp.id) ?? null,
        works_today: workingTodaySet.has(emp.id),
        is_leader: emp.is_leader ?? false,
      }));

      // Format positions with criteria
      const positions = (positionsResult.data ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        name_es: p.name_es || p.name,
        zone: p.zone ?? 'FOH',
        description: p.description ?? null,
        description_es: p.description_es || p.description || null,
        criteria: ((p.position_criteria ?? []) as any[])
          .sort((a: any, b: any) => (a.criteria_order ?? 0) - (b.criteria_order ?? 0))
          .map((c: any) => ({
            name: c.name,
            name_es: c.name_es || c.name,
            description: c.description ?? '',
            description_es: c.description_es || c.description || '',
          })),
      }));

      // Format infraction rubric
      const infractionRubric = (rubricResult.data ?? []).map((item: any) => ({
        id: item.id,
        action: item.action,
        action_es: item.action_es ?? null,
        points: item.points ?? 0,
        require_tm_signature: item.require_tm_signature ?? false,
        require_leader_signature: item.require_leader_signature ?? false,
      }));

      res.setHeader('Cache-Control', 'private, s-maxage=60, stale-while-revalidate=300');
      res.setHeader('Vary', 'Authorization');
      return res.status(200).json({
        employees: formattedEmployees,
        positions,
        infractionRubric,
      });
    } catch (error) {
      console.error('[team-summary API] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);
