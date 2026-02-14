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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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

const fontFamily = '"Satoshi", sans-serif';

export function OrgFeaturesTab({ orgId }: OrgFeaturesTabProps) {
  const [features, setFeatures] = React.useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set());

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
        return { bg: 'var(--ls-color-muted-soft)', text: 'var(--ls-color-neutral)', border: 'var(--ls-color-border)' };
    }
  };

  // Calculate enabled count for a group
  const getGroupEnabledCount = (group: FeatureGroup) => {
    const enabled = group.features.filter(f => features.get(f.key) === true).length;
    return { enabled, total: group.features.length };
  };

  // Get pill color based on count
  const getPillColor = (enabled: number, total: number) => {
    if (enabled === total) return { bg: '#dcfce7', color: '#166534' }; // Green
    if (enabled === 0) return { bg: 'var(--ls-color-muted-soft)', color: 'var(--ls-color-muted)' }; // Grey
    return { bg: '#fef3c7', color: '#92400e' }; // Yellow
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <CircularProgress size={32} sx={{ color: 'var(--ls-color-brand)' }} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Typography
          sx={{
            fontFamily,
            fontSize: '14px',
            color: '#666',
          }}
        >
          Configure which features this organization has access to.
        </Typography>
        {saving && (
          <CircularProgress size={16} sx={{ color: 'var(--ls-color-brand)' }} />
        )}
      </div>

      <div className={styles.modulesContainer}>
        {FEATURE_GROUPS.map(group => {
          const tierColor = getTierColor(group.tier);
          const isFullyEnabled = isGroupFullyEnabled(group);
          const isPartiallyEnabled = isGroupPartiallyEnabled(group);
          const { enabled, total } = getGroupEnabledCount(group);
          const pillColor = getPillColor(enabled, total);
          const isExpanded = expandedGroups.has(group.name);

          return (
            <Accordion
              key={group.name}
              expanded={isExpanded}
              onChange={() => {
                const next = new Set(expandedGroups);
                if (isExpanded) {
                  next.delete(group.name);
                } else {
                  next.add(group.name);
                }
                setExpandedGroups(next);
              }}
              sx={{
                '&:before': { display: 'none' },
                boxShadow: 'none',
                border: '1px solid var(--ls-color-muted-border)',
                borderRadius: '8px !important',
                marginBottom: 1,
                '&.Mui-expanded': {
                  margin: '0 0 8px 0',
                },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  '& .MuiAccordionSummary-content': {
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                  },
                }}
              >
                <Checkbox
                  checked={isFullyEnabled}
                  indeterminate={isPartiallyEnabled}
                  onChange={(e) => toggleGroup(group, e.target.checked)}
                  disabled={group.features.length === 0}
                  onClick={(e) => e.stopPropagation()}
                  sx={{
                    padding: '4px',
                    color: 'var(--ls-color-brand)',
                    '&.Mui-checked': { color: 'var(--ls-color-brand)' },
                    '&.MuiCheckbox-indeterminate': { color: 'var(--ls-color-brand)' },
                  }}
                />
                <Chip
                  label={`${enabled}/${total}`}
                  size="small"
                  sx={{
                    fontFamily,
                    fontSize: 12,
                    fontWeight: 600,
                    backgroundColor: pillColor.bg,
                    color: pillColor.color,
                    height: 24,
                    minWidth: 50,
                  }}
                />
                <div>
                  <div className={styles.moduleName}>{group.name}</div>
                </div>
                <Chip
                  label={group.tier.toUpperCase()}
                  size="small"
                  sx={{
                    fontFamily,
                    fontSize: 11,
                    fontWeight: 500,
                    height: 22,
                    backgroundColor: tierColor.bg,
                    color: tierColor.text,
                    border: `1px solid ${tierColor.border}`,
                    marginLeft: 'auto',
                  }}
                />
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                {group.features.length > 0 ? (
                  <div className={styles.permissionsList}>
                    {group.features.map(feature => (
                      <div key={feature.key} className={styles.permissionItem}>
                        <Checkbox
                          checked={features.get(feature.key) || false}
                          onChange={(e) => toggleFeature(feature.key, e.target.checked)}
                          sx={{
                            padding: '4px',
                            color: 'var(--ls-color-border)',
                            '&.Mui-checked': { color: 'var(--ls-color-brand)' },
                          }}
                        />
                        <div className={styles.permissionContent}>
                          <div className={styles.permissionName}>
                            {feature.label}
                          </div>
                          <div className={styles.permissionDescription}>
                            {feature.description}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyGroup}>
                    <Typography
                      sx={{
                        fontFamily,
                        fontSize: '13px',
                        color: '#999',
                        fontStyle: 'italic',
                      }}
                    >
                      No features available in this tier yet.
                    </Typography>
                  </div>
                )}
              </AccordionDetails>
            </Accordion>
          );
        })}
      </div>
    </div>
  );
}

export default OrgFeaturesTab;
