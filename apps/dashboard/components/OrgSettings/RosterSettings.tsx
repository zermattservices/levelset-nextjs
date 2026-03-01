import * as React from 'react';
import { styled } from '@mui/material/styles';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import BusinessIcon from '@mui/icons-material/Business';
import sty from './RosterSettings.module.css';
import { PaySettingsTab } from './PaySettingsTab';
import { TerminationReasonsTab } from './TerminationReasonsTab';
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

interface RosterSettingsProps {
  orgId: string | null;
  disabled?: boolean;
  activeSubTab?: string;
  onSubTabChange?: (subtab: string | undefined) => void;
}

type TabValue = 'pay' | 'termination-reasons';

const VALID_TABS: TabValue[] = ['pay', 'termination-reasons'];

export function RosterSettings({ orgId, disabled = false, activeSubTab, onSubTabChange }: RosterSettingsProps) {
  const [locationCount, setLocationCount] = React.useState<number>(0);

  const supabase = React.useMemo(() => createSupabaseClient(), []);
  const { has } = usePermissions();

  // Derive active tab from URL subtab prop, default to 'pay'
  const activeTab: TabValue = React.useMemo(() => {
    if (activeSubTab && VALID_TABS.includes(activeSubTab as TabValue)) {
      return activeSubTab as TabValue;
    }
    return 'pay';
  }, [activeSubTab]);

  // Granular permission checks for each tab
  const canManagePay = has(P.ROSTER_MANAGE_PAY) && !disabled;
  const canManageTermination = has(P.ROSTER_MANAGE_TERMINATION) && !disabled;

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

  // Both tabs are org-level settings
  const isOrgLevel = locationCount > 1;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'pay':
        return <PaySettingsTab orgId={orgId} disabled={!canManagePay} />;
      case 'termination-reasons':
        return <TerminationReasonsTab orgId={orgId} disabled={!canManageTermination} />;
      default:
        return null;
    }
  };

  return (
    <div className={sty.container}>
      <div className={sty.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 className={sty.title}>Roster</h2>
          {isOrgLevel && (
            <OrgLevelTag
              icon={<BusinessIcon />}
              label="Applies to all locations"
              size="small"
            />
          )}
        </div>
        <p className={sty.description}>
          Configure pay settings and termination reasons for your organization.
        </p>
      </div>

      <Box sx={{ width: '100%' }}>
        <StyledTabs value={activeTab} onChange={handleTabChange}>
          <StyledTab label="Pay" value="pay" />
          <StyledTab label="Termination Reasons" value="termination-reasons" />
        </StyledTabs>

        <div className={sty.tabContent}>
          {renderTabContent()}
        </div>
      </Box>
    </div>
  );
}

export default RosterSettings;
