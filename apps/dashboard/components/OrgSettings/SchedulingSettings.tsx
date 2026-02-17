import * as React from 'react';
import { styled } from '@mui/material/styles';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import BusinessIcon from '@mui/icons-material/Business';
import sty from './SchedulingSettings.module.css';
import { BreakRulesTab } from './BreakRulesTab';
import { SchedulingPositionsTab } from './SchedulingPositionsTab';
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

interface SchedulingSettingsProps {
  orgId: string | null;
  disabled?: boolean;
  activeSubTab?: string;
  onSubTabChange?: (subtab: string | undefined) => void;
}

type TabValue = 'breaks' | 'position-setup';

const VALID_TABS: TabValue[] = ['breaks', 'position-setup'];

export function SchedulingSettings({ orgId, disabled = false, activeSubTab, onSubTabChange }: SchedulingSettingsProps) {
  const [locationCount, setLocationCount] = React.useState<number>(0);

  const supabase = React.useMemo(() => createSupabaseClient(), []);
  const { has } = usePermissions();

  // Derive active tab from URL subtab prop, default to 'breaks'
  const activeTab: TabValue = React.useMemo(() => {
    if (activeSubTab && VALID_TABS.includes(activeSubTab as TabValue)) {
      return activeSubTab as TabValue;
    }
    return 'breaks';
  }, [activeSubTab]);

  const canManageSettings = has(P.SCHED_MANAGE_SETTINGS) && !disabled;

  // Fetch location count for org-level tag
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

  // Both tabs are org-level (not location-specific)
  const showOrgTag = locationCount > 1;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'breaks':
        return <BreakRulesTab orgId={orgId} disabled={!canManageSettings} />;
      case 'position-setup':
        return <SchedulingPositionsTab orgId={orgId} disabled={!canManageSettings} />;
      default:
        return null;
    }
  };

  return (
    <div className={sty.container}>
      <div className={sty.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 className={sty.title}>Scheduling</h2>
          {showOrgTag && (
            <OrgLevelTag
              icon={<BusinessIcon />}
              label="Applies to all locations"
              size="small"
            />
          )}
        </div>
        <p className={sty.description}>
          Configure break rules and position assignments for scheduling.
        </p>
      </div>

      <Box sx={{ width: '100%' }}>
        <StyledTabs value={activeTab} onChange={handleTabChange}>
          <StyledTab label="Breaks" value="breaks" />
          <StyledTab label="Position Setup" value="position-setup" />
        </StyledTabs>

        <div className={sty.tabContent}>
          {renderTabContent()}
        </div>
      </Box>
    </div>
  );
}

export default SchedulingSettings;
