/**
 * Native Form API: Position Labels
 * GET /api/native/forms/position-labels?location_id=<id>&position=<name>&zone=<FOH|BOH>
 *
 * Authenticated version of /api/mobile/[token]/position-labels
 * Returns the 5 rating criteria labels + descriptions for a specific position.
 */

import type { NextApiResponse } from 'next';
import { withPermissionAndContext, AuthenticatedRequest } from '@/lib/permissions/middleware';
import { P } from '@/lib/permissions/constants';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { validateLocationAccess } from '@/lib/native-auth';

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse,
  context: { userId: string; orgId: string }
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const locationId = Array.isArray(req.query.location_id) ? req.query.location_id[0] : req.query.location_id;
  const position = Array.isArray(req.query.position) ? req.query.position[0] : req.query.position;
  const zone = Array.isArray(req.query.zone) ? req.query.zone[0] : req.query.zone;

  if (!locationId) {
    return res.status(400).json({ error: 'Missing location_id' });
  }

  if (!position) {
    return res.status(400).json({ error: 'Missing position' });
  }

  const location = await validateLocationAccess(context.userId, context.orgId, locationId);
  if (!location) {
    return res.status(403).json({ error: 'Access denied for this location' });
  }

  const supabase = createServerSupabaseClient();

  let labels: string[] = [];
  let labels_es: string[] = [];
  let descriptions: string[] = [];
  let descriptions_es: string[] = [];

  // Primary source: position_criteria from org_positions
  if (location.org_id) {
    let orgPositionQuery = supabase
      .from('org_positions')
      .select('id')
      .eq('org_id', location.org_id)
      .ilike('name', position);

    if (zone) {
      orgPositionQuery = orgPositionQuery.eq('zone', zone);
    }

    const { data: orgPosition } = await orgPositionQuery.maybeSingle();

    if (orgPosition) {
      const { data: criteriaData } = await supabase
        .from('position_criteria')
        .select('name, name_es, description, description_es, criteria_order')
        .eq('position_id', orgPosition.id)
        .order('criteria_order', { ascending: true });

      if (criteriaData && criteriaData.length > 0) {
        labels = criteriaData.map((c) => c.name ?? '');
        labels_es = criteriaData.map((c, i) => (c as any).name_es || labels[i] || '');
        descriptions = criteriaData.map((c) => c.description ?? '');
        descriptions_es = criteriaData.map((c, i) => (c as any).description_es || descriptions[i] || '');
      }
    }
  }

  // Fallback: position_big5_labels (legacy location-based labels)
  if (labels.length === 0) {
    let { data, error } = await supabase
      .from('position_big5_labels')
      .select('label_1, label_2, label_3, label_4, label_5, label_1_es, label_2_es, label_3_es, label_4_es, label_5_es')
      .eq('location_id', location.id)
      .eq('position', position)
      .maybeSingle();

    if (error && error.message?.includes('label_1_es')) {
      const fallbackResult = await supabase
        .from('position_big5_labels')
        .select('label_1, label_2, label_3, label_4, label_5')
        .eq('location_id', location.id)
        .eq('position', position)
        .maybeSingle();

      if (fallbackResult.error) {
        console.error('[native] Failed to fetch labels', fallbackResult.error);
        return res.status(500).json({ error: 'Failed to load labels' });
      }
      data = fallbackResult.data as any;
      error = null;
    } else if (error) {
      console.error('[native] Failed to fetch labels', error);
      return res.status(500).json({ error: 'Failed to load labels' });
    }

    if (!data) {
      return res.status(404).json({ error: 'No labels found for position' });
    }

    const rawLabels = [data.label_1, data.label_2, data.label_3, data.label_4, data.label_5];
    const rawLabelsEs = [
      (data as any).label_1_es,
      (data as any).label_2_es,
      (data as any).label_3_es,
      (data as any).label_4_es,
      (data as any).label_5_es,
    ];

    labels = [];
    labels_es = [];
    for (let i = 0; i < rawLabels.length; i++) {
      if (rawLabels[i]) {
        labels.push(rawLabels[i]);
        labels_es.push(rawLabelsEs[i] || rawLabels[i]);
      }
    }

    descriptions = labels.map(() => '');
    descriptions_es = labels.map(() => '');
  }

  if (labels.length === 0) {
    return res.status(404).json({ error: 'No labels found for position' });
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    labels,
    labels_es,
    descriptions,
    descriptions_es,
  });
}

export default withPermissionAndContext(P.PE_SUBMIT_RATINGS, handler);
