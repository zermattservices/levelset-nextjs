/**
 * Feature Flag Sync Service
 *
 * Syncs org_features rows based on subscription tier.
 * Called by webhook handler and admin UI.
 *
 * When custom_pricing = false: features auto-sync from tier.
 * When custom_pricing = true: sync is skipped (features managed manually).
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { PlanTier, getFeaturesForTier, getAllFeatureKeys, isActiveSubscription, SubscriptionStatus } from './constants';

/**
 * Sync feature flags for an org based on their subscription tier.
 * Skips sync if the org has custom_pricing enabled.
 */
export async function syncFeaturesFromTier(
  supabase: SupabaseClient,
  orgId: string,
  planTier: PlanTier
): Promise<{ synced: boolean; error?: string }> {
  // Check if org has custom pricing (skip sync if so)
  const { data: org, error: orgError } = await supabase
    .from('orgs')
    .select('custom_pricing')
    .eq('id', orgId)
    .single();

  if (orgError) {
    return { synced: false, error: `Failed to fetch org: ${orgError.message}` };
  }

  if (org?.custom_pricing) {
    return { synced: false, error: 'Skipped — org has custom pricing enabled' };
  }

  const enabledKeys = new Set(getFeaturesForTier(planTier));
  const allKeys = getAllFeatureKeys();

  // Upsert all feature flags
  const upsertRows = allKeys.map(key => ({
    org_id: orgId,
    feature_key: key,
    enabled: enabledKeys.has(key),
    updated_at: new Date().toISOString(),
  }));

  const { error: upsertError } = await supabase
    .from('org_features')
    .upsert(upsertRows, { onConflict: 'org_id,feature_key' });

  if (upsertError) {
    return { synced: false, error: `Failed to sync features: ${upsertError.message}` };
  }

  // Update subscription_plan on orgs table
  const { error: updateError } = await supabase
    .from('orgs')
    .update({ subscription_plan: planTier })
    .eq('id', orgId);

  if (updateError) {
    return { synced: false, error: `Failed to update org plan: ${updateError.message}` };
  }

  return { synced: true };
}

/**
 * Clear all feature flags for an org (e.g., when subscription is canceled).
 * Only clears if custom_pricing is false.
 */
export async function clearFeatures(
  supabase: SupabaseClient,
  orgId: string
): Promise<{ cleared: boolean; error?: string }> {
  const { data: org, error: orgError } = await supabase
    .from('orgs')
    .select('custom_pricing')
    .eq('id', orgId)
    .single();

  if (orgError) {
    return { cleared: false, error: `Failed to fetch org: ${orgError.message}` };
  }

  if (org?.custom_pricing) {
    return { cleared: false, error: 'Skipped — org has custom pricing enabled' };
  }

  const allKeys = getAllFeatureKeys();

  const upsertRows = allKeys.map(key => ({
    org_id: orgId,
    feature_key: key,
    enabled: false,
    updated_at: new Date().toISOString(),
  }));

  const { error: upsertError } = await supabase
    .from('org_features')
    .upsert(upsertRows, { onConflict: 'org_id,feature_key' });

  if (upsertError) {
    return { cleared: false, error: `Failed to clear features: ${upsertError.message}` };
  }

  // Clear subscription_plan
  const { error: updateError } = await supabase
    .from('orgs')
    .update({ subscription_plan: null })
    .eq('id', orgId);

  if (updateError) {
    return { cleared: false, error: `Failed to update org plan: ${updateError.message}` };
  }

  return { cleared: true };
}

/**
 * Handle subscription status change — sync or clear features based on status.
 */
export async function handleSubscriptionStatusChange(
  supabase: SupabaseClient,
  orgId: string,
  planTier: PlanTier,
  status: SubscriptionStatus
): Promise<void> {
  if (isActiveSubscription(status)) {
    await syncFeaturesFromTier(supabase, orgId, planTier);
  } else if (status === 'canceled' || status === 'unpaid') {
    await clearFeatures(supabase, orgId);
  }
  // For 'incomplete' and 'paused', keep current features (grace period)
}
