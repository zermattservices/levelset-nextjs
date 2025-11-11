import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';

const ALLOWED_STATUSES = ['Planned', 'Scheduled', 'Completed', 'Cancelled'] as const;

type AllowedStatus = (typeof ALLOWED_STATUSES)[number];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServerSupabaseClient();

  try {
    if (req.method === 'GET') {
      return await handleGet(req, res, supabase);
    }

    if (req.method === 'PATCH') {
      return await handlePatch(req, res, supabase);
    }

    res.setHeader('Allow', 'GET,PATCH');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('[Evaluations API] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse, supabase: ReturnType<typeof createServerSupabaseClient>) {
  const { location_id } = req.query;

  if (!location_id) {
    return res.status(400).json({ error: 'location_id is required' });
  }

  const { data, error } = await supabase
    .from('evaluations')
    .select('*')
    .eq('location_id', location_id)
    .order('evaluation_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Evaluations API] Failed to fetch evaluations:', error);
    return res.status(500).json({ error: 'Failed to fetch evaluations' });
  }

  return res.status(200).json({ evaluations: data ?? [] });
}

async function handlePatch(req: NextApiRequest, res: NextApiResponse, supabase: ReturnType<typeof createServerSupabaseClient>) {
  const { id, leader_id, evaluation_date, status, rating_status, notes } = req.body ?? {};

  if (!id) {
    return res.status(400).json({ error: 'Evaluation id is required' });
  }

  const updatePayload: Record<string, any> = {};

  if (leader_id !== undefined) {
    updatePayload.leader_id = leader_id || null;

    // Attempt to populate leader_name if a leader is supplied
    if (leader_id) {
      const { data: leader, error: leaderError } = await supabase
        .from('employees')
        .select('full_name')
        .eq('id', leader_id)
        .maybeSingle();

      if (leaderError) {
        console.error('[Evaluations API] Error fetching leader name:', leaderError);
        return res.status(500).json({ error: 'Failed to fetch leader information' });
      }

      updatePayload.leader_name = leader?.full_name ?? null;
    } else {
      updatePayload.leader_name = null;
    }
  }

  if (evaluation_date !== undefined) {
    updatePayload.evaluation_date = evaluation_date ? new Date(evaluation_date).toISOString().split('T')[0] : null;

    if (evaluation_date) {
      updatePayload.status = 'Scheduled';
    } else if (!status) {
      // If date cleared and status not provided, revert to Planned only if currently Scheduled
      updatePayload.status = 'Planned';
    }
  }

  if (status) {
    if (!ALLOWED_STATUSES.includes(status as AllowedStatus)) {
      return res.status(400).json({ error: `Status must be one of ${ALLOWED_STATUSES.join(', ')}` });
    }
    updatePayload.status = status;
  }

  if (rating_status !== undefined) {
    updatePayload.rating_status = !!rating_status;
  }

  if (notes !== undefined) {
    updatePayload.notes = notes;
  }

  if (Object.keys(updatePayload).length === 0) {
    return res.status(400).json({ error: 'No valid fields provided for update' });
  }

  updatePayload.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('evaluations')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) {
    console.error('[Evaluations API] Failed to update evaluation:', error);
    return res.status(500).json({ error: 'Failed to update evaluation' });
  }

  return res.status(200).json({ evaluation: data });
}

