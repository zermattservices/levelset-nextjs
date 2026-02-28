import { createServerSupabaseClient } from '@/lib/supabase-server';
import { recalculateEngagementScore } from '@/lib/crm/engagement';
import { recalculateLeadValue, recalculateStoreValues } from '@/lib/crm/value';
import type { NextApiRequest, NextApiResponse } from 'next';

// Maps pipeline stages to their corresponding timestamp columns
const STAGE_TIMESTAMP_MAP: Record<string, string> = {
  contacted: 'contacted_at',
  trial: 'trial_started_at',
  onboarded: 'onboarded_at',
  converted: 'converted_at',
  lost: 'lost_at',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServerSupabaseClient();

  if (req.method === 'POST') {
    const { id } = req.query;
    const { stage, reason } = req.body;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Lead ID is required' });
    }

    if (!stage || typeof stage !== 'string') {
      return res.status(400).json({ error: 'stage is required' });
    }

    // Fetch the current lead to get old stage
    const { data: lead, error: fetchError } = await supabase
      .from('leads')
      .select('pipeline_stage')
      .eq('id', id)
      .single();

    if (fetchError || !lead) {
      console.error('Error fetching lead:', fetchError);
      return res.status(404).json({ error: 'Lead not found' });
    }

    const oldStage = lead.pipeline_stage;
    const now = new Date().toISOString();

    // Build the update payload
    const updateData: Record<string, any> = {
      pipeline_stage: stage,
      stage_changed_at: now,
    };

    // Set the stage-specific timestamp
    const timestampColumn = STAGE_TIMESTAMP_MAP[stage];
    if (timestampColumn) {
      updateData[timestampColumn] = now;
    }

    // Handle lost stage with reason
    if (stage === 'lost' && reason) {
      updateData.lost_reason = reason;
    }

    // Update the lead
    const { data: updatedLead, error: updateError } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating lead stage:', updateError);
      return res.status(500).json({ error: 'Failed to update lead stage' });
    }

    // Create a stage_change event in lead_events
    const { error: eventError } = await supabase
      .from('lead_events')
      .insert({
        lead_id: id,
        event_type: 'stage_change',
        event_data: {
          old_stage: oldStage,
          new_stage: stage,
        },
      });

    if (eventError) {
      console.error('Error creating stage change event:', eventError);
      // Don't fail the request -- the stage update already succeeded
    }

    // Recalculate engagement score and value after stage change
    recalculateEngagementScore(id as string).catch((err) =>
      console.error('Engagement score recalc error:', err)
    );
    recalculateLeadValue(id as string).catch((err) =>
      console.error('Value recalc error:', err)
    );

    // If lead has a store_number, recalculate values for all leads at that store
    if (updatedLead.store_number) {
      recalculateStoreValues(updatedLead.store_number).catch((err) =>
        console.error('Store values recalc error:', err)
      );
    }

    return res.status(200).json(updatedLead);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
