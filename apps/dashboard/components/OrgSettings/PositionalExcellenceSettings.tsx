import * as React from 'react';
import { styled } from '@mui/material/styles';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import BusinessIcon from '@mui/icons-material/Business';
import sty from './PositionalExcellenceSettings.module.css';
import { PositionsTab } from './PositionsTab';
import { RatingCriteriaTab } from './RatingCriteriaTab';
import { RoleMappingTab } from './RoleMappingTab';
import { RatingScaleTab } from './RatingScaleTab';
import { FormSettingsTab } from './FormSettingsTab';
import { createSupabaseClient } from '@/util/supabase/component';
import { usePermissions, P } from '@/lib/providers/PermissionsProvider';

const fontFamily = '"Satoshi", sans-serif';

const OrgLevelTag = styled(Chip)(() => ({
  fontFamily,
  fontSize: 11,
  fontWeight: 500,
  height: 22,
  backgroundColor: '#f0fdf4',
  color: '#166534',
  border: '1px solid #bbf7d0',
  '& .MuiChip-icon': {
    fontSize: 14,
    color: '#166534',
  },
}));

const StyledTabs = styled(Tabs)(() => ({
  marginBottom: 24,
  '& .MuiTabs-indicator': {
    backgroundColor: 'var(--ls-color-brand)',
    height: 3,
  },
}));

const StyledTab = styled(Tab)(() => ({
  fontFamily,
  fontSize: 14,
  fontWeight: 500,
  textTransform: 'none',
  color: 'var(--ls-color-muted)',
  '&.Mui-selected': {
    color: 'var(--ls-color-brand)',
    fontWeight: 600,
  },
}));

interface PositionalExcellenceSettingsProps {
  orgId: string | null;
  disabled?: boolean;
  activeSubTab?: string;
  onSubTabChange?: (subtab: string | undefined) => void;
}

type TabValue = 'positions' | 'criteria' | 'role-mapping' | 'rating-scale' | 'form-settings';

const VALID_TABS: TabValue[] = ['positions', 'criteria', 'role-mapping', 'rating-scale', 'form-settings'];

export function PositionalExcellenceSettings({ orgId, disabled = false, activeSubTab, onSubTabChange }: PositionalExcellenceSettingsProps) {
  const [locationCount, setLocationCount] = React.useState<number>(0);
  
  const supabase = React.useMemo(() => createSupabaseClient(), []);
  const { has } = usePermissions();
  
  // Derive active tab from URL subtab prop, default to 'positions'
  const activeTab: TabValue = React.useMemo(() => {
    if (activeSubTab && VALID_TABS.includes(activeSubTab as TabValue)) {
      return activeSubTab as TabValue;
    }
    return 'positions';
  }, [activeSubTab]);

  // Granular permission checks for each tab
  const canManagePositions = has(P.PE_MANAGE_POSITIONS) && !disabled;
  const canManageCriteria = has(P.PE_MANAGE_RATING_CRITERIA) && !disabled;
  const canManageRoleMappings = has(P.PE_MANAGE_ROLE_MAPPINGS) && !disabled;
  const canManageRatingScale = has(P.PE_MANAGE_RATING_SCALE) && !disabled;
  // Form settings uses the same permission as rating scale for now
  const canManageFormSettings = has(P.PE_MANAGE_RATING_SCALE) && !disabled;

  // Fetch location count for the organization
  React.useEffect(() => {
    async function fetchLocationCount() {
      if (!orgId) return;
      
      const { count } = await supabase
        .from('locations')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId);
      
      setLocationCount(count || 0);
    }
    
    fetchLocationCount();
  }, [orgId, supabase]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: TabValue) => {
    if (onSubTabChange) {
      onSubTabChange(newValue);
    }
  };

  // Org-level tabs: rating-scale, role-mapping, form-settings
  // Only show tag if org has more than one location
  const isOrgLevel = (activeTab === 'rating-scale' || activeTab === 'role-mapping' || activeTab === 'form-settings') && locationCount > 1;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'positions':
        return <PositionsTab orgId={orgId} disabled={!canManagePositions} />;
      case 'criteria':
        return <RatingCriteriaTab orgId={orgId} disabled={!canManageCriteria} />;
      case 'role-mapping':
        return <RoleMappingTab orgId={orgId} disabled={!canManageRoleMappings} />;
      case 'rating-scale':
        return <RatingScaleTab orgId={orgId} disabled={!canManageRatingScale} />;
      case 'form-settings':
        return <FormSettingsTab orgId={orgId} disabled={!canManageFormSettings} />;
      default:
        return null;
    }
  };

  return (
    <div className={sty.container}>
      <div className={sty.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 className={sty.title}>Positional Excellence</h2>
          {isOrgLevel && (
            <OrgLevelTag
              icon={<BusinessIcon />}
              label="Applies to all locations"
              size="small"
            />
          )}
        </div>
        <p className={sty.description}>
          Configure positions, rating criteria, and role permissions for positional ratings.
        </p>
      </div>

      <Box sx={{ width: '100%' }}>
        <StyledTabs value={activeTab} onChange={handleTabChange}>
          <StyledTab label="Positions" value="positions" />
          <StyledTab label="Rating Criteria" value="criteria" />
          <StyledTab label="Role Mapping" value="role-mapping" />
          <StyledTab label="Rating Scale" value="rating-scale" />
          <StyledTab label="Form Settings" value="form-settings" />
        </StyledTabs>

        <div className={sty.tabContent}>
          {renderTabContent()}
        </div>
      </Box>
    </div>
  );
}

export default PositionalExcellenceSettings;
