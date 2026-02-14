import * as React from 'react';
import { styled } from '@mui/material/styles';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import BusinessIcon from '@mui/icons-material/Business';
import sty from './DisciplineSettings.module.css';
import { InfractionsTab } from './InfractionsTab';
import { DisciplineActionsTab } from './DisciplineActionsTab';
import { DisciplineAccessTab } from './DisciplineAccessTab';
import { ComingSoonPlaceholder } from './ComingSoonPlaceholder';
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
    backgroundColor: '#31664a' /* TODO: Use design token */,
    height: 3,
  },
}));

const StyledTab = styled(Tab)(() => ({
  fontFamily,
  fontSize: 14,
  fontWeight: 500,
  textTransform: 'none',
  color: '#6b7280',
  '&.Mui-selected': {
    color: '#31664a' /* TODO: Use design token */,
    fontWeight: 600,
  },
}));

interface DisciplineSettingsProps {
  orgId: string | null;
  locationId: string | null;
  onNavigate?: (section: string) => void;
  disabled?: boolean;
  activeSubTab?: string;
  onSubTabChange?: (subtab: string | undefined) => void;
}

type TabValue = 'infractions' | 'actions' | 'access' | 'notifications';

const VALID_TABS: TabValue[] = ['infractions', 'actions', 'access', 'notifications'];

export function DisciplineSettings({ orgId, locationId, onNavigate, disabled = false, activeSubTab, onSubTabChange }: DisciplineSettingsProps) {
  const [locationCount, setLocationCount] = React.useState<number>(0);
  
  const supabase = React.useMemo(() => createSupabaseClient(), []);
  const { has } = usePermissions();
  
  // Derive active tab from URL subtab prop, default to 'infractions'
  const activeTab: TabValue = React.useMemo(() => {
    if (activeSubTab && VALID_TABS.includes(activeSubTab as TabValue)) {
      return activeSubTab as TabValue;
    }
    return 'infractions';
  }, [activeSubTab]);

  // Granular permission checks for each tab
  const canManageInfractions = has(P.DISC_MANAGE_INFRACTIONS) && !disabled;
  const canManageActions = has(P.DISC_MANAGE_ACTIONS) && !disabled;
  const canManageAccess = has(P.DISC_MANAGE_ACCESS) && !disabled;
  const canManageNotifications = has(P.DISC_MANAGE_NOTIFICATIONS) && !disabled;

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

  // Org-level tabs: infractions, actions, notifications (access is location-specific)
  // Only show tag if org has more than one location
  const isOrgLevel = (activeTab === 'infractions' || activeTab === 'actions' || activeTab === 'notifications') && locationCount > 1;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'infractions':
        return <InfractionsTab orgId={orgId} disabled={!canManageInfractions} />;
      case 'actions':
        return <DisciplineActionsTab orgId={orgId} disabled={!canManageActions} />;
      case 'access':
        return <DisciplineAccessTab orgId={orgId} locationId={locationId} onNavigate={onNavigate} disabled={!canManageAccess} />;
      case 'notifications':
        return <ComingSoonPlaceholder title="Notifications" description="Configure automated discipline notifications coming soon." />;
      default:
        return null;
    }
  };

  return (
    <div className={sty.container}>
      <div className={sty.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 className={sty.title}>Discipline</h2>
          {isOrgLevel && (
            <OrgLevelTag
              icon={<BusinessIcon />}
              label="Applies to all locations"
              size="small"
            />
          )}
        </div>
        <p className={sty.description}>
          Configure infractions, disciplinary actions, access controls, and notifications for your organization.
        </p>
      </div>

      <Box sx={{ width: '100%' }}>
        <StyledTabs value={activeTab} onChange={handleTabChange}>
          <StyledTab label="Infractions" value="infractions" />
          <StyledTab label="Actions" value="actions" />
          <StyledTab label="Access" value="access" />
          <StyledTab label="Notifications" value="notifications" />
        </StyledTabs>

        <div className={sty.tabContent}>
          {renderTabContent()}
        </div>
      </Box>
    </div>
  );
}

export default DisciplineSettings;
