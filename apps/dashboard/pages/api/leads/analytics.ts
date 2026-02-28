import { createServerSupabaseClient } from '@/lib/supabase-server';
import type { NextApiRequest, NextApiResponse } from 'next';

// Pipeline stages in order for conversion rate calculation
const PIPELINE_STAGES = ['new', 'contacted', 'trial', 'onboarded', 'converted'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServerSupabaseClient();

  if (req.method === 'GET') {
    try {
      // Fetch all leads in one query to compute analytics in-memory
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('pipeline_stage, estimated_value_cents, lost_reason');

      if (leadsError) {
        console.error('Error fetching leads for analytics:', leadsError);
        return res.status(500).json({ error: 'Failed to fetch leads analytics' });
      }

      const allLeads = leads || [];

      // Stage counts
      const stageCounts: Record<string, number> = {};
      for (const lead of allLeads) {
        const stage = lead.pipeline_stage || 'new';
        stageCounts[stage] = (stageCounts[stage] || 0) + 1;
      }

      // Total value (non-lost leads)
      const totalValue = allLeads
        .filter((lead) => lead.pipeline_stage !== 'lost')
        .reduce((sum, lead) => sum + (lead.estimated_value_cents || 0), 0);

      // Conversion rates between adjacent stages
      // Rate = count that reached next stage / count that reached current stage
      const conversionRates: Record<string, number> = {};
      for (let i = 0; i < PIPELINE_STAGES.length - 1; i++) {
        const currentStage = PIPELINE_STAGES[i];
        const nextStage = PIPELINE_STAGES[i + 1];

        // Count leads that have reached at least the current stage
        const currentStageIndex = i;
        const nextStageIndex = i + 1;

        const reachedCurrent = allLeads.filter((lead) => {
          const leadIndex = PIPELINE_STAGES.indexOf(lead.pipeline_stage);
          // Lead is at or past the current stage (or lost, which could have been at any stage)
          return leadIndex >= currentStageIndex || lead.pipeline_stage === 'lost';
        }).length;

        const reachedNext = allLeads.filter((lead) => {
          const leadIndex = PIPELINE_STAGES.indexOf(lead.pipeline_stage);
          return leadIndex >= nextStageIndex;
        }).length;

        const key = `${currentStage}_to_${nextStage}`;
        conversionRates[key] = reachedCurrent > 0
          ? Math.round((reachedNext / reachedCurrent) * 10000) / 100
          : 0;
      }

      // Lost reasons grouped with counts
      const lostReasonMap: Record<string, number> = {};
      for (const lead of allLeads) {
        if (lead.pipeline_stage === 'lost' && lead.lost_reason) {
          lostReasonMap[lead.lost_reason] = (lostReasonMap[lead.lost_reason] || 0) + 1;
        }
      }
      const lostReasons = Object.entries(lostReasonMap).map(([reason, count]) => ({
        reason,
        count,
      }));

      // Recent events (last 10) with lead info joined
      const { data: recentEvents, error: eventsError } = await supabase
        .from('lead_events')
        .select('*, leads(id, first_name, last_name, email)')
        .order('created_at', { ascending: false })
        .limit(10);

      if (eventsError) {
        console.error('Error fetching recent events:', eventsError);
        // Don't fail the whole response for this
      }

      return res.status(200).json({
        stageCounts,
        totalValue,
        conversionRates,
        lostReasons,
        recentEvents: recentEvents || [],
      });
    } catch (error) {
      console.error('Analytics API error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
