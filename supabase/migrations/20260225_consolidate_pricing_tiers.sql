-- Consolidate pricing from 3 tiers to 2 tiers
-- Old core/pro -> new core, old ultimate -> new pro
-- IMPORTANT: Does NOT touch org_features table (preserves existing feature flags)

-- Update orgs.subscription_plan using CASE to avoid ordering issues
UPDATE orgs
SET subscription_plan = CASE
  WHEN subscription_plan = 'ultimate' THEN 'pro'
  WHEN subscription_plan IN ('core', 'pro') THEN 'core'
  ELSE subscription_plan
END
WHERE subscription_plan IN ('core', 'pro', 'ultimate');

-- Update subscriptions.plan_tier
UPDATE subscriptions
SET plan_tier = CASE
  WHEN plan_tier = 'ultimate' THEN 'pro'
  WHEN plan_tier IN ('core', 'pro') THEN 'core'
  ELSE plan_tier
END
WHERE plan_tier IN ('core', 'pro', 'ultimate');
