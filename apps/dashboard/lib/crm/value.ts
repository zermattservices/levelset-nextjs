/**
 * Pipeline value calculation for CRM leads.
 *
 * Per-store annual value: $249/month x 11 months (minus free trial) = $2,739
 * In cents: 273_900
 *
 * Deduplication: If two leads share the same store_number, only the one
 * with the most advanced pipeline stage "owns" the store value.
 */

import { createServerSupabaseClient } from '@/lib/supabase-server';

const VALUE_PER_STORE_CENTS = 273_900; // $249 * 11 * 100

const STAGE_RANK: Record<string, number> = {
  new: 0,
  contacted: 1,
  trial: 2,
  onboarded: 3,
  converted: 4,
  lost: -1,
};

/**
 * Recalculate estimated_value_cents for a single lead.
 * Sets value to VALUE_PER_STORE_CENTS unless another lead with the same
 * store_number has a more advanced pipeline stage.
 */
export async function recalculateLeadValue(leadId: string): Promise<number> {
  const supabase = createServerSupabaseClient();

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('id, store_number, pipeline_stage, is_multi_unit')
    .eq('id', leadId)
    .single();

  if (leadError || !lead) {
    console.error('Error fetching lead for value calc:', leadError);
    return 0;
  }

  // Lost leads have zero value
  if (lead.pipeline_stage === 'lost') {
    await supabase
      .from('leads')
      .update({ estimated_value_cents: 0, updated_at: new Date().toISOString() })
      .eq('id', leadId);
    return 0;
  }

  let value = VALUE_PER_STORE_CENTS;

  // Deduplication: check if another lead with the same store number
  // has a more advanced stage
  if (lead.store_number) {
    const { data: sameStoreLeads } = await supabase
      .from('leads')
      .select('id, pipeline_stage')
      .eq('store_number', lead.store_number)
      .neq('pipeline_stage', 'lost');

    if (sameStoreLeads && sameStoreLeads.length > 1) {
      const myRank = STAGE_RANK[lead.pipeline_stage] ?? 0;
      const someoneHigher = sameStoreLeads.some(
        (other) =>
          other.id !== leadId &&
          (STAGE_RANK[other.pipeline_stage] ?? 0) > myRank
      );

      if (someoneHigher) {
        value = 0; // Another lead "owns" this store's value
      }
    }
  }

  await supabase
    .from('leads')
    .update({ estimated_value_cents: value, updated_at: new Date().toISOString() })
    .eq('id', leadId);

  return value;
}

/**
 * Recalculate values for all leads sharing a store_number.
 * Call this when a lead's stage changes to ensure dedup is correct.
 */
export async function recalculateStoreValues(storeNumber: string): Promise<void> {
  const supabase = createServerSupabaseClient();

  const { data: leads } = await supabase
    .from('leads')
    .select('id, pipeline_stage')
    .eq('store_number', storeNumber);

  if (!leads || leads.length === 0) return;

  // Find the lead with the highest stage rank (excluding lost)
  const activeLeads = leads.filter((l) => l.pipeline_stage !== 'lost');
  let highestRank = -1;
  let ownerId: string | null = null;

  for (const lead of activeLeads) {
    const rank = STAGE_RANK[lead.pipeline_stage] ?? 0;
    if (rank > highestRank) {
      highestRank = rank;
      ownerId = lead.id;
    }
  }

  // Update all leads for this store
  for (const lead of leads) {
    const value =
      lead.pipeline_stage === 'lost'
        ? 0
        : lead.id === ownerId
          ? VALUE_PER_STORE_CENTS
          : 0;

    await supabase
      .from('leads')
      .update({ estimated_value_cents: value, updated_at: new Date().toISOString() })
      .eq('id', lead.id);
  }
}
