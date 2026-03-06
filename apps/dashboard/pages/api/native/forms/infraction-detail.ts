/**
 * Native Form API: Infraction Detail
 * GET /api/native/forms/infraction-detail?location_id=<id>&infraction_id=<id>
 *
 * Returns full infraction data plus the employee's current total point value.
 */

import type { NextApiResponse } from 'next';
import { withPermissionAndContext, AuthenticatedRequest } from '@/lib/permissions/middleware';
import { P } from '@/lib/permissions/constants';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { validateLocationAccess } from '@/lib/native-auth';

export default withPermissionAndContext(
  P.SCHED_VIEW,
  async (req: AuthenticatedRequest, res: NextApiResponse, context) => {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const locationId = req.query.location_id as string;
    const infractionId = req.query.infraction_id as string;

    if (!locationId || !infractionId) {
      return res.status(400).json({ error: 'location_id and infraction_id are required' });
    }

    try {
      const location = await validateLocationAccess(context.userId, context.orgId, locationId);
      if (!location) {
        return res.status(403).json({ error: 'Location access denied' });
      }

      const supabase = createServerSupabaseClient();

      // Fetch the infraction with employee name
      const { data: infraction, error: infError } = await supabase
        .from('infractions')
        .select('id, infraction, infraction_es, points, infraction_date, leader_name, acknowledgement, ack_bool, notes, leader_signature, team_member_signature, created_at, employee_id, employees!infractions_employee_id_fkey(full_name)')
        .eq('id', infractionId)
        .eq('location_id', locationId)
        .single();

      if (infError || !infraction) {
        return res.status(404).json({ error: 'Infraction not found' });
      }

      const inf = infraction as any;

      // Compute total points for this employee at this location
      const { data: allInfractions } = await supabase
        .from('infractions')
        .select('points')
        .eq('employee_id', inf.employee_id)
        .eq('location_id', locationId);

      const totalPoints = (allInfractions ?? []).reduce(
        (sum: number, i: any) => sum + (i.points || 0),
        0
      );

      res.setHeader('Cache-Control', 'private, s-maxage=60, stale-while-revalidate=300');
      res.setHeader('Vary', 'Authorization');
      const employeeName = inf.employees?.full_name || null;

      return res.status(200).json({
        infraction: {
          id: inf.id,
          infraction: inf.infraction,
          infraction_es: inf.infraction_es || null,
          points: inf.points,
          infraction_date: inf.infraction_date,
          leader_name: inf.leader_name,
          acknowledgement: inf.acknowledgement,
          ack_bool: inf.ack_bool,
          notes: inf.notes,
          leader_signature: inf.leader_signature || null,
          team_member_signature: inf.team_member_signature || null,
          created_at: inf.created_at,
          employee_id: inf.employee_id,
          employee_name: employeeName,
        },
        total_points: totalPoints,
      });
    } catch (error) {
      console.error('infraction-detail API error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);
