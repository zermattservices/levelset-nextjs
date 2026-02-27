# Pricing Consolidation: 3 Tiers → 2 Tiers

**Date:** 2026-02-25
**Status:** Approved

## Context

Levelset currently has 3 pricing tiers (Core $99, Pro $179, Ultimate $249). We're consolidating to 2 tiers to simplify the pricing model. Levi AI moves from Ultimate-only into the new Pro tier.

## New Tier Structure

| | Core | Pro |
|---|---|---|
| Monthly | $99/location | $249/location |
| Annual (~10% off) | $89/location | $224/location |
| Recommended | No | Yes |
| Description | Essential tools for team management | Full platform with AI-powered intelligence |

**Core features:** Dashboard Access, Positional Excellence Dashboard, Positional Excellence Classic, Discipline Dashboard, Roster Management, Roster Sync, Mobile App Access, Organization Settings

**Pro features (everything in Core, plus):** Certifications, Roster Suggested Pay, Multi-Unit Functionality, Operational Excellence, Scheduling, Form Management, Documents, **Levi AI**

**AI usage (Pro only):** 500 queries/location/month included, $0.05/overage query

**Trial:** 30-day Pro trial for all new signups (full access including Levi AI)

## Constraints

- **Do NOT update `org_features`** for any existing org
- Old Stripe subscriptions continue billing at current prices until customer changes plans
- Feature sync only runs for new signups or explicit plan changes going forward

## Changes by Area

### 1. Source of Truth — `packages/shared/src/billing/constants.ts`

- `PlanTier` type: `'core' | 'pro'` (remove `'ultimate'`)
- `TIER_ORDER`: `['core', 'pro']`
- `PLAN_TIERS`: 2 entries with new pricing
  - Core: $99 monthly ($89 annual), recommended=false
  - Pro: $249 monthly ($224 annual), recommended=true, description updated
- `FEATURE_GROUPS`: 2 groups
  - Core Features (tier: 'core'): dashboard_access, positional_excellence, positional_excellence_classic, discipline_dashboard, roster_management, roster_sync, mobile_app_access, organization_settings
  - Pro Features (tier: 'pro'): certifications, roster_suggested_pay, multi_unit, operational_excellence, scheduling, form_management, documents, levi_ai

### 2. Stripe — `apps/dashboard/lib/billing/constants.ts`

- `getStripePriceId()`: Updated for 2 tiers (core/pro only)
- `getTierFromPriceId()`: Maps BOTH old and new price IDs
  - Old core monthly/annual → 'core'
  - Old pro monthly/annual → 'core'
  - Old ultimate monthly/annual → 'pro'
  - New core monthly/annual → 'core'
  - New pro monthly/annual → 'pro'
- Remove ULTIMATE env var references from new price lookups
- Keep old env vars for backward compatibility in `getTierFromPriceId`

### 3. Stripe Setup Script — `scripts/setup-stripe-products.ts`

- Creates 2 products: "Levelset Core" and "Levelset Pro"
- 4 prices total (core monthly/annual, pro monthly/annual)
- Outputs new env var values

### 4. Database Migration — `supabase/migrations/YYYYMMDD_consolidate_pricing_tiers.sql`

```sql
-- Map old subscription plans to new 2-tier model
UPDATE orgs SET subscription_plan = 'core' WHERE subscription_plan IN ('core', 'pro');
UPDATE orgs SET subscription_plan = 'pro' WHERE subscription_plan = 'ultimate';

UPDATE subscriptions SET plan_tier = 'core' WHERE plan_tier IN ('core', 'pro');
UPDATE subscriptions SET plan_tier = 'pro' WHERE plan_tier = 'ultimate';
```

**Does NOT touch `org_features` table.**

### 5. Onboarding — `apps/dashboard/pages/api/onboarding/create-org.ts`

- Trial tier: `'ultimate'` → `'pro'`
- Feature sync: `syncFeaturesFromTier(supabase, orgId, 'pro')` (same behavior, new tier name)

### 6. Marketing Site

**Files affected:**
- `apps/marketing/src/lib/features.ts` — Update tier assignments: old 'ultimate' features → 'pro', old 'pro' features → 'pro'
- `apps/marketing/src/components/pricing/PricingTable.tsx` — Automatically adapts (loops TIER_ORDER)
- `apps/marketing/src/components/pricing/PricingCard.tsx` — No changes needed (data-driven)
- `apps/marketing/src/app/pricing/PricingPageContent.tsx` — Comparison table adapts, update copy
- `apps/marketing/src/components/cta/TrialModal.tsx` — Shows 2 tiers (data-driven from TIER_ORDER)
- `apps/marketing/src/components/layout/FeaturesDropdown.tsx` — Update tier grouping to 2 columns

### 7. Dashboard Admin

**Files affected:**
- `apps/dashboard/components/OrgSettings/BillingTab.tsx` — Adapts via TIER_ORDER
- `apps/dashboard/components/OrgSettings/PlanComparisonModal.tsx` — Remove 'ultimate' color/references
- `apps/dashboard/components/AdminMode/OrgSubscriptionTab.tsx` — Update default tier references
- `apps/dashboard/pages/api/billing/checkout.ts` — Adapts via PlanTier type
- `apps/dashboard/pages/api/billing/change-plan.ts` — Adapts via PlanTier type
- `apps/dashboard/pages/api/webhooks/stripe.ts` — Uses updated getTierFromPriceId

### 8. Feature Page Tier Badges

- `apps/marketing/src/lib/features.ts`: Update tier assignments
  - positional-ratings, discipline, roster, evaluations, mobile-app → 'core'
  - scheduling, setups, forms, levi-ai → 'pro'
- `apps/marketing/src/components/templates/FeaturePageTemplate.tsx`: Remove 'ultimate' from TIER_CONFIG

## Verification

1. `pnpm typecheck` passes (no 'ultimate' references in typed code)
2. `pnpm build` succeeds
3. Marketing pricing page shows 2 cards, aligned, correct prices
4. Feature dropdown shows 2 tier groups
5. Feature pages show correct tier badges (Core or Pro only)
6. Trial modal shows 2 tiers
7. No existing org's `org_features` are modified
