/**
 * Native Form API: My Recent Activities
 * GET /api/native/forms/my-recent-activities?location_id=<id>&employee_id=<id>
 *
 * Returns the last 5 activities (ratings, infractions, disc_actions, reviews)
 * that the authenticated employee RECEIVED, sorted by date descending.
 */

import type { NextApiResponse } from 'next';
import { withPermissionAndContext, AuthenticatedRequest } from '@/lib/permissions/middleware';
import { P } from '@/lib/permissions/constants';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { validateLocationAccess } from '@/lib/native-auth';
import { getRatingThresholds } from '@/lib/rating-thresholds';

interface RecentActivity {
  id: string;
  type: 'rating' | 'infraction' | 'disc_action' | 'review';
  date: string;
  position?: string;
  zone?: 'FOH' | 'BOH' | null;
  rating_avg?: number | null;
  rater_name?: string | null;
  infraction_name?: string;
  infraction_name_es?: string | null;
  points?: number;
  action_type?: string;
  action_type_es?: string | null;
  position_es?: string | null;
  leader_name?: string | null;
  author_name?: string | null;
  review_rating?: number;
  review_text_preview?: string | null;
}

export default withPermissionAndContext(
  P.SCHED_VIEW,
  async (req: AuthenticatedRequest, res: NextApiResponse, context) => {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const locationId = req.query.location_id as string;
    const employeeId = req.query.employee_id as string;

    if (!locationId || !employeeId) {
      return res.status(400).json({ error: 'location_id and employee_id are required' });
    }

    try {
      const location = await validateLocationAccess(context.userId, context.orgId, locationId);
      if (!location) {
        return res.status(403).json({ error: 'Location access denied' });
      }

      const supabase = createServerSupabaseClient();
      const thresholds = await getRatingThresholds(locationId);

      // Fetch all 4 types + position zone labels + org_positions in parallel
      const [ratingsRes, infractionsRes, discActionsRes, reviewsRes, labelsRes, orgPosRes] = await Promise.all([
        supabase
          .from('ratings')
          .select(`id, position, rating_avg, created_at,
            rater:employees!ratings_rater_user_id_fkey(full_name)`)
          .eq('employee_id', employeeId)
          .eq('location_id', locationId)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('infractions')
          .select('id, infraction, infraction_es, points, infraction_date, leader_name, created_at')
          .eq('employee_id', employeeId)
          .eq('location_id', locationId)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('disc_actions')
          .select('id, action, action_es, action_date, leader_name, created_at')
          .eq('employee_id', employeeId)
          .eq('location_id', locationId)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('google_reviews')
          .select('id, author_name, rating, review_text, publish_time')
          .eq('location_id', locationId)
          .order('publish_time', { ascending: false })
          .limit(5),
        supabase
          .from('position_big5_labels')
          .select('position, position_es, zone')
          .eq('org_id', context.orgId)
          .eq('location_id', locationId),
        supabase
          .from('org_positions')
          .select('name, name_es, zone')
          .eq('org_id', context.orgId),
      ]);

      // Build position → zone and position → position_es lookups
      // Use org_positions as primary zone source, position_big5_labels as fallback
      const zoneMap = new Map<string, 'FOH' | 'BOH'>();
      const positionEsMap = new Map<string, string>();
      if (orgPosRes.data) {
        for (const row of orgPosRes.data as any[]) {
          if (row.zone) zoneMap.set(row.name, row.zone);
          if (row.name_es) positionEsMap.set(row.name, row.name_es);
        }
      }
      if (labelsRes.data) {
        for (const row of labelsRes.data as any[]) {
          if (row.zone && !zoneMap.has(row.position)) zoneMap.set(row.position, row.zone);
          if (row.position_es && !positionEsMap.has(row.position)) positionEsMap.set(row.position, row.position_es);
        }
      }

      // Normalize into unified shape
      const activities: RecentActivity[] = [];

      if (ratingsRes.data) {
        for (const r of ratingsRes.data as any[]) {
          activities.push({
            id: r.id,
            type: 'rating',
            date: r.created_at,
            position: r.position,
            position_es: positionEsMap.get(r.position) ?? null,
            zone: zoneMap.get(r.position) ?? null,
            rating_avg: r.rating_avg,
            rater_name: r.rater?.full_name ?? null,
          });
        }
      }

      if (infractionsRes.data) {
        for (const inf of infractionsRes.data as any[]) {
          activities.push({
            id: inf.id,
            type: 'infraction',
            date: inf.created_at,
            infraction_name: inf.infraction,
            infraction_name_es: inf.infraction_es || null,
            points: inf.points,
            leader_name: inf.leader_name,
          });
        }
      }

      if (discActionsRes.data) {
        for (const da of discActionsRes.data as any[]) {
          activities.push({
            id: da.id,
            type: 'disc_action',
            date: da.created_at,
            action_type: da.action,
            action_type_es: da.action_es || null,
            leader_name: da.leader_name,
          });
        }
      }

      if (reviewsRes.data) {
        for (const rev of reviewsRes.data as any[]) {
          activities.push({
            id: rev.id,
            type: 'review',
            date: rev.publish_time,
            author_name: rev.author_name,
            review_rating: rev.rating,
            review_text_preview: rev.review_text
              ? rev.review_text.slice(0, 80) + (rev.review_text.length > 80 ? '...' : '')
              : null,
          });
        }
      }

      // Sort by date descending, take first 5
      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const result = activities.slice(0, 5);

      res.setHeader('Cache-Control', 'private, s-maxage=120, stale-while-revalidate=300');
      res.setHeader('Vary', 'Authorization');
      return res.status(200).json({ activities: result, thresholds });
    } catch (error) {
      console.error('my-recent-activities API error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);
