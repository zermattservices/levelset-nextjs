/**
 * GET /api/billing/usage
 *
 * Returns AI usage stats for the current billing period.
 * Only relevant for Ultimate tier subscribers.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { AI_USAGE } from '@/lib/billing/constants';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createServerSupabaseClient();

  const { org_id } = req.query;

  if (!org_id || typeof org_id !== 'string') {
    return res.status(400).json({ error: 'org_id is required' });
  }

  try {
    // Get current subscription to determine location count for allowance calculation
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('quantity, plan_tier, current_period_start, current_period_end')
      .eq('org_id', org_id)
      .single();

    if (!subscription || subscription.plan_tier !== 'ultimate') {
      return res.status(200).json({
        usage: null,
        message: 'AI usage tracking is only available for Ultimate tier',
      });
    }

    // Calculate included allowance based on location count
    const locationCount = subscription.quantity || 1;
    const includedAllowance = locationCount * AI_USAGE.INCLUDED_QUERIES_PER_LOCATION;

    // Count queries this billing period from levi_usage_log
    const periodStart = subscription.current_period_start || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const { count: totalQueries } = await supabase
      .from('levi_usage_log')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org_id)
      .gte('created_at', periodStart);

    const queryCount = totalQueries || 0;
    const overageQueries = Math.max(0, queryCount - includedAllowance);
    const overageCostCents = overageQueries * AI_USAGE.OVERAGE_PRICE_CENTS;

    return res.status(200).json({
      usage: {
        totalQueries: queryCount,
        includedAllowance,
        overageQueries,
        overageCostCents,
        periodStart: subscription.current_period_start,
        periodEnd: subscription.current_period_end,
      },
    });
  } catch (err) {
    console.error('Error in billing/usage:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
