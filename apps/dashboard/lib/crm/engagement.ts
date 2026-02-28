/**
 * Engagement score calculation for CRM leads.
 *
 * Point-based scoring, recalculated on each new event:
 *   - form_submit: 10 points
 *   - page_view: 1 point (capped at 20 total)
 *   - email_opened: 3 points
 *   - email_clicked: 5 points
 *   - return_visit: 2 points
 *
 * Multiplier: 1.5x if multiple leads share the same store_number.
 * Decay: Events older than 30 days contribute half points.
 */

import { createServerSupabaseClient } from '@/lib/supabase-server';

const POINTS: Record<string, number> = {
  form_submit: 10,
  page_view: 1,
  email_opened: 3,
  email_clicked: 5,
  return_visit: 2,
};

const PAGE_VIEW_CAP = 20;
const DECAY_DAYS = 30;

export async function recalculateEngagementScore(leadId: string): Promise<number> {
  const supabase = createServerSupabaseClient();

  // Fetch all events for this lead
  const { data: events, error: eventsError } = await supabase
    .from('lead_events')
    .select('event_type, created_at')
    .eq('lead_id', leadId);

  if (eventsError) {
    console.error('Error fetching lead events for scoring:', eventsError);
    return 0;
  }

  const now = Date.now();
  const decayCutoff = now - DECAY_DAYS * 24 * 60 * 60 * 1000;
  let pageViewCount = 0;
  let score = 0;

  for (const event of events || []) {
    const points = POINTS[event.event_type];
    if (points == null) continue;

    // Cap page views
    if (event.event_type === 'page_view') {
      if (pageViewCount >= PAGE_VIEW_CAP) continue;
      pageViewCount++;
    }

    // Apply decay for old events
    const eventTime = new Date(event.created_at).getTime();
    const multiplier = eventTime < decayCutoff ? 0.5 : 1;

    score += points * multiplier;
  }

  // Check for store_number multiplier
  const { data: lead } = await supabase
    .from('leads')
    .select('store_number')
    .eq('id', leadId)
    .single();

  if (lead?.store_number) {
    const { count } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('store_number', lead.store_number);

    if (count && count > 1) {
      score = score * 1.5;
    }
  }

  const finalScore = Math.round(score);

  // Update the lead's engagement_score
  const { error: updateError } = await supabase
    .from('leads')
    .update({ engagement_score: finalScore, updated_at: new Date().toISOString() })
    .eq('id', leadId);

  if (updateError) {
    console.error('Error updating engagement score:', updateError);
  }

  return finalScore;
}
