/**
 * Org Features Provider
 * Fetches feature flags from org_features table and exposes a hasFeature() hook.
 * Levelset Admin always has all features enabled.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { createSupabaseClient } from '@/util/supabase/component';
import { useAuth } from '@/lib/providers/AuthProvider';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';

// ---------------------------------------------------------------------------
// Feature key constants — keep in sync with OrgFeaturesTab.tsx FEATURE_GROUPS
// ---------------------------------------------------------------------------

export const F = {
  DASHBOARD_ACCESS: 'dashboard_access',
  POSITIONAL_EXCELLENCE: 'positional_excellence',
  POSITIONAL_EXCELLENCE_CLASSIC: 'positional_excellence_classic',
  DISCIPLINE_DASHBOARD: 'discipline_dashboard',
  ROSTER_MANAGEMENT: 'roster_management',
  ROSTER_SYNC: 'roster_sync',
  MOBILE_APP_ACCESS: 'mobile_app_access',
  ORGANIZATION_SETTINGS: 'organization_settings',
  CERTIFICATIONS: 'certifications',
  ROSTER_SUGGESTED_PAY: 'roster_suggested_pay',
  MULTI_UNIT: 'multi_unit',
  OPERATIONAL_EXCELLENCE: 'operational_excellence',
  SCHEDULING: 'scheduling',
  FORM_MANAGEMENT: 'form_management',
  LEVI_AI: 'levi_ai',
  DOCUMENTS: 'documents',
} as const;

export type FeatureKey = (typeof F)[keyof typeof F];

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface OrgFeaturesContextValue {
  /** Check if the current org has a feature enabled. Levelset Admin always returns true. */
  hasFeature: (key: FeatureKey) => boolean;
  /** Loading state — true while feature flags are being fetched */
  loading: boolean;
}

const OrgFeaturesContext = createContext<OrgFeaturesContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function OrgFeaturesProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const { selectedLocationOrgId } = useLocationContext();
  const supabase = useMemo(() => createSupabaseClient(), []);

  const [features, setFeatures] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const isLevelsetAdmin = auth.role === 'Levelset Admin';
  const orgId = selectedLocationOrgId || auth.org_id;

  useEffect(() => {
    // Levelset Admin gets everything — no need to fetch
    if (isLevelsetAdmin) {
      setFeatures(new Set()); // not used but reset for clarity
      setLoading(false);
      return;
    }

    if (!orgId) {
      setFeatures(new Set());
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchFeatures() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('org_features')
          .select('feature_key, enabled')
          .eq('org_id', orgId);

        if (error) throw error;
        if (cancelled) return;

        const enabledSet = new Set<string>();
        for (const row of data || []) {
          if (row.enabled) {
            enabledSet.add(row.feature_key);
          }
        }
        setFeatures(enabledSet);
      } catch (err) {
        console.error('Failed to load org features:', err);
        if (!cancelled) setFeatures(new Set());
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchFeatures();
    return () => { cancelled = true; };
  }, [orgId, isLevelsetAdmin, supabase]);

  const hasFeature = useCallback(
    (key: FeatureKey): boolean => {
      if (isLevelsetAdmin) return true;
      return features.has(key);
    },
    [isLevelsetAdmin, features]
  );

  const value = useMemo(() => ({ hasFeature, loading }), [hasFeature, loading]);

  return (
    <OrgFeaturesContext.Provider value={value}>
      {children}
    </OrgFeaturesContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Access org feature flags.
 *
 * Usage:
 *   const { hasFeature } = useOrgFeatures();
 *   if (hasFeature(F.OPERATIONAL_EXCELLENCE)) { ... }
 */
export function useOrgFeatures(): OrgFeaturesContextValue {
  const context = useContext(OrgFeaturesContext);
  if (!context) {
    // Safe defaults when used outside provider
    return {
      hasFeature: () => false,
      loading: true,
    };
  }
  return context;
}
