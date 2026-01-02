import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchLocationByToken } from '@/lib/mobile-location';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const tokenParam = req.query.token;
  const positionParam = req.query.position;
  const zoneParam = req.query.zone;
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;
  const position = Array.isArray(positionParam) ? positionParam[0] : positionParam;
  const zone = Array.isArray(zoneParam) ? zoneParam[0] : zoneParam;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Missing token' });
  }

  if (!position || typeof position !== 'string') {
    return res.status(400).json({ error: 'Missing position' });
  }

  const location = await fetchLocationByToken(token);

  if (!location) {
    return res.status(404).json({ error: 'Location not found' });
  }

  const supabase = createServerSupabaseClient();
  
  let labels: string[] = [];
  let labels_es: string[] = [];
  let descriptions: string[] = [];

  let descriptions_es: string[] = [];

  // Primary source: position_criteria from org_positions (new org-level settings)
  if (location.org_id) {
    // First find the org position ID
    // Include zone filter if provided (handles positions with same name in different zones)
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
      // Fetch criteria with names, descriptions, and Spanish translations
      const { data: criteriaData } = await supabase
        .from('position_criteria')
        .select('name, name_es, description, description_es, criteria_order')
        .eq('position_id', orgPosition.id)
        .order('criteria_order', { ascending: true });

      if (criteriaData && criteriaData.length > 0) {
        labels = criteriaData.map(c => c.name ?? '');
        // Keep Spanish arrays aligned - use English as fallback if Spanish is empty
        labels_es = criteriaData.map((c, i) => (c as any).name_es || labels[i] || '');
        descriptions = criteriaData.map(c => c.description ?? '');
        descriptions_es = criteriaData.map((c, i) => (c as any).description_es || descriptions[i] || '');
      }
    }
  }

  // Fallback: position_big5_labels (legacy location-based labels)
  if (labels.length === 0) {
    // Try to load with Spanish columns, fallback to base columns if migration hasn't been run
    let { data, error } = await supabase
      .from('position_big5_labels')
      .select('label_1, label_2, label_3, label_4, label_5, label_1_es, label_2_es, label_3_es, label_4_es, label_5_es')
      .eq('location_id', location.id)
      .eq('position', position)
      .maybeSingle();

    // If query failed due to missing Spanish columns, try without them
    if (error && error.message?.includes('label_1_es')) {
      console.warn('[mobile] Spanish label columns not found, falling back to base columns', token, position);
      const fallbackResult = await supabase
        .from('position_big5_labels')
        .select('label_1, label_2, label_3, label_4, label_5')
        .eq('location_id', location.id)
        .eq('position', position)
        .maybeSingle();

      if (fallbackResult.error) {
        console.error('[mobile] Failed to fetch labels for token', token, 'position', position, fallbackResult.error);
        return res.status(500).json({ error: 'Failed to load labels' });
      }
      data = fallbackResult.data as any;
      error = null;
    } else if (error) {
      console.error('[mobile] Failed to fetch labels for token', token, 'position', position, error);
      return res.status(500).json({ error: 'Failed to load labels' });
    }

    if (!data) {
      return res.status(404).json({ error: 'No labels found for position' });
    }

    // Build labels array, filtering out nulls but keeping track of indices
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
        // Use Spanish if available, otherwise fall back to English
        labels_es.push(rawLabelsEs[i] || rawLabels[i]);
      }
    }

    // Descriptions are empty for legacy positions
    descriptions = labels.map(() => '');
    descriptions_es = labels.map(() => '');
  }

  // If we still have no labels, return 404
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

