/**
 * OrgFeaturesTab
 * Features configuration tab for organization modal
 */

import * as React from 'react';
import {
  Box,
  Typography,
  Checkbox,
  CircularProgress,
} from '@mui/material';
import { createSupabaseClient } from '@/util/supabase/component';
import styles from './OrgFeaturesTab.module.css';

interface OrgFeaturesTabProps {
  orgId: string;
}

interface FeatureDefinition {
  key: string;
  label: string;
  description: string;
}

interface FeatureGroup {
  name: string;
  tier: 'core' | 'pro' | 'ultimate';
  features: FeatureDefinition[];
}

const FEATURE_GROUPS: FeatureGroup[] = [
  {
    name: 'Core Features',
    tier: 'core',
    features: [
      { key: 'dashboard_access', label: 'Dashboard Access', description: 'Access to the main dashboard' },
      { key: 'positional_excellence', label: 'Positional Excellence Dashboard', description: 'PE ratings and analytics' },
      { key: 'positional_excellence_classic', label: 'Positional Excellence Classic', description: 'Classic PE interface' },
      { key: 'discipline_dashboard', label: 'Discipline Dashboard', description: 'Discipline tracking and management' },
      { key: 'roster_management', label: 'Roster Management', description: 'Employee roster management' },
      { key: 'roster_sync', label: 'Roster Sync', description: 'HotSchedules roster synchronization' },
      { key: 'mobile_app_access', label: 'Mobile App Access', description: 'Access to Levelset mobile app' },
      { key: 'organization_settings', label: 'Organization Settings', description: 'Configure organization settings' },
    ],
  },
  {
    name: 'Pro Features',
    tier: 'pro',
    features: [
      { key: 'certifications', label: 'Certifications', description: 'Employee certification tracking' },
      { key: 'roster_suggested_pay', label: 'Roster Suggested Pay', description: 'Automated pay recommendations' },
      { key: 'multi_unit', label: 'Multi-Unit Functionality', description: 'Manage multiple locations' },
    ],
  },
  {
    name: 'Ultimate Features',
    tier: 'ultimate',
    features: [],
  },
];

const ALL_FEATURE_KEYS = FEATURE_GROUPS.flatMap(g => g.features.map(f => f.key));

export function OrgFeaturesTab({ orgId }: OrgFeaturesTabProps) {
  const [features, setFeatures] = React.useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const supabase = React.useMemo(() => createSupabaseClient(), []);

  // Fetch current feature settings
  React.useEffect(() => {
    async function fetchFeatures() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('org_features')
          .select('feature_key, enabled')
          .eq('org_id', orgId);

        if (error) throw error;

        const featureMap = new Map<string, boolean>();
        // Initialize all features as false
        for (const key of ALL_FEATURE_KEYS) {
          featureMap.set(key, false);
        }
        // Set actual values from database
        for (const f of data || []) {
          featureMap.set(f.feature_key, f.enabled);
        }
        setFeatures(featureMap);
      } catch (err) {
        console.error('Error fetching features:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchFeatures();
  }, [orgId, supabase]);

  // Toggle a single feature
  const toggleFeature = async (featureKey: string, enabled: boolean) => {
    setSaving(true);
    try {
      // Optimistic update
      setFeatures(prev => {
        const newMap = new Map(prev);
        newMap.set(featureKey, enabled);
        return newMap;
      });

      const { error } = await supabase
        .from('org_features')
        .upsert({
          org_id: orgId,
          feature_key: featureKey,
          enabled,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'org_id,feature_key' });

      if (error) throw error;
    } catch (err) {
      console.error('Error toggling feature:', err);
      // Revert on error
      setFeatures(prev => {
        const newMap = new Map(prev);
        newMap.set(featureKey, !enabled);
        return newMap;
      });
    } finally {
      setSaving(false);
    }
  };

  // Toggle all features in a group
  const toggleGroup = async (group: FeatureGroup, enabled: boolean) => {
    if (group.features.length === 0) return;
    
    setSaving(true);
    try {
      // Optimistic update
      setFeatures(prev => {
        const newMap = new Map(prev);
        for (const feature of group.features) {
          newMap.set(feature.key, enabled);
        }
        return newMap;
      });

      // Batch update all features in the group
      const updates = group.features.map(f => ({
        org_id: orgId,
        feature_key: f.key,
        enabled,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('org_features')
        .upsert(updates, { onConflict: 'org_id,feature_key' });

      if (error) throw error;
    } catch (err) {
      console.error('Error toggling group:', err);
      // Revert on error
      setFeatures(prev => {
        const newMap = new Map(prev);
        for (const feature of group.features) {
          newMap.set(feature.key, !enabled);
        }
        return newMap;
      });
    } finally {
      setSaving(false);
    }
  };

  // Check if all features in a group are enabled
  const isGroupFullyEnabled = (group: FeatureGroup): boolean => {
    if (group.features.length === 0) return false;
    return group.features.every(f => features.get(f.key) === true);
  };

  // Check if some features in a group are enabled
  const isGroupPartiallyEnabled = (group: FeatureGroup): boolean => {
    if (group.features.length === 0) return false;
    const enabledCount = group.features.filter(f => features.get(f.key) === true).length;
    return enabledCount > 0 && enabledCount < group.features.length;
  };

  // Get tier badge color
  const getTierColor = (tier: 'core' | 'pro' | 'ultimate') => {
    switch (tier) {
      case 'core':
        return { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' };
      case 'pro':
        return { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' };
      case 'ultimate':
        return { bg: '#f3e8ff', text: '#6b21a8', border: '#d8b4fe' };
      default:
        return { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' };
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <CircularProgress size={32} sx={{ color: '#31664a' }} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Typography
          sx={{
            fontFamily: '"Satoshi", sans-serif',
            fontSize: '14px',
            color: '#666',
          }}
        >
          Configure which features this organization has access to.
        </Typography>
        {saving && (
          <CircularProgress size={16} sx={{ color: '#31664a' }} />
        )}
      </div>

      {FEATURE_GROUPS.map(group => {
        const tierColor = getTierColor(group.tier);
        const isFullyEnabled = isGroupFullyEnabled(group);
        const isPartiallyEnabled = isGroupPartiallyEnabled(group);

        return (
          <div key={group.name} className={styles.featureGroup}>
            {/* Group header */}
            <div className={styles.groupHeader}>
              <div className={styles.groupHeaderLeft}>
                <Checkbox
                  checked={isFullyEnabled}
                  indeterminate={isPartiallyEnabled}
                  onChange={(e) => toggleGroup(group, e.target.checked)}
                  disabled={group.features.length === 0}
                  sx={{
                    padding: '4px',
                    color: '#31664a',
                    '&.Mui-checked': { color: '#31664a' },
                    '&.MuiCheckbox-indeterminate': { color: '#31664a' },
                  }}
                />
                <Typography
                  sx={{
                    fontFamily: '"Satoshi", sans-serif',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#0d1b14',
                  }}
                >
                  {group.name}
                </Typography>
                <span 
                  className={styles.tierBadge}
                  style={{
                    backgroundColor: tierColor.bg,
                    color: tierColor.text,
                    borderColor: tierColor.border,
                  }}
                >
                  {group.tier.toUpperCase()}
                </span>
              </div>
              <Typography
                sx={{
                  fontFamily: '"Satoshi", sans-serif',
                  fontSize: '12px',
                  color: '#999',
                }}
              >
                {group.features.filter(f => features.get(f.key)).length} / {group.features.length} enabled
              </Typography>
            </div>

            {/* Features list */}
            {group.features.length > 0 ? (
              <div className={styles.featureList}>
                {group.features.map(feature => (
                  <div key={feature.key} className={styles.featureRow}>
                    <div className={styles.featureRowLeft}>
                      <Checkbox
                        checked={features.get(feature.key) || false}
                        onChange={(e) => toggleFeature(feature.key, e.target.checked)}
                        sx={{
                          padding: '4px',
                          color: '#d1d5db',
                          '&.Mui-checked': { color: '#31664a' },
                        }}
                      />
                      <div className={styles.featureInfo}>
                        <Typography
                          sx={{
                            fontFamily: '"Satoshi", sans-serif',
                            fontSize: '14px',
                            fontWeight: 500,
                            color: '#0d1b14',
                          }}
                        >
                          {feature.label}
                        </Typography>
                        <Typography
                          sx={{
                            fontFamily: '"Satoshi", sans-serif',
                            fontSize: '12px',
                            color: '#999',
                          }}
                        >
                          {feature.description}
                        </Typography>
                      </div>
                    </div>
                    <span className={`${styles.statusBadge} ${features.get(feature.key) ? styles.statusEnabled : styles.statusDisabled}`}>
                      {features.get(feature.key) ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyGroup}>
                <Typography
                  sx={{
                    fontFamily: '"Satoshi", sans-serif',
                    fontSize: '13px',
                    color: '#999',
                    fontStyle: 'italic',
                  }}
                >
                  No features available in this tier yet.
                </Typography>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default OrgFeaturesTab;
