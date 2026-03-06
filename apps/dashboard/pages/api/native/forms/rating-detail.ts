/**
 * Native Form API: Rating Detail
 * GET /api/native/forms/rating-detail?location_id=<id>&rating_id=<id>
 *
 * Returns full rating data with position criteria (names + descriptions),
 * the employee's last-4 rating average for that position, and thresholds.
 */

import type { NextApiResponse } from 'next';
import { withPermissionAndContext, AuthenticatedRequest } from '@/lib/permissions/middleware';
import { P } from '@/lib/permissions/constants';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { validateLocationAccess } from '@/lib/native-auth';
import { getRatingThresholds } from '@/lib/rating-thresholds';

export default withPermissionAndContext(
  P.SCHED_VIEW,
  async (req: AuthenticatedRequest, res: NextApiResponse, context) => {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const locationId = req.query.location_id as string;
    const ratingId = req.query.rating_id as string;

    if (!locationId || !ratingId) {
      return res.status(400).json({ error: 'location_id and rating_id are required' });
    }

    try {
      const location = await validateLocationAccess(context.userId, context.orgId, locationId);
      if (!location) {
        return res.status(403).json({ error: 'Location access denied' });
      }

      const supabase = createServerSupabaseClient();
      const thresholds = await getRatingThresholds(locationId);

      // 1. Fetch the rating with employee name and rater name
      const { data: rating, error: ratingError } = await supabase
        .from('ratings')
        .select(`id, position, rating_1, rating_2, rating_3, rating_4, rating_5,
          rating_avg, notes, created_at, employee_id,
          employee:employees!ratings_employee_id_fkey(full_name),
          rater:employees!ratings_rater_user_id_fkey(full_name)`)
        .eq('id', ratingId)
        .eq('location_id', locationId)
        .single();

      if (ratingError || !rating) {
        return res.status(404).json({ error: 'Rating not found' });
      }

      const r = rating as any;

      // 2. Fetch labels, last-4 avg, and criteria descriptions in parallel
      const [labelsRes, last4Res, criteriaRes] = await Promise.all([
        supabase
          .from('position_big5_labels')
          .select('label_1, label_2, label_3, label_4, label_5, label_1_es, label_2_es, label_3_es, label_4_es, label_5_es')
          .eq('org_id', context.orgId)
          .eq('location_id', locationId)
          .eq('position', r.position)
          .maybeSingle(),
        supabase
          .from('ratings')
          .select('rating_avg')
          .eq('employee_id', r.employee_id)
          .eq('location_id', locationId)
          .eq('position', r.position)
          .neq('id', ratingId)
          .order('created_at', { ascending: false })
          .limit(4),
        // Fetch criteria descriptions via org_positions -> position_criteria
        // Use limit(1) to handle duplicate org_positions rows safely
        supabase
          .from('org_positions')
          .select('zone, position_criteria(criteria_order, name, name_es, description, description_es)')
          .eq('org_id', context.orgId)
          .eq('name', r.position)
          .limit(1)
          .maybeSingle(),
      ]);

      // Compute last-4 average
      let last4Avg: number | null = null;
      if (last4Res.data && last4Res.data.length > 0) {
        const validRatings = (last4Res.data as any[]).filter(
          (item) => item.rating_avg != null
        );
        if (validRatings.length > 0) {
          const sum = validRatings.reduce(
            (acc, item) => acc + item.rating_avg,
            0
          );
          last4Avg = Math.round((sum / validRatings.length) * 100) / 100;
        }
      }

      // Build criteria array sorted by order
      let criteria: { name: string; name_es: string | null; description: string; description_es: string | null }[] | null = null;
      if (criteriaRes.data?.position_criteria) {
        const rawCriteria = criteriaRes.data.position_criteria as any[];
        criteria = rawCriteria
          .sort((a: any, b: any) => a.criteria_order - b.criteria_order)
          .map((c: any) => ({ name: c.name, name_es: c.name_es || null, description: c.description, description_es: c.description_es || null }));
      }

      res.setHeader('Cache-Control', 'private, s-maxage=60, stale-while-revalidate=300');
      res.setHeader('Vary', 'Authorization');
      return res.status(200).json({
        rating: {
          id: r.id,
          position: r.position,
          zone: criteriaRes.data?.zone ?? null,
          rating_1: r.rating_1,
          rating_2: r.rating_2,
          rating_3: r.rating_3,
          rating_4: r.rating_4,
          rating_5: r.rating_5,
          rating_avg: r.rating_avg,
          notes: r.notes,
          rater_name: r.rater?.full_name ?? null,
          employee_name: r.employee?.full_name ?? null,
          employee_id: r.employee_id,
          created_at: r.created_at,
        },
        labels: labelsRes.data
          ? {
              label_1: labelsRes.data.label_1,
              label_2: labelsRes.data.label_2,
              label_3: labelsRes.data.label_3,
              label_4: labelsRes.data.label_4,
              label_5: labelsRes.data.label_5,
              label_1_es: labelsRes.data.label_1_es || null,
              label_2_es: labelsRes.data.label_2_es || null,
              label_3_es: labelsRes.data.label_3_es || null,
              label_4_es: labelsRes.data.label_4_es || null,
              label_5_es: labelsRes.data.label_5_es || null,
            }
          : null,
        criteria,
        last4_avg: last4Avg,
        thresholds,
      });
    } catch (error) {
      console.error('rating-detail API error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);
